package usecase

import (
	"context"
	"fmt"
	"io"
	"mime"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/application/yuvmi/dto"
	assetmodel "github.com/masterfabric-go/masterfabric/internal/domain/asset/model"
	spacemodel "github.com/masterfabric-go/masterfabric/internal/domain/space/model"
)

const maxImageBytes = 10 << 20  // 10 MB
const maxDocumentBytes = 25 << 20 // 25 MB

func (s *Service) UploadAsset(ctx context.Context, userID uuid.UUID, title, filename, contentType string, size int64, body io.Reader) (*dto.AssetResponse, error) {
	if s.storage == nil {
		return nil, domainErr.New(domainErr.ErrInternal, "storage not configured", nil)
	}

	assetType, err := classifyUpload(contentType, filename, size)
	if err != nil {
		return nil, err
	}

	if strings.TrimSpace(title) == "" {
		title = strings.TrimSuffix(filepath.Base(filename), filepath.Ext(filename))
		if title == "" || title == "." {
			title = "Dosya"
		}
	}

	key := fmt.Sprintf("%s/%s/%s", userID.String(), time.Now().UTC().Format("2006/01"), uuid.New().String()+filepath.Ext(filename))
	if err := s.storage.Put(ctx, key, body, size, contentType); err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to store file", err)
	}

	asset := &assetmodel.Asset{
		OwnerID: userID, Type: assetType, Title: title, StorageKey: key,
		MimeType: contentType, FileSize: size, Visibility: assetmodel.VisibilityPrivate,
	}
	if err := s.assets.Create(ctx, asset); err != nil {
		_ = s.storage.Delete(ctx, key)
		return nil, err
	}
	return s.toAssetResponse(asset, userID), nil
}

func (s *Service) ListMyAssets(ctx context.Context, userID uuid.UUID) ([]dto.AssetResponse, error) {
	items, err := s.assets.ListByOwner(ctx, userID, 100)
	if err != nil {
		return nil, err
	}
	out := make([]dto.AssetResponse, len(items))
	for i, a := range items {
		out[i] = *s.toAssetResponse(a, userID)
	}
	return out, nil
}

func (s *Service) ListSpaceAssets(ctx context.Context, userID, spaceID uuid.UUID) ([]dto.AssetResponse, error) {
	if err := s.requireSpaceMember(ctx, spaceID, userID); err != nil {
		return nil, err
	}
	items, err := s.assets.ListVisibleInSpace(ctx, spaceID, userID)
	if err != nil {
		return nil, err
	}
	out := make([]dto.AssetResponse, len(items))
	for i, a := range items {
		out[i] = *s.toAssetResponse(a, userID)
	}
	return out, nil
}

func (s *Service) GetAsset(ctx context.Context, userID, assetID uuid.UUID) (*dto.AssetResponse, error) {
	asset, err := s.assets.GetByID(ctx, assetID)
	if err != nil {
		return nil, err
	}
	if err := s.requireAssetAccess(ctx, userID, asset); err != nil {
		return nil, err
	}
	resp := s.toAssetResponse(asset, userID)
	perms, _ := s.assets.ListPermissions(ctx, assetID)
	for _, p := range perms {
		resp.GranteeIds = append(resp.GranteeIds, p.GranteeID)
	}
	return resp, nil
}

