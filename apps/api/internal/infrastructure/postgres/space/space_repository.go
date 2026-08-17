package space

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/domain/space/model"
)

type SpaceRepo struct{ db *pgxpool.Pool }

func NewSpaceRepo(db *pgxpool.Pool) *SpaceRepo { return &SpaceRepo{db: db} }

func (r *SpaceRepo) Create(ctx context.Context, space *model.Space) error {
	if space.ID == uuid.Nil {
		space.ID = uuid.New()
	}
	now := time.Now().UTC()
	space.CreatedAt = now
	space.UpdatedAt = now
	features, _ := json.Marshal(space.Features)
	_, err := r.db.Exec(ctx, `
		INSERT INTO spaces (id, owner_id, type, name, status, features, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		space.ID, space.OwnerID, space.Type, space.Name, space.Status, features, space.CreatedAt, space.UpdatedAt)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to create space", err)
	}
	return nil
}

func (r *SpaceRepo) GetByID(ctx context.Context, spaceID uuid.UUID) (*model.Space, error) {
	return r.scanSpace(r.db.QueryRow(ctx, `
		SELECT id, owner_id, type, name, status, features, created_at, updated_at
		FROM spaces WHERE id=$1`, spaceID))
}

func (r *SpaceRepo) ListByUserID(ctx context.Context, userID uuid.UUID) ([]*model.Space, error) {
	rows, err := r.db.Query(ctx, `
		SELECT s.id, s.owner_id, s.type, s.name, s.status, s.features, s.created_at, s.updated_at
		FROM spaces s
		INNER JOIN space_memberships m ON m.space_id = s.id
		WHERE m.user_id = $1 AND m.status IN ('active','pending') AND s.status != 'archived'
		ORDER BY s.created_at DESC`, userID)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to list spaces", err)
	}
	defer rows.Close()
	var out []*model.Space
	for rows.Next() {
		s, err := r.scanSpaceRow(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	if err := rows.Err(); err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to iterate spaces", err)
	}
	return out, nil
}

func (r *SpaceRepo) UpdateStatus(ctx context.Context, spaceID uuid.UUID, status model.SpaceStatus) error {
	tag, err := r.db.Exec(ctx, `UPDATE spaces SET status=$2, updated_at=NOW() WHERE id=$1`, spaceID, status)
	if err != nil || tag.RowsAffected() == 0 {
		return domainErr.New(domainErr.ErrNotFound, "space not found", err)
	}
	return nil
}

func (r *SpaceRepo) AddMembership(ctx context.Context, m *model.SpaceMembership) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	now := time.Now().UTC()
	m.CreatedAt = now
	m.UpdatedAt = now
	_, err := r.db.Exec(ctx, `
		INSERT INTO space_memberships (id, space_id, user_id, role, status, joined_at, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		m.ID, m.SpaceID, m.UserID, m.Role, m.Status, m.JoinedAt, m.CreatedAt, m.UpdatedAt)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to add membership", err)
	}
	return nil
}

func (r *SpaceRepo) GetMembership(ctx context.Context, spaceID, userID uuid.UUID) (*model.SpaceMembership, error) {
	return r.scanMembership(r.db.QueryRow(ctx, `
		SELECT id, space_id, user_id, role, status, joined_at, created_at, updated_at
		FROM space_memberships WHERE space_id=$1 AND user_id=$2`, spaceID, userID))
}

func (r *SpaceRepo) ListMembers(ctx context.Context, spaceID uuid.UUID) ([]model.SpaceMember, error) {
	rows, err := r.db.Query(ctx, `
		SELECT m.id, m.space_id, m.user_id, m.role, m.status, m.joined_at, m.created_at, m.updated_at,
		       COALESCE(p.display_name, u.email), u.email
		FROM space_memberships m
		INNER JOIN users u ON u.id = m.user_id
		LEFT JOIN user_profiles p ON p.user_id = m.user_id
		WHERE m.space_id = $1 AND m.status IN ('active','pending')
		ORDER BY m.created_at ASC`, spaceID)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to list members", err)
	}
	defer rows.Close()
	var out []model.SpaceMember
	for rows.Next() {
		var sm model.SpaceMember
		err := rows.Scan(
			&sm.Membership.ID, &sm.Membership.SpaceID, &sm.Membership.UserID,
			&sm.Membership.Role, &sm.Membership.Status, &sm.Membership.JoinedAt,
			&sm.Membership.CreatedAt, &sm.Membership.UpdatedAt,
			&sm.DisplayName, &sm.Email,
		)
		if err != nil {
			return nil, domainErr.New(domainErr.ErrInternal, "failed to scan member", err)
		}
		out = append(out, sm)
	}
	if err := rows.Err(); err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to iterate members", err)
	}
	return out, nil
}

