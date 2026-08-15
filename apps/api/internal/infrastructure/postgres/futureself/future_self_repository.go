package futureself

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/domain/futureself/model"
)

type FutureSelfRepo struct {
	db *pgxpool.Pool
}

func NewFutureSelfRepo(db *pgxpool.Pool) *FutureSelfRepo {
	return &FutureSelfRepo{db: db}
}

func (r *FutureSelfRepo) Create(ctx context.Context, fs *model.FutureSelf) error {
	if fs.ID == uuid.Nil {
		fs.ID = uuid.New()
	}
	now := time.Now().UTC()
	fs.CreatedAt = now
	fs.UpdatedAt = now

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return errors.New(errors.ErrInternal, "failed to begin transaction", err)
	}
	defer tx.Rollback(ctx)

	domains := domainsToStrings(fs.Domains)
	_, err = tx.Exec(ctx, `
		INSERT INTO future_selfs (id, user_id, title, description, domains, affirmations, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		fs.ID, fs.UserID, fs.Title, fs.Description, domains, fs.Affirmations, fs.Status, fs.CreatedAt, fs.UpdatedAt,
	)
	if err != nil {
		return errors.New(errors.ErrInternal, "failed to create future self", err)
	}

	for i := range fs.VisionItems {
		item := &fs.VisionItems[i]
		if item.ID == uuid.Nil {
			item.ID = uuid.New()
		}
		item.FutureSelfID = fs.ID
		_, err = tx.Exec(ctx, `
			INSERT INTO vision_items (id, future_self_id, domain, title, image_url, note, sort_order)
			VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			item.ID, item.FutureSelfID, string(item.Domain), item.Title, item.ImageURL, item.Note, item.SortOrder,
		)
		if err != nil {
			return errors.New(errors.ErrInternal, "failed to create vision item", err)
		}
	}

	return tx.Commit(ctx)
}

func (r *FutureSelfRepo) GetByUserID(ctx context.Context, userID uuid.UUID) (*model.FutureSelf, error) {
	var fs model.FutureSelf
	var domains []string
	err := r.db.QueryRow(ctx, `
		SELECT id, user_id, title, description, domains, affirmations, status, created_at, updated_at
		FROM future_selfs WHERE user_id = $1 AND status IN ('draft', 'approved')
		ORDER BY created_at DESC LIMIT 1`, userID,
	).Scan(&fs.ID, &fs.UserID, &fs.Title, &fs.Description, &domains, &fs.Affirmations, &fs.Status, &fs.CreatedAt, &fs.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.New(errors.ErrNotFound, "future self not found", nil)
		}
		return nil, errors.New(errors.ErrInternal, "failed to get future self", err)
	}
	fs.Domains = stringsToDomains(domains)

	rows, err := r.db.Query(ctx, `
		SELECT id, future_self_id, domain, title, image_url, note, sort_order
		FROM vision_items WHERE future_self_id = $1 ORDER BY sort_order`, fs.ID)
	if err != nil {
		return nil, errors.New(errors.ErrInternal, "failed to list vision items", err)
	}
	defer rows.Close()

	for rows.Next() {
		var item model.VisionItem
		var domain string
		if err := rows.Scan(&item.ID, &item.FutureSelfID, &domain, &item.Title, &item.ImageURL, &item.Note, &item.SortOrder); err != nil {
			return nil, errors.New(errors.ErrInternal, "failed to scan vision item", err)
		}
		item.Domain = model.LifeDomain(domain)
		fs.VisionItems = append(fs.VisionItems, item)
	}

	return &fs, nil
}

func (r *FutureSelfRepo) Update(ctx context.Context, fs *model.FutureSelf) error {
	fs.UpdatedAt = time.Now().UTC()
	domains := domainsToStrings(fs.Domains)

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return errors.New(errors.ErrInternal, "failed to begin transaction", err)
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `
		UPDATE future_selfs SET title=$1, description=$2, domains=$3, affirmations=$4, updated_at=$5
		WHERE id=$6 AND user_id=$7 AND status='draft'`,
		fs.Title, fs.Description, domains, fs.Affirmations, fs.UpdatedAt, fs.ID, fs.UserID,
	)
	if err != nil {
		return errors.New(errors.ErrInternal, "failed to update future self", err)
	}

	_, err = tx.Exec(ctx, `DELETE FROM vision_items WHERE future_self_id = $1`, fs.ID)
	if err != nil {
		return errors.New(errors.ErrInternal, "failed to clear vision items", err)
	}

	for i := range fs.VisionItems {
		item := &fs.VisionItems[i]
		if item.ID == uuid.Nil {
			item.ID = uuid.New()
		}
		item.FutureSelfID = fs.ID
		_, err = tx.Exec(ctx, `
			INSERT INTO vision_items (id, future_self_id, domain, title, image_url, note, sort_order)
			VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			item.ID, item.FutureSelfID, string(item.Domain), item.Title, item.ImageURL, item.Note, item.SortOrder,
		)
		if err != nil {
			return errors.New(errors.ErrInternal, "failed to recreate vision item", err)
		}
	}

	return tx.Commit(ctx)
}

func (r *FutureSelfRepo) Approve(ctx context.Context, userID uuid.UUID) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE future_selfs SET status='approved', updated_at=NOW()
		WHERE user_id=$1 AND status='draft'`, userID)
	if err != nil {
		return errors.New(errors.ErrInternal, "failed to approve future self", err)
	}
	if tag.RowsAffected() == 0 {
		return errors.New(errors.ErrNotFound, "no draft future self to approve", nil)
	}
	return nil
}

func domainsToStrings(domains []model.LifeDomain) []string {
	out := make([]string, len(domains))
	for i, d := range domains {
		out[i] = string(d)
	}
	return out
}

func stringsToDomains(in []string) []model.LifeDomain {
	out := make([]model.LifeDomain, len(in))
	for i, s := range in {
		out[i] = model.LifeDomain(s)
	}
	return out
}
