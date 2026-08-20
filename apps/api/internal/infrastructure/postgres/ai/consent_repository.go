package ai

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/masterfabric-go/masterfabric/internal/domain/ai/model"
	"github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

type ConsentRepo struct {
	db *pgxpool.Pool
}

func NewConsentRepo(db *pgxpool.Pool) *ConsentRepo {
	return &ConsentRepo{db: db}
}

const consentColumns = `id, user_id, scope, granted, resource_type, resource_id, granted_at, revoked_at, created_at, updated_at`

func (r *ConsentRepo) ListByUser(ctx context.Context, userID uuid.UUID) ([]model.Consent, error) {
	rows, err := r.db.Query(ctx, `
		SELECT `+consentColumns+`
		FROM consents WHERE user_id = $1 AND resource_id IS NULL
		ORDER BY scope`, userID)
	if err != nil {
		return nil, errors.New(errors.ErrInternal, "failed to list consents", err)
	}
	defer rows.Close()

	var out []model.Consent
	for rows.Next() {
		c, err := scanConsent(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *c)
	}
	if err := rows.Err(); err != nil {
		return nil, errors.New(errors.ErrInternal, "failed to iterate consents", err)
	}
	return out, nil
}

func (r *ConsentRepo) Get(ctx context.Context, userID uuid.UUID, scope model.ConsentScope) (*model.Consent, error) {
	row := r.db.QueryRow(ctx, `
		SELECT `+consentColumns+`
		FROM consents WHERE user_id = $1 AND scope = $2 AND resource_id IS NULL`, userID, string(scope))
	c, err := scanConsent(row)
	if err != nil {
		return nil, err
	}
	return c, nil
}

// Set upserts the decision. granted_at and revoked_at are only advanced on the
// transition that matches them, so re-granting an already-granted scope keeps
// the original grant timestamp — the audit trail records when permission
// actually started, not when the screen was last opened.
func (r *ConsentRepo) Set(ctx context.Context, userID uuid.UUID, scope model.ConsentScope, granted bool) (*model.Consent, error) {
	now := time.Now().UTC()
	var grantedAt, revokedAt *time.Time
	if granted {
		grantedAt = &now
	} else {
		revokedAt = &now
	}

	row := r.db.QueryRow(ctx, `
		INSERT INTO consents (user_id, scope, granted, granted_at, revoked_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $6)
		ON CONFLICT (user_id, scope) WHERE resource_id IS NULL
		DO UPDATE SET
			granted    = EXCLUDED.granted,
			granted_at = CASE WHEN EXCLUDED.granted AND NOT consents.granted
			                  THEN EXCLUDED.granted_at ELSE consents.granted_at END,
			revoked_at = CASE WHEN NOT EXCLUDED.granted AND consents.granted
			                  THEN EXCLUDED.revoked_at ELSE consents.revoked_at END,
			updated_at = EXCLUDED.updated_at
		RETURNING `+consentColumns,
		userID, string(scope), granted, grantedAt, revokedAt, now)

	return scanConsent(row)
}

// rowScanner unifies pgx.Row and pgx.Rows so one scan helper serves both the
// single-row and list queries.
type rowScanner interface {
	Scan(dest ...any) error
}

func scanConsent(row rowScanner) (*model.Consent, error) {
	var c model.Consent
	var scope string
	err := row.Scan(&c.ID, &c.UserID, &scope, &c.Granted, &c.ResourceType, &c.ResourceID,
		&c.GrantedAt, &c.RevokedAt, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.New(errors.ErrNotFound, "consent not found", nil)
		}
		return nil, errors.New(errors.ErrInternal, "failed to scan consent", err)
	}
	c.Scope = model.ConsentScope(scope)
	return &c, nil
}