func (r *SpaceRepo) CountActiveMembers(ctx context.Context, spaceID uuid.UUID) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM space_memberships WHERE space_id=$1 AND status='active'`, spaceID).Scan(&count)
	if err != nil {
		return 0, domainErr.New(domainErr.ErrInternal, "failed to count members", err)
	}
	return count, nil
}

func (r *SpaceRepo) UpdateMembershipStatus(ctx context.Context, spaceID, userID uuid.UUID, status model.MemberStatus) error {
	var joinedAt *time.Time
	if status == model.MemberStatusActive {
		now := time.Now().UTC()
		joinedAt = &now
	}
	tag, err := r.db.Exec(ctx, `
		UPDATE space_memberships SET status=$3, joined_at=COALESCE($4, joined_at), updated_at=NOW()
		WHERE space_id=$1 AND user_id=$2`, spaceID, userID, status, joinedAt)
	if err != nil || tag.RowsAffected() == 0 {
		return domainErr.New(domainErr.ErrNotFound, "membership not found", err)
	}
	return nil
}

func (r *SpaceRepo) CreateInvite(ctx context.Context, inv *model.SpaceInvite) error {
	if inv.ID == uuid.Nil {
		inv.ID = uuid.New()
	}
	now := time.Now().UTC()
	inv.CreatedAt = now
	inv.UpdatedAt = now
	_, err := r.db.Exec(ctx, `
		INSERT INTO space_invites (id, space_id, inviter_id, invitee_email, invitee_user_id, role, status, token, expires_at, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		inv.ID, inv.SpaceID, inv.InviterID, inv.InviteeEmail, inv.InviteeUserID,
		inv.Role, inv.Status, inv.Token, inv.ExpiresAt, inv.CreatedAt, inv.UpdatedAt)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to create invite", err)
	}
	return nil
}

func (r *SpaceRepo) GetInviteByID(ctx context.Context, inviteID uuid.UUID) (*model.SpaceInvite, error) {
	return r.scanInvite(r.db.QueryRow(ctx, `
		SELECT id, space_id, inviter_id, invitee_email, invitee_user_id, role, status, token, expires_at, created_at, updated_at
		FROM space_invites WHERE id=$1`, inviteID))
}

func (r *SpaceRepo) ListPendingInvitesByEmail(ctx context.Context, email string) ([]model.PendingInviteView, error) {
	rows, err := r.db.Query(ctx, `
		SELECT i.id, i.space_id, i.inviter_id, i.invitee_email, i.invitee_user_id, i.role, i.status, i.token, i.expires_at, i.created_at, i.updated_at,
		       s.name, s.type, COALESCE(p.display_name, u.email)
		FROM space_invites i
		INNER JOIN spaces s ON s.id = i.space_id
		INNER JOIN users u ON u.id = i.inviter_id
		LEFT JOIN user_profiles p ON p.user_id = i.inviter_id
		WHERE LOWER(i.invitee_email) = LOWER($1) AND i.status = 'pending' AND i.expires_at > NOW()
		ORDER BY i.created_at DESC`, email)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to list invites", err)
	}
	defer rows.Close()
	var out []model.PendingInviteView
	for rows.Next() {
		var v model.PendingInviteView
		err := rows.Scan(
			&v.Invite.ID, &v.Invite.SpaceID, &v.Invite.InviterID, &v.Invite.InviteeEmail,
			&v.Invite.InviteeUserID, &v.Invite.Role, &v.Invite.Status, &v.Invite.Token,
			&v.Invite.ExpiresAt, &v.Invite.CreatedAt, &v.Invite.UpdatedAt,
			&v.SpaceName, &v.SpaceType, &v.InviterName,
		)
		if err != nil {
			return nil, domainErr.New(domainErr.ErrInternal, "failed to scan invite", err)
		}
		out = append(out, v)
	}
	if err := rows.Err(); err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to iterate invites", err)
	}
	return out, nil
}

