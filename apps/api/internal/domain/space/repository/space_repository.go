package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/space/model"
)

type SpaceRepository interface {
	Create(ctx context.Context, space *model.Space) error
	GetByID(ctx context.Context, spaceID uuid.UUID) (*model.Space, error)
	ListByUserID(ctx context.Context, userID uuid.UUID) ([]*model.Space, error)
	UpdateStatus(ctx context.Context, spaceID uuid.UUID, status model.SpaceStatus) error

	AddMembership(ctx context.Context, m *model.SpaceMembership) error
	GetMembership(ctx context.Context, spaceID, userID uuid.UUID) (*model.SpaceMembership, error)
	ListMembers(ctx context.Context, spaceID uuid.UUID) ([]model.SpaceMember, error)
	CountActiveMembers(ctx context.Context, spaceID uuid.UUID) (int, error)
	UpdateMembershipStatus(ctx context.Context, spaceID, userID uuid.UUID, status model.MemberStatus) error

	CreateInvite(ctx context.Context, inv *model.SpaceInvite) error
	GetInviteByID(ctx context.Context, inviteID uuid.UUID) (*model.SpaceInvite, error)
	ListPendingInvitesByEmail(ctx context.Context, email string) ([]model.PendingInviteView, error)
	ListPendingInvitesBySpace(ctx context.Context, spaceID uuid.UUID) ([]model.SpaceInvite, error)
	UpdateInviteStatus(ctx context.Context, inviteID uuid.UUID, status model.InviteStatus) error
	HasPendingInvite(ctx context.Context, spaceID uuid.UUID, email string) (bool, error)
	CountOwnedByUserID(ctx context.Context, userID uuid.UUID) (int, error)
}
