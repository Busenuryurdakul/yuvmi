package model

import (
	"time"

	"github.com/google/uuid"
)

type SpaceType string

const (
	SpaceTypeCouple  SpaceType = "couple"
	SpaceTypeFriends SpaceType = "friends"
	SpaceTypeFamily  SpaceType = "family"
)

type SpaceStatus string

const (
	SpaceStatusDraft   SpaceStatus = "draft"
	SpaceStatusPending SpaceStatus = "pending"
	SpaceStatusActive  SpaceStatus = "active"
	SpaceStatusArchived SpaceStatus = "archived"
)

type MemberRole string

const (
	MemberRoleOwner  MemberRole = "owner"
	MemberRoleMember MemberRole = "member"
	MemberRoleViewer MemberRole = "viewer"
)

type MemberStatus string

const (
	MemberStatusPending MemberStatus = "pending"
	MemberStatusActive  MemberStatus = "active"
	MemberStatusLeft    MemberStatus = "left"
)

type InviteStatus string

const (
	InviteStatusPending  InviteStatus = "pending"
	InviteStatusAccepted InviteStatus = "accepted"
	InviteStatusDeclined InviteStatus = "declined"
	InviteStatusExpired  InviteStatus = "expired"
)

type Space struct {
	ID        uuid.UUID
	OwnerID   uuid.UUID
	Type      SpaceType
	Name      string
	Status    SpaceStatus
	Features  []string
	CreatedAt time.Time
	UpdatedAt time.Time
}

type SpaceMembership struct {
	ID        uuid.UUID
	SpaceID   uuid.UUID
	UserID    uuid.UUID
	Role      MemberRole
	Status    MemberStatus
	JoinedAt  *time.Time
	CreatedAt time.Time
	UpdatedAt time.Time
}

type SpaceMember struct {
	Membership SpaceMembership
	DisplayName string
	Email       string
}

type SpaceInvite struct {
	ID            uuid.UUID
	SpaceID       uuid.UUID
	InviterID     uuid.UUID
	InviteeEmail  string
	InviteeUserID *uuid.UUID
	Role          MemberRole
	Status        InviteStatus
	Token         string
	ExpiresAt     time.Time
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type PendingInviteView struct {
	Invite    SpaceInvite
	SpaceName string
	SpaceType SpaceType
	InviterName string
}
