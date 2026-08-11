package subscription

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/domain/subscription/model"
)

type SubscriptionRepo struct{ db *pgxpool.Pool }

func NewSubscriptionRepo(db *pgxpool.Pool) *SubscriptionRepo { return &SubscriptionRepo{db: db} }

func (r *SubscriptionRepo) GetByUserID(ctx context.Context, userID uuid.UUID) (*model.Subscription, error) {
	return r.scan(r.db.QueryRow(ctx, `
		SELECT id, user_id, tier, status, provider, provider_subscription_id, current_period_end, created_at, updated_at
		FROM subscriptions WHERE user_id=$1`, userID))
}

func (r *SubscriptionRepo) Upsert(ctx context.Context, sub *model.Subscription) error {
	if sub.ID == uuid.Nil {
		sub.ID = uuid.New()
	}
	now := time.Now().UTC()
	sub.UpdatedAt = now
	if sub.CreatedAt.IsZero() {
		sub.CreatedAt = now
	}
	_, err := r.db.Exec(ctx, `
		INSERT INTO subscriptions (id, user_id, tier, status, provider, provider_subscription_id, current_period_end, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		ON CONFLICT (user_id) DO UPDATE SET
			tier=EXCLUDED.tier,
			status=EXCLUDED.status,
			provider=EXCLUDED.provider,
			provider_subscription_id=EXCLUDED.provider_subscription_id,
			current_period_end=EXCLUDED.current_period_end,
			updated_at=EXCLUDED.updated_at`,
		sub.ID, sub.UserID, sub.Tier, sub.Status, sub.Provider, sub.ProviderSubscriptionID, sub.CurrentPeriodEnd, sub.CreatedAt, sub.UpdatedAt)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to upsert subscription", err)
	}
	return nil
}

func (r *SubscriptionRepo) scan(row pgx.Row) (*model.Subscription, error) {
	var s model.Subscription
	var provider *string
	err := row.Scan(&s.ID, &s.UserID, &s.Tier, &s.Status, &provider, &s.ProviderSubscriptionID, &s.CurrentPeriodEnd, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainErr.New(domainErr.ErrNotFound, "subscription not found", nil)
		}
		return nil, domainErr.New(domainErr.ErrInternal, "failed to scan subscription", err)
	}
	if provider != nil {
		p := model.SubscriptionProvider(*provider)
		s.Provider = &p
	}
	return &s, nil
}
