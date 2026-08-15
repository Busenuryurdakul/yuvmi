package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/subscription/model"
)

type SubscriptionRepository interface {
	GetByUserID(ctx context.Context, userID uuid.UUID) (*model.Subscription, error)
	GetByProviderSubscriptionID(ctx context.Context, providerSubID string) (*model.Subscription, error)
	ListExpiredPremium(ctx context.Context, now time.Time) ([]*model.Subscription, error)
	Upsert(ctx context.Context, sub *model.Subscription) error
}
