package asset

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/domain/asset/model"
)

type AssetRepo struct{ db *pgxpool.Pool }

func NewAssetRepo(db *pgxpool.Pool) *AssetRepo { return &AssetRepo{db: db} }

func (r *AssetRepo) Create(ctx context.Context, asset *model.Asset) error {
	if asset.ID == uuid.Nil {
		asset.ID = uuid.New()
	}
	now := time.Now().UTC()
	asset.CreatedAt = now
	asset.UpdatedAt = now
	_, err := r.db.Exec(ctx, `
		INSERT INTO assets (id, owner_id, space_id, type, title, storage_key, mime_type, file_size,
			visibility, revoked_from_space_at, ai_processing_allowed, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
		asset.ID, asset.OwnerID, asset.SpaceID, asset.Type, asset.Title, asset.StorageKey,
		asset.MimeType, asset.FileSize, asset.Visibility, asset.RevokedFromSpaceAt,
		asset.AIProcessingAllowed, asset.CreatedAt, asset.UpdatedAt)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to create asset", err)
	}
	return nil
}

func (r *AssetRepo) GetByID(ctx context.Context, assetID uuid.UUID) (*model.Asset, error) {
	return r.scanAsset(r.db.QueryRow(ctx, `
		SELECT id, owner_id, space_id, type, title, storage_key, mime_type, file_size,
			visibility, revoked_from_space_at, ai_processing_allowed, created_at, updated_at
		FROM assets WHERE id=$1`, assetID))
}

func (r *AssetRepo) ListByOwner(ctx context.Context, ownerID uuid.UUID, limit int) ([]*model.Asset, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := r.db.Query(ctx, `
		SELECT id, owner_id, space_id, type, title, storage_key, mime_type, file_size,
			visibility, revoked_from_space_at, ai_processing_allowed, created_at, updated_at
		FROM assets WHERE owner_id=$1 ORDER BY created_at DESC LIMIT $2`, ownerID, limit)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to list assets", err)
	}
	defer rows.Close()
	return r.scanAssetRows(rows)
}

func (r *AssetRepo) ListVisibleInSpace(ctx context.Context, spaceID, viewerID uuid.UUID) ([]*model.Asset, error) {
	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT a.id, a.owner_id, a.space_id, a.type, a.title, a.storage_key, a.mime_type, a.file_size,
			a.visibility, a.revoked_from_space_at, a.ai_processing_allowed, a.created_at, a.updated_at
		FROM assets a
		LEFT JOIN space_permissions sp ON sp.asset_id = a.id AND sp.revoked_at IS NULL
		WHERE a.space_id = $1
		  AND a.revoked_from_space_at IS NULL
		  AND (
		    a.visibility = 'space_members'
		    OR (a.visibility = 'specific_members' AND sp.grantee_id = $2)
		    OR a.owner_id = $2
		  )
		ORDER BY a.created_at DESC`, spaceID, viewerID)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to list space assets", err)
	}
	defer rows.Close()
	return r.scanAssetRows(rows)
}

func (r *AssetRepo) UpdateShare(ctx context.Context, asset *model.Asset) error {
	asset.UpdatedAt = time.Now().UTC()
	tag, err := r.db.Exec(ctx, `
		UPDATE assets SET space_id=$2, visibility=$3, revoked_from_space_at=NULL, updated_at=$4
		WHERE id=$1 AND owner_id=$5`,
		asset.ID, asset.SpaceID, asset.Visibility, asset.UpdatedAt, asset.OwnerID)
	if err != nil || tag.RowsAffected() == 0 {
		return domainErr.New(domainErr.ErrNotFound, "asset not found", err)
	}
	return nil
}

func (r *AssetRepo) RevokeFromSpace(ctx context.Context, assetID uuid.UUID) error {
	now := time.Now().UTC()
	tag, err := r.db.Exec(ctx, `
		UPDATE assets SET visibility='private', revoked_from_space_at=$2, updated_at=$2
		WHERE id=$1`, assetID, now)
	if err != nil || tag.RowsAffected() == 0 {
		return domainErr.New(domainErr.ErrNotFound, "asset not found", err)
	}
	return r.RevokePermissionsForAsset(ctx, assetID)
}

