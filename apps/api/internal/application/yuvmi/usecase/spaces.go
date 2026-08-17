package usecase

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/application/yuvmi/dto"
	spacemodel "github.com/masterfabric-go/masterfabric/internal/domain/space/model"
)

var spaceFeaturesByType = map[spacemodel.SpaceType][]string{
	spacemodel.SpaceTypeCouple:  {"shared_vision_board", "joint_affirmations", "progress_comparison"},
	spacemodel.SpaceTypeFriends: {"progress_comparison", "joint_affirmations"},
	spacemodel.SpaceTypeFamily:  {"shared_vision_board", "progress_comparison"},
}

func (s *Service) ListSpaces(ctx context.Context, userID uuid.UUID) ([]dto.SpaceResponse, error) {
	spaces, err := s.spaces.ListByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]dto.SpaceResponse, len(spaces))
	for i, sp := range spaces {
		resp, err := s.buildSpaceResponse(ctx, sp, userID)
		if err != nil {
			return nil, err
		}
		out[i] = *resp
	}
	return out, nil
}

func (s *Service) CreateSpace(ctx context.Context, userID uuid.UUID, req dto.CreateSpaceRequest) (*dto.SpaceResponse, error) {
	if err := s.checkSpaceLimit(ctx, userID); err != nil {
		return nil, err
	}
	spaceType := spacemodel.SpaceType(req.Type)
	if spaceType != spacemodel.SpaceTypeCouple && spaceType != spacemodel.SpaceTypeFriends && spaceType != spacemodel.SpaceTypeFamily {
		return nil, domainErr.New(domainErr.ErrValidation, "invalid space type", nil)
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = defaultSpaceName(spaceType)
	}

	features := spaceFeaturesByType[spaceType]
	space := &spacemodel.Space{
		OwnerID: userID, Type: spaceType, Name: name,
		Status: spacemodel.SpaceStatusDraft, Features: features,
	}
	if err := s.spaces.Create(ctx, space); err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	if err := s.spaces.AddMembership(ctx, &spacemodel.SpaceMembership{
		SpaceID: space.ID, UserID: userID, Role: spacemodel.MemberRoleOwner,
		Status: spacemodel.MemberStatusActive, JoinedAt: &now,
	}); err != nil {
		return nil, err
	}

	return s.buildSpaceResponse(ctx, space, userID)
}

func (s *Service) GetSpace(ctx context.Context, userID, spaceID uuid.UUID) (*dto.SpaceResponse, error) {
	if err := s.requireSpaceMember(ctx, spaceID, userID); err != nil {
		return nil, err
	}
	space, err := s.spaces.GetByID(ctx, spaceID)
	if err != nil {
		return nil, err
	}
	return s.buildSpaceResponse(ctx, space, userID)
}

func (s *Service) CreateSpaceInvite(ctx context.Context, userID, spaceID uuid.UUID, req dto.CreateSpaceInviteRequest) (*dto.SpaceInviteResponse, error) {
	space, err := s.spaces.GetByID(ctx, spaceID)
	if err != nil {
		return nil, err
	}
	if space.OwnerID != userID {
		return nil, domainErr.New(domainErr.ErrForbidden, "only owner can invite", nil)
	}

	email := strings.TrimSpace(strings.ToLower(req.InviteeEmail))
	if email == "" {
		return nil, domainErr.New(domainErr.ErrValidation, "invitee email required", nil)
	}

	me, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if strings.EqualFold(me.Email, email) {
		return nil, domainErr.New(domainErr.ErrValidation, "cannot invite yourself", nil)
	}

	if pending, _ := s.spaces.HasPendingInvite(ctx, spaceID, email); pending {
		return nil, domainErr.New(domainErr.ErrAlreadyExists, "invite already pending", nil)
	}

	if invitee, ierr := s.users.GetByEmail(ctx, email); ierr == nil {
		if _, merr := s.spaces.GetMembership(ctx, spaceID, invitee.ID); merr == nil {
			return nil, domainErr.New(domainErr.ErrAlreadyExists, "user is already a member", nil)
		}
	}

	if space.Type == spacemodel.SpaceTypeCouple {
		active, _ := s.spaces.CountActiveMembers(ctx, spaceID)
		pendingInvites, _ := s.spaces.ListPendingInvitesBySpace(ctx, spaceID)
		if active+len(pendingInvites) >= 2 {
			return nil, domainErr.New(domainErr.ErrBadRequest, "couple space allows only one partner", nil)
		}
	}

	role := spacemodel.MemberRoleMember
	if req.Role != nil {
		role = spacemodel.MemberRole(*req.Role)
	}

	token, err := generateInviteToken()
	if err != nil {
		return nil, err
	}

	var inviteeUserID *uuid.UUID
	if invitee, ierr := s.users.GetByEmail(ctx, email); ierr == nil {
		inviteeUserID = &invitee.ID
	}

	inv := &spacemodel.SpaceInvite{
		SpaceID: spaceID, InviterID: userID, InviteeEmail: email,
		InviteeUserID: inviteeUserID, Role: role,
		Status: spacemodel.InviteStatusPending, Token: token,
		ExpiresAt: time.Now().UTC().Add(7 * 24 * time.Hour),
	}
	if err := s.spaces.CreateInvite(ctx, inv); err != nil {
		return nil, err
	}

	if space.Status == spacemodel.SpaceStatusDraft {
		_ = s.spaces.UpdateStatus(ctx, spaceID, spacemodel.SpaceStatusPending)
	}

	if inviteeUserID != nil {
		_ = s.notifyUser(ctx, *inviteeUserID, "Alan daveti",
			fmt.Sprintf("%s seni \"%s\" alanına davet etti.", me.FullName(), space.Name),
			"space_invite", map[string]string{"inviteId": inv.ID.String(), "spaceId": spaceID.String()})
	}

	return toSpaceInviteResponse(inv), nil
}

