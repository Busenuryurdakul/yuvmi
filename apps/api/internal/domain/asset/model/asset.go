package model

import (
	"time"

	"github.com/google/uuid"
)

type AssetType string

const (
	AssetTypeImage    AssetType = "image"
	AssetTypeDocument AssetType = "document"
)

type VisibilityLevel string

const (
	VisibilityPrivate          VisibilityLevel = "private"
	VisibilitySpaceMembers     VisibilityLevel = "space_members"
	VisibilitySpecificMembers  VisibilityLevel = "specific_members"
)

type Asset struct {
	ID                   uuid.UUID
	OwnerID              uuid.UUID
	SpaceID              *uuid.UUID
	Type                 AssetType
	Title                string
	StorageKey           string
	MimeType             string
	FileSize             int64
	Visibility           VisibilityLevel
	RevokedFromSpaceAt   *time.Time
	AIProcessingAllowed  bool
	CreatedAt            time.Time
	UpdatedAt            time.Time
}

type SpacePermission struct {
	ID          uuid.UUID
	SpaceID     uuid.UUID
	AssetID     uuid.UUID
	GranteeID   uuid.UUID
	Action      string
	Visibility  VisibilityLevel
	GrantedByID uuid.UUID
	RevokedAt   *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
}