func (r *AssetRepo) UpsertPermission(ctx context.Context, p *model.SpacePermission) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	now := time.Now().UTC()
	p.CreatedAt = now
	p.UpdatedAt = now
	_, err := r.db.Exec(ctx, `
		INSERT INTO space_permissions (id, space_id, asset_id, grantee_id, action, visibility, granted_by_id, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		ON CONFLICT (space_id, asset_id, grantee_id) DO UPDATE SET
			action=EXCLUDED.action, visibility=EXCLUDED.visibility, granted_by_id=EXCLUDED.granted_by_id,
			revoked_at=NULL, updated_at=EXCLUDED.updated_at`,
		p.ID, p.SpaceID, p.AssetID, p.GranteeID, p.Action, p.Visibility, p.GrantedByID, p.CreatedAt, p.UpdatedAt)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to upsert permission", err)
	}
	return nil
}

func (r *AssetRepo) RevokePermissionsForAsset(ctx context.Context, assetID uuid.UUID) error {
	_, err := r.db.Exec(ctx, `UPDATE space_permissions SET revoked_at=NOW(), updated_at=NOW() WHERE asset_id=$1 AND revoked_at IS NULL`, assetID)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to revoke permissions", err)
	}
	return nil
}

func (r *AssetRepo) ListPermissions(ctx context.Context, assetID uuid.UUID) ([]model.SpacePermission, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, space_id, asset_id, grantee_id, action, visibility, granted_by_id, revoked_at, created_at, updated_at
		FROM space_permissions WHERE asset_id=$1 AND revoked_at IS NULL`, assetID)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to list permissions", err)
	}
	defer rows.Close()
	var out []model.SpacePermission
	for rows.Next() {
		var p model.SpacePermission
		if err := rows.Scan(&p.ID, &p.SpaceID, &p.AssetID, &p.GranteeID, &p.Action, &p.Visibility,
			&p.GrantedByID, &p.RevokedAt, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, domainErr.New(domainErr.ErrInternal, "failed to scan permission", err)
		}
		out = append(out, p)
	}
	if err := rows.Err(); err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to iterate permissions", err)
	}
	return out, nil
}

func (r *AssetRepo) HasViewPermission(ctx context.Context, assetID, viewerID uuid.UUID) (bool, error) {
	var ok bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM space_permissions
			WHERE asset_id=$1 AND grantee_id=$2 AND revoked_at IS NULL AND action='view'
		)`, assetID, viewerID).Scan(&ok)
	if err != nil {
		return false, domainErr.New(domainErr.ErrInternal, "failed to check permission", err)
	}
	return ok, nil
}

func (r *AssetRepo) scanAsset(row pgx.Row) (*model.Asset, error) {
	var a model.Asset
	err := row.Scan(
		&a.ID, &a.OwnerID, &a.SpaceID, &a.Type, &a.Title, &a.StorageKey, &a.MimeType, &a.FileSize,
		&a.Visibility, &a.RevokedFromSpaceAt, &a.AIProcessingAllowed, &a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainErr.New(domainErr.ErrNotFound, "asset not found", nil)
		}
		return nil, domainErr.New(domainErr.ErrInternal, "failed to scan asset", err)
	}
	return &a, nil
}

func (r *AssetRepo) scanAssetRows(rows pgx.Rows) ([]*model.Asset, error) {
	var out []*model.Asset
	for rows.Next() {
		var a model.Asset
		if err := rows.Scan(
			&a.ID, &a.OwnerID, &a.SpaceID, &a.Type, &a.Title, &a.StorageKey, &a.MimeType, &a.FileSize,
			&a.Visibility, &a.RevokedFromSpaceAt, &a.AIProcessingAllowed, &a.CreatedAt, &a.UpdatedAt,
		); err != nil {
			return nil, domainErr.New(domainErr.ErrInternal, "failed to scan asset row", err)
		}
		out = append(out, &a)
	}
	if err := rows.Err(); err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to iterate asset rows", err)
	}
	return out, nil
}