func (s *Service) ListPendingInvites(ctx context.Context, userID uuid.UUID) ([]dto.PendingSpaceInviteResponse, error) {
	user, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	views, err := s.spaces.ListPendingInvitesByEmail(ctx, user.Email)
	if err != nil {
		return nil, err
	}
	out := make([]dto.PendingSpaceInviteResponse, len(views))
	for i, v := range views {
		out[i] = dto.PendingSpaceInviteResponse{
			ID: v.Invite.ID, SpaceID: v.Invite.SpaceID, SpaceName: v.SpaceName,
			SpaceType: string(v.SpaceType), InviterName: v.InviterName,
			Role: string(v.Invite.Role), ExpiresAt: v.Invite.ExpiresAt,
			CreatedAt: v.Invite.CreatedAt,
		}
	}
	return out, nil
}

func (s *Service) AcceptSpaceInvite(ctx context.Context, userID, inviteID uuid.UUID) (*dto.SpaceResponse, error) {
	inv, err := s.spaces.GetInviteByID(ctx, inviteID)
	if err != nil {
		return nil, err
	}
	if inv.Status != spacemodel.InviteStatusPending {
		return nil, domainErr.New(domainErr.ErrBadRequest, "invite is not pending", nil)
	}
	if time.Now().UTC().After(inv.ExpiresAt) {
		_ = s.spaces.UpdateInviteStatus(ctx, inviteID, spacemodel.InviteStatusExpired)
		return nil, domainErr.New(domainErr.ErrBadRequest, "invite expired", nil)
	}

	user, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if !strings.EqualFold(user.Email, inv.InviteeEmail) {
		return nil, domainErr.New(domainErr.ErrForbidden, "invite is for another user", nil)
	}

	space, err := s.spaces.GetByID(ctx, inv.SpaceID)
	if err != nil {
		return nil, err
	}

	if _, merr := s.spaces.GetMembership(ctx, inv.SpaceID, userID); merr != nil {
		now := time.Now().UTC()
		if err := s.spaces.AddMembership(ctx, &spacemodel.SpaceMembership{
			SpaceID: inv.SpaceID, UserID: userID, Role: inv.Role,
			Status: spacemodel.MemberStatusActive, JoinedAt: &now,
		}); err != nil {
			return nil, err
		}
	} else {
		if err := s.spaces.UpdateMembershipStatus(ctx, inv.SpaceID, userID, spacemodel.MemberStatusActive); err != nil {
			return nil, err
		}
	}

	_ = s.spaces.UpdateInviteStatus(ctx, inviteID, spacemodel.InviteStatusAccepted)

	if space.Type == spacemodel.SpaceTypeCouple {
		active, _ := s.spaces.CountActiveMembers(ctx, inv.SpaceID)
		if active >= 2 {
			_ = s.spaces.UpdateStatus(ctx, inv.SpaceID, spacemodel.SpaceStatusActive)
		}
	} else {
		_ = s.spaces.UpdateStatus(ctx, inv.SpaceID, spacemodel.SpaceStatusActive)
	}

	_ = s.notifyUser(ctx, inv.InviterID, "Davet kabul edildi",
		fmt.Sprintf("%s \"%s\" alanına katıldı.", user.FullName(), space.Name),
		"space_invite_accepted", map[string]string{"spaceId": inv.SpaceID.String()})

	space, err = s.spaces.GetByID(ctx, inv.SpaceID)
	if err != nil {
		return nil, fmt.Errorf("reload space: %w", err)
	}
	return s.buildSpaceResponse(ctx, space, userID)
}

