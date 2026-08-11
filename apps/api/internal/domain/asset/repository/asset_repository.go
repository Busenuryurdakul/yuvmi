package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/asset/model"
)

type AssetRepository interface {
	Create(ctx context.Context, asset *model.Asset) error
	GetByID(ctx context.Context, assetID uuid.UUID) (*model.Asset, error)
	ListByOwner(ctx context.Context, ownerID uuid.UUID, limit int) ([]*model.Asset, error)
	ListVisibleInSpace(ctx context.Context, spaceID, viewerID uuid.UUID) ([]*model.Asset, error)
	UpdateShare(ctx context.Context, asset *model.Asset) error
	RevokeFromSpace(ctx context.Context, assetID uuid.UUID) error

	UpsertPermission(ctx context.Context, p *model.SpacePermission) error
	RevokePermissionsForAsset(ctx context.Context, assetID uuid.UUID) error
	ListPermissions(ctx context.Context, assetID uuid.UUID) ([]model.SpacePermission, error)
	HasViewPermission(ctx context.Context, assetID, viewerID uuid.UUID) (bool, error)
}