func (r *SpaceRepo) ListPendingInvitesBySpace(ctx context.Context, spaceID uuid.UUID) ([]model.SpaceInvite, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, space_id, inviter_id, invitee_email, invitee_user_id, role, status, token, expires_at, created_at, updated_at
		FROM space_invites WHERE space_id=$1 AND status='pending' AND expires_at > NOW()
		ORDER BY created_at DESC`, spaceID)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to list space invites", err)
	}
	defer rows.Close()
	var out []model.SpaceInvite
	for rows.Next() {
		inv, err := r.scanInviteRow(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *inv)
	}
	if err := rows.Err(); err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to iterate space invites", err)
	}
	return out, nil
}

func (r *SpaceRepo) UpdateInviteStatus(ctx context.Context, inviteID uuid.UUID, status model.InviteStatus) error {
	tag, err := r.db.Exec(ctx, `UPDATE space_invites SET status=$2, updated_at=NOW() WHERE id=$1`, inviteID, status)
	if err != nil || tag.RowsAffected() == 0 {
		return domainErr.New(domainErr.ErrNotFound, "invite not found", err)
	}
	return nil
}

func (r *SpaceRepo) HasPendingInvite(ctx context.Context, spaceID uuid.UUID, email string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM space_invites
			WHERE space_id=$1 AND LOWER(invitee_email)=LOWER($2) AND status='pending' AND expires_at > NOW()
		)`, spaceID, email).Scan(&exists)
	if err != nil {
		return false, domainErr.New(domainErr.ErrInternal, "failed to check invite", err)
	}
	return exists, nil
}

func (r *SpaceRepo) scanSpace(row pgx.Row) (*model.Space, error) {
	var s model.Space
	var featuresJSON []byte
	err := row.Scan(&s.ID, &s.OwnerID, &s.Type, &s.Name, &s.Status, &featuresJSON, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainErr.New(domainErr.ErrNotFound, "space not found", nil)
		}
		return nil, domainErr.New(domainErr.ErrInternal, "failed to scan space", err)
	}
	_ = json.Unmarshal(featuresJSON, &s.Features)
	return &s, nil
}

func (r *SpaceRepo) scanSpaceRow(rows pgx.Rows) (*model.Space, error) {
	var s model.Space
	var featuresJSON []byte
	err := rows.Scan(&s.ID, &s.OwnerID, &s.Type, &s.Name, &s.Status, &featuresJSON, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to scan space row", err)
	}
	_ = json.Unmarshal(featuresJSON, &s.Features)
	return &s, nil
}

func (r *SpaceRepo) scanMembership(row pgx.Row) (*model.SpaceMembership, error) {
	var m model.SpaceMembership
	err := row.Scan(&m.ID, &m.SpaceID, &m.UserID, &m.Role, &m.Status, &m.JoinedAt, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainErr.New(domainErr.ErrNotFound, "membership not found", nil)
		}
		return nil, domainErr.New(domainErr.ErrInternal, "failed to scan membership", err)
	}
	return &m, nil
}

func (r *SpaceRepo) scanInvite(row pgx.Row) (*model.SpaceInvite, error) {
	var inv model.SpaceInvite
	err := row.Scan(
		&inv.ID, &inv.SpaceID, &inv.InviterID, &inv.InviteeEmail, &inv.InviteeUserID,
		&inv.Role, &inv.Status, &inv.Token, &inv.ExpiresAt, &inv.CreatedAt, &inv.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainErr.New(domainErr.ErrNotFound, "invite not found", nil)
		}
		return nil, domainErr.New(domainErr.ErrInternal, "failed to scan invite", err)
	}
	return &inv, nil
}

func (r *SpaceRepo) scanInviteRow(rows pgx.Rows) (*model.SpaceInvite, error) {
	var inv model.SpaceInvite
	err := rows.Scan(
		&inv.ID, &inv.SpaceID, &inv.InviterID, &inv.InviteeEmail, &inv.InviteeUserID,
		&inv.Role, &inv.Status, &inv.Token, &inv.ExpiresAt, &inv.CreatedAt, &inv.UpdatedAt,
	)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to scan invite row", err)
	}
	return &inv, nil
}

func (r *SpaceRepo) CountOwnedByUserID(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM spaces WHERE owner_id=$1 AND status != 'archived'`, userID).Scan(&count)
	if err != nil {
		return 0, domainErr.New(domainErr.ErrInternal, "failed to count owned spaces", err)
	}
	return count, nil
}
