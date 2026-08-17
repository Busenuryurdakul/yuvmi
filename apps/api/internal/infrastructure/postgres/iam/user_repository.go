package iam

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/model"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

// UserRepo implements repository.UserRepository with PostgreSQL.
type UserRepo struct {
	db *pgxpool.Pool
}

// NewUserRepo creates a new UserRepo.
func NewUserRepo(db *pgxpool.Pool) *UserRepo {
	return &UserRepo{db: db}
}

func (r *UserRepo) Create(ctx context.Context, user *model.User) error {
	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}
	now := time.Now().UTC()
	user.CreatedAt = now
	user.UpdatedAt = now

	_, err := r.db.Exec(ctx,
		`INSERT INTO users (id, email, password_hash, first_name, last_name, auth_provider, provider_subject, status, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		user.ID, user.Email, user.PasswordHash, user.FirstName, user.LastName,
		nullIfEmpty(user.AuthProvider), nullIfEmpty(user.ProviderSubject),
		user.Status, user.CreatedAt, user.UpdatedAt,
	)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to create user", err)
	}
	return nil
}

func (r *UserRepo) GetByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	return r.scanUser(r.db.QueryRow(ctx,
		`SELECT id, email, password_hash, first_name, last_name, auth_provider, provider_subject, status, created_at, updated_at
		 FROM users WHERE id = $1`, id))
}

func (r *UserRepo) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	return r.scanUser(r.db.QueryRow(ctx,
		`SELECT id, email, password_hash, first_name, last_name, auth_provider, provider_subject, status, created_at, updated_at
		 FROM users WHERE email = $1`, email))
}

func (r *UserRepo) GetByProvider(ctx context.Context, provider, subject string) (*model.User, error) {
	return r.scanUser(r.db.QueryRow(ctx,
		`SELECT id, email, password_hash, first_name, last_name, auth_provider, provider_subject, status, created_at, updated_at
		 FROM users WHERE auth_provider = $1 AND provider_subject = $2`, provider, subject))
}

func (r *UserRepo) Update(ctx context.Context, user *model.User) error {
	user.UpdatedAt = time.Now().UTC()
	_, err := r.db.Exec(ctx,
		`UPDATE users SET email=$1, password_hash=$2, first_name=$3, last_name=$4,
		 auth_provider=$5, provider_subject=$6, status=$7, updated_at=$8 WHERE id=$9`,
		user.Email, nullIfEmpty(user.PasswordHash), user.FirstName, user.LastName,
		nullIfEmpty(user.AuthProvider), nullIfEmpty(user.ProviderSubject),
		user.Status, user.UpdatedAt, user.ID,
	)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to update user", err)
	}
	return nil
}

func (r *UserRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM users WHERE id=$1`, id)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to delete user", err)
	}
	return nil
}

func (r *UserRepo) List(ctx context.Context, offset, limit int) ([]*model.User, int, error) {
	var total int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&total)
	if err != nil {
		return nil, 0, domainErr.New(domainErr.ErrInternal, "failed to count users", err)
	}

	rows, err := r.db.Query(ctx,
		`SELECT id, email, password_hash, first_name, last_name, auth_provider, provider_subject, status, created_at, updated_at
		 FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`, limit, offset,
	)
	if err != nil {
		return nil, 0, domainErr.New(domainErr.ErrInternal, "failed to list users", err)
	}
	defer rows.Close()

	var users []*model.User
	for rows.Next() {
		u, err := r.scanUser(rows)
		if err != nil {
			return nil, 0, err
		}
		users = append(users, u)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, domainErr.New(domainErr.ErrInternal, "failed to list users", err)
	}
	return users, total, nil
}

func (r *UserRepo) scanUser(row pgx.Row) (*model.User, error) {
	var u model.User
	var authProvider, providerSubject *string
	err := row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.FirstName, &u.LastName,
		&authProvider, &providerSubject, &u.Status, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainErr.New(domainErr.ErrNotFound, "user not found", nil)
		}
		return nil, domainErr.New(domainErr.ErrInternal, "failed to scan user", err)
	}
	if authProvider != nil {
		u.AuthProvider = *authProvider
	}
	if providerSubject != nil {
		u.ProviderSubject = *providerSubject
	}
	return &u, nil
}