func (s *Service) DeclineSpaceInvite(ctx context.Context, userID, inviteID uuid.UUID) error {
	inv, err := s.spaces.GetInviteByID(ctx, inviteID)
	if err != nil {
		return err
	}
	if inv.Status != spacemodel.InviteStatusPending {
		return domainErr.New(domainErr.ErrBadRequest, "invite is not pending", nil)
	}

	user, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return err
	}
	if !strings.EqualFold(user.Email, inv.InviteeEmail) {
		return domainErr.New(domainErr.ErrForbidden, "invite is for another user", nil)
	}

	return s.spaces.UpdateInviteStatus(ctx, inviteID, spacemodel.InviteStatusDeclined)
}

func (s *Service) LeaveSpace(ctx context.Context, userID, spaceID uuid.UUID) error {
	space, err := s.spaces.GetByID(ctx, spaceID)
	if err != nil {
		return err
	}
	if space.OwnerID == userID {
		return domainErr.New(domainErr.ErrBadRequest, "owner cannot leave; archive or transfer ownership first", nil)
	}
	if err := s.spaces.UpdateMembershipStatus(ctx, spaceID, userID, spacemodel.MemberStatusLeft); err != nil {
		return err
	}
	return nil
}

func (s *Service) requireSpaceMember(ctx context.Context, spaceID, userID uuid.UUID) error {
	m, err := s.spaces.GetMembership(ctx, spaceID, userID)
	if err != nil {
		return domainErr.New(domainErr.ErrForbidden, "not a space member", nil)
	}
	if m.Status != spacemodel.MemberStatusActive && m.Status != spacemodel.MemberStatusPending {
		return domainErr.New(domainErr.ErrForbidden, "not an active member", nil)
	}
	return nil
}

func (s *Service) buildSpaceResponse(ctx context.Context, space *spacemodel.Space, viewerID uuid.UUID) (*dto.SpaceResponse, error) {
	members, err := s.spaces.ListMembers(ctx, space.ID)
	if err != nil {
		return nil, err
	}
	pendingInvites, _ := s.spaces.ListPendingInvitesBySpace(ctx, space.ID)

	resp := &dto.SpaceResponse{
		ID: space.ID, Type: string(space.Type), Name: space.Name,
		OwnerID: space.OwnerID, Status: string(space.Status),
		Features: space.Features, CreatedAt: space.CreatedAt, UpdatedAt: space.UpdatedAt,
	}
	for _, m := range members {
		resp.Members = append(resp.Members, dto.SpaceMemberResponse{
			UserID: m.Membership.UserID, DisplayName: m.DisplayName, Email: m.Email,
			Role: string(m.Membership.Role), Status: string(m.Membership.Status),
			JoinedAt: m.Membership.JoinedAt,
		})
	}
	for _, inv := range pendingInvites {
		resp.PendingInvites = append(resp.PendingInvites, *toSpaceInviteResponse(&inv))
	}

	if space.OwnerID == viewerID {
		resp.MyRole = string(spacemodel.MemberRoleOwner)
	} else {
		for _, m := range members {
			if m.Membership.UserID == viewerID {
				resp.MyRole = string(m.Membership.Role)
				break
			}
		}
	}
	return resp, nil
}

func defaultSpaceName(t spacemodel.SpaceType) string {
	switch t {
	case spacemodel.SpaceTypeCouple:
		return "Çift Alanım"
	case spacemodel.SpaceTypeFriends:
		return "Arkadaş Alanım"
	case spacemodel.SpaceTypeFamily:
		return "Aile Alanım"
	default:
		return "Ortak Alan"
	}
}

func generateInviteToken() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", domainErr.New(domainErr.ErrInternal, "failed to generate token", err)
	}
	return hex.EncodeToString(b), nil
}

func toSpaceInviteResponse(inv *spacemodel.SpaceInvite) *dto.SpaceInviteResponse {
	return &dto.SpaceInviteResponse{
		ID: inv.ID, SpaceID: inv.SpaceID, InviteeEmail: inv.InviteeEmail,
		Role: string(inv.Role), Status: string(inv.Status),
		ExpiresAt: inv.ExpiresAt, CreatedAt: inv.CreatedAt,
	}
}