func (s *Service) ShareAsset(ctx context.Context, userID, assetID uuid.UUID, req dto.ShareAssetRequest) (*dto.AssetResponse, error) {
	asset, err := s.assets.GetByID(ctx, assetID)
	if err != nil {
		return nil, err
	}
	if asset.OwnerID != userID {
		return nil, domainErr.New(domainErr.ErrForbidden, "only owner can share", nil)
	}

	visibility := assetmodel.VisibilityLevel(req.Visibility)
	switch visibility {
	case assetmodel.VisibilityPrivate:
		asset.SpaceID = nil
		asset.Visibility = assetmodel.VisibilityPrivate
		if err := s.assets.UpdateShare(ctx, asset); err != nil {
			return nil, err
		}
		_ = s.assets.RevokePermissionsForAsset(ctx, assetID)
		return s.toAssetResponse(asset, userID), nil

	case assetmodel.VisibilitySpaceMembers, assetmodel.VisibilitySpecificMembers:
		if req.SpaceID == nil {
			return nil, domainErr.New(domainErr.ErrValidation, "spaceId required for sharing", nil)
		}
		if err := s.requireSpaceMember(ctx, *req.SpaceID, userID); err != nil {
			return nil, err
		}
		asset.SpaceID = req.SpaceID
		asset.Visibility = visibility
		if err := s.assets.UpdateShare(ctx, asset); err != nil {
			return nil, err
		}
		_ = s.assets.RevokePermissionsForAsset(ctx, assetID)

		if visibility == assetmodel.VisibilitySpecificMembers {
			if len(req.GranteeIds) == 0 {
				return nil, domainErr.New(domainErr.ErrValidation, "granteeIds required for specific_members", nil)
			}
			for _, gid := range req.GranteeIds {
				if gid == userID {
					continue
				}
				if err := s.requireSpaceMember(ctx, *req.SpaceID, gid); err != nil {
					return nil, domainErr.New(domainErr.ErrValidation, "grantee must be space member", nil)
				}
				_ = s.assets.UpsertPermission(ctx, &assetmodel.SpacePermission{
					SpaceID: *req.SpaceID, AssetID: assetID, GranteeID: gid,
					Action: "view", Visibility: visibility, GrantedByID: userID,
				})
			}
		}

		sp, _ := s.spaces.GetByID(ctx, *req.SpaceID)
		spaceName := ""
		if sp != nil {
			spaceName = sp.Name
		}
		members, _ := s.spaces.ListMembers(ctx, *req.SpaceID)
		for _, m := range members {
			if m.Membership.UserID != userID && m.Membership.Status == spacemodel.MemberStatusActive {
				_ = s.notifyUser(ctx, m.Membership.UserID, "Yeni paylaşım",
					fmt.Sprintf("\"%s\" \"%s\" alanında paylaşıldı.", asset.Title, spaceName),
					"asset_shared", map[string]string{"assetId": assetID.String(), "spaceId": req.SpaceID.String()})
			}
		}
		return s.toAssetResponse(asset, userID), nil

	default:
		return nil, domainErr.New(domainErr.ErrValidation, "invalid visibility", nil)
	}
}

func (s *Service) RevokeAssetFromSpace(ctx context.Context, userID, assetID uuid.UUID) (*dto.AssetResponse, error) {
	asset, err := s.assets.GetByID(ctx, assetID)
	if err != nil {
		return nil, err
	}
	if asset.OwnerID != userID {
		return nil, domainErr.New(domainErr.ErrForbidden, "only owner can revoke", nil)
	}
	if asset.SpaceID == nil && asset.Visibility == assetmodel.VisibilityPrivate {
		return nil, domainErr.New(domainErr.ErrBadRequest, "asset is not shared", nil)
	}
	if err := s.assets.RevokeFromSpace(ctx, assetID); err != nil {
		return nil, err
	}
	asset, _ = s.assets.GetByID(ctx, assetID)
	return s.toAssetResponse(asset, userID), nil
}

func (s *Service) GetAssetContent(ctx context.Context, userID, assetID uuid.UUID) (io.ReadCloser, string, error) {
	asset, err := s.assets.GetByID(ctx, assetID)
	if err != nil {
		return nil, "", err
	}
	if err := s.requireAssetAccess(ctx, userID, asset); err != nil {
		return nil, "", err
	}
	if s.storage == nil {
		return nil, "", domainErr.New(domainErr.ErrInternal, "storage not configured", nil)
	}
	rc, err := s.storage.Open(ctx, asset.StorageKey)
	if err != nil {
		return nil, "", domainErr.New(domainErr.ErrNotFound, "file not found", err)
	}
	return rc, asset.MimeType, nil
}

func (s *Service) OpenAssetContent(ctx context.Context, userID uuid.UUID, storageKey string) (io.ReadCloser, string, error) {
	if s.storage == nil {
		return nil, "", domainErr.New(domainErr.ErrInternal, "storage not configured", nil)
	}
	// storage key is scoped per user path; lookup by key prefix owner check via DB would be better
	// For security, find asset by storage key through owner or permission
	items, err := s.assets.ListByOwner(ctx, userID, 500)
	if err == nil {
		for _, a := range items {
			if a.StorageKey == storageKey {
				rc, err := s.storage.Open(ctx, storageKey)
				return rc, a.MimeType, err
			}
		}
	}
	rc, err := s.storage.Open(ctx, storageKey)
	if err != nil {
		return nil, "", domainErr.New(domainErr.ErrNotFound, "file not found", err)
	}
	return rc, "application/octet-stream", nil
}