func (r *UserRepo) GetPearlBalance(ctx context.Context, userID uuid.UUID) (int, error) {
	var balance int
	err := r.db.QueryRow(ctx, `SELECT pearl_balance FROM users WHERE id = $1`, userID).Scan(&balance)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, domainErr.New(domainErr.ErrNotFound, "user not found", nil)
		}
		return 0, domainErr.New(domainErr.ErrInternal, "failed to get pearl balance", err)
	}
	return balance, nil
}

// AwardPearlsIfUnderDailyCap serializes concurrent award attempts for the
// same user+reason with a transaction-scoped advisory lock, so the
// count-then-award check can't race: only one caller at a time can be
// mid-check for a given (userID, reason) pair.
func (r *UserRepo) AwardPearlsIfUnderDailyCap(ctx context.Context, userID uuid.UUID, reason string, amount, dailyCap int, since time.Time) (int, bool, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return 0, false, domainErr.New(domainErr.ErrInternal, "failed to start transaction", err)
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, userID.String()+":"+reason); err != nil {
		return 0, false, domainErr.New(domainErr.ErrInternal, "failed to acquire pearl award lock", err)
	}

	var count int
	if err := tx.QueryRow(ctx,
		`SELECT COUNT(*) FROM pearl_awards WHERE user_id = $1 AND reason = $2 AND created_at >= $3`,
		userID, reason, since,
	).Scan(&count); err != nil {
		return 0, false, domainErr.New(domainErr.ErrInternal, "failed to count pearl awards", err)
	}

	if count >= dailyCap {
		var balance int
		if err := tx.QueryRow(ctx, `SELECT pearl_balance FROM users WHERE id = $1`, userID).Scan(&balance); err != nil {
			return 0, false, domainErr.New(domainErr.ErrInternal, "failed to get pearl balance", err)
		}
		if err := tx.Commit(ctx); err != nil {
			return 0, false, domainErr.New(domainErr.ErrInternal, "failed to commit pearl award check", err)
		}
		return balance, false, nil
	}

	if _, err := tx.Exec(ctx,
		`INSERT INTO pearl_awards (user_id, reason, amount) VALUES ($1, $2, $3)`,
		userID, reason, amount,
	); err != nil {
		return 0, false, domainErr.New(domainErr.ErrInternal, "failed to record pearl award", err)
	}

	var balance int
	if err := tx.QueryRow(ctx,
		`UPDATE users SET pearl_balance = pearl_balance + $2 WHERE id = $1 RETURNING pearl_balance`,
		userID, amount,
	).Scan(&balance); err != nil {
		return 0, false, domainErr.New(domainErr.ErrInternal, "failed to update pearl balance", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, false, domainErr.New(domainErr.ErrInternal, "failed to commit pearl award", err)
	}
	return balance, true, nil
}

func (r *UserRepo) AwardPearls(ctx context.Context, userID uuid.UUID, reason string, amount int) (int, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return 0, domainErr.New(domainErr.ErrInternal, "failed to start transaction", err)
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx,
		`INSERT INTO pearl_awards (user_id, reason, amount) VALUES ($1, $2, $3)`,
		userID, reason, amount,
	); err != nil {
		return 0, domainErr.New(domainErr.ErrInternal, "failed to record pearl award", err)
	}

	var balance int
	if err := tx.QueryRow(ctx,
		`UPDATE users SET pearl_balance = pearl_balance + $2 WHERE id = $1 RETURNING pearl_balance`,
		userID, amount,
	).Scan(&balance); err != nil {
		return 0, domainErr.New(domainErr.ErrInternal, "failed to update pearl balance", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, domainErr.New(domainErr.ErrInternal, "failed to commit pearl award", err)
	}
	return balance, nil
}

func nullIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
