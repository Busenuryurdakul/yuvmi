package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/model"
)

// UserRepository defines the interface for user persistence.
type UserRepository interface {
	Create(ctx context.Context, user *model.User) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.User, error)
	GetByEmail(ctx context.Context, email string) (*model.User, error)
	GetByProvider(ctx context.Context, provider, subject string) (*model.User, error)
	Update(ctx context.Context, user *model.User) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, offset, limit int) ([]*model.User, int, error)

	// GetPearlBalance returns the user's current İnci (pearl) balance.
	GetPearlBalance(ctx context.Context, userID uuid.UUID) (int, error)
	// SpendPearls atomically deducts amount from the balance when the user can
	// afford it and records the spend in the ledger as a negative award.
	// Returns the resulting balance and whether the deduction happened —
	// insufficient funds is a normal outcome, not an error. The client never
	// sets a balance directly, so a stale client can't overwrite awards.
	SpendPearls(ctx context.Context, userID uuid.UUID, reason string, amount int) (balance int, spent bool, err error)
	// AwardPearls records a pearl award and atomically increments the user's
	// balance, returning the new balance.
	AwardPearls(ctx context.Context, userID uuid.UUID, reason string, amount int) (int, error)
	// AwardPearlsIfUnderDailyCap atomically checks whether the reason has
	// already been awarded dailyCap times since the given time and, if not,
	// grants the award — serialized per user+reason so concurrent callers
	// can't both slip past the cap. Returns the resulting balance and
	// whether an award was actually granted.
	AwardPearlsIfUnderDailyCap(ctx context.Context, userID uuid.UUID, reason string, amount, dailyCap int, since time.Time) (balance int, awarded bool, err error)
}
