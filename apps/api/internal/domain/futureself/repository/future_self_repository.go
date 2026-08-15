package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/futureself/model"
)

type FutureSelfRepository interface {
	Create(ctx context.Context, fs *model.FutureSelf) error
	GetByUserID(ctx context.Context, userID uuid.UUID) (*model.FutureSelf, error)
	Update(ctx context.Context, fs *model.FutureSelf) error
	Approve(ctx context.Context, userID uuid.UUID) error
}