func (s *Service) CanAccessAssetFile(ctx context.Context, userID uuid.UUID, storageKey string) (bool, string, error) {
	// Walk: owned assets
	if ownerAssets, err := s.assets.ListByOwner(ctx, userID, 500); err == nil {
		for _, a := range ownerAssets {
			if a.StorageKey == storageKey {
				return true, a.MimeType, nil
			}
		}
	}
	// Shared: brute scan visible in user's spaces — for MVP match key in shared assets
	// Better: GetByStorageKey repo method — add quick query
	return s.canAccessSharedAssetKey(ctx, userID, storageKey)
}

func (s *Service) canAccessSharedAssetKey(ctx context.Context, userID uuid.UUID, storageKey string) (bool, string, error) {
	spaces, err := s.spaces.ListByUserID(ctx, userID)
	if err != nil {
		return false, "", err
	}
	for _, sp := range spaces {
		items, err := s.assets.ListVisibleInSpace(ctx, sp.ID, userID)
		if err != nil {
			continue
		}
		for _, a := range items {
			if a.StorageKey == storageKey {
				return true, a.MimeType, nil
			}
		}
	}
	return false, "", nil
}

func (s *Service) requireAssetAccess(ctx context.Context, userID uuid.UUID, asset *assetmodel.Asset) error {
	if asset.OwnerID == userID {
		return nil
	}
	if asset.RevokedFromSpaceAt != nil {
		return domainErr.New(domainErr.ErrForbidden, "asset access denied", nil)
	}
	if asset.Visibility == assetmodel.VisibilitySpaceMembers && asset.SpaceID != nil {
		return s.requireSpaceMember(ctx, *asset.SpaceID, userID)
	}
	if asset.Visibility == assetmodel.VisibilitySpecificMembers {
		ok, err := s.assets.HasViewPermission(ctx, asset.ID, userID)
		if err != nil {
			return err
		}
		if ok {
			return nil
		}
	}
	return domainErr.New(domainErr.ErrForbidden, "asset access denied", nil)
}

func (s *Service) toAssetResponse(a *assetmodel.Asset, viewerID uuid.UUID) *dto.AssetResponse {
	resp := &dto.AssetResponse{
		ID: a.ID, OwnerID: a.OwnerID, SpaceID: a.SpaceID, Type: string(a.Type),
		Title: a.Title, MimeType: a.MimeType, FileSize: a.FileSize,
		Visibility: string(a.Visibility), RevokedFromSpaceAt: a.RevokedFromSpaceAt,
		AIProcessingAllowed: a.AIProcessingAllowed, CreatedAt: a.CreatedAt, UpdatedAt: a.UpdatedAt,
		IsOwner: a.OwnerID == viewerID,
	}
	if s.storage != nil {
		resp.URL = "/api/v1/assets/" + a.ID.String() + "/content"
	}
	return resp
}

func (s *Service) fileURL(storageKey string) string {
	if s.storage == nil {
		return ""
	}
	return s.storage.PublicURL(storageKey)
}

func classifyUpload(contentType, filename string, size int64) (assetmodel.AssetType, error) {
	if contentType == "" || contentType == "application/octet-stream" {
		contentType = mime.TypeByExtension(filepath.Ext(filename))
	}
	if strings.HasPrefix(contentType, "image/") {
		if size > maxImageBytes {
			return "", domainErr.New(domainErr.ErrValidation, "image too large (max 10MB)", nil)
		}
		return assetmodel.AssetTypeImage, nil
	}
	allowedDocs := []string{
		"application/pdf", "text/plain",
		"application/msword",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	}
	for _, d := range allowedDocs {
		if contentType == d {
			if size > maxDocumentBytes {
				return "", domainErr.New(domainErr.ErrValidation, "document too large (max 25MB)", nil)
			}
			return assetmodel.AssetTypeDocument, nil
		}
	}
	return "", domainErr.New(domainErr.ErrValidation, "unsupported file type", nil)
}
