package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/subscription/model"
)

type SubscriptionRepository interface {
	GetByUserID(ctx context.Context, userID uuid.UUID) (*model.Subscription, error)
	Upsert(ctx context.Context, sub *model.Subscription) error
}
