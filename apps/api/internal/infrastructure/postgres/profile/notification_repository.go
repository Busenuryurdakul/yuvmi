package profile

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/domain/profile/model"
)

type NotificationRepo struct{ db *pgxpool.Pool }

func NewNotificationRepo(db *pgxpool.Pool) *NotificationRepo { return &NotificationRepo{db: db} }

func (r *NotificationRepo) UpsertToken(ctx context.Context, token *model.NotificationToken) error {
	if token.ID == uuid.Nil {
		token.ID = uuid.New()
	}
	now := time.Now().UTC()
	token.UpdatedAt = now
	if token.CreatedAt.IsZero() {
		token.CreatedAt = now
	}
	_, err := r.db.Exec(ctx, `
		INSERT INTO notification_tokens (id, user_id, token, platform, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6)
		ON CONFLICT (user_id, token) DO UPDATE SET platform=EXCLUDED.platform, updated_at=EXCLUDED.updated_at`,
		token.ID, token.UserID, token.Token, token.Platform, token.CreatedAt, token.UpdatedAt)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to upsert notification token", err)
	}
	return nil
}

func (r *NotificationRepo) ListTokens(ctx context.Context, userID uuid.UUID) ([]*model.NotificationToken, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, token, platform, created_at, updated_at
		FROM notification_tokens WHERE user_id=$1`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tokens []*model.NotificationToken
	for rows.Next() {
		var t model.NotificationToken
		if err := rows.Scan(&t.ID, &t.UserID, &t.Token, &t.Platform, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		tokens = append(tokens, &t)
	}
	return tokens, nil
}

func (r *NotificationRepo) CreateNotification(ctx context.Context, n *model.InAppNotification) error {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	if n.CreatedAt.IsZero() {
		n.CreatedAt = time.Now().UTC()
	}
	dataJSON, _ := json.Marshal(n.Data)
	_, err := r.db.Exec(ctx, `
		INSERT INTO in_app_notifications (id, user_id, title, body, type, data, read_at, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		n.ID, n.UserID, n.Title, n.Body, n.Type, dataJSON, n.ReadAt, n.CreatedAt)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to create notification", err)
	}
	return nil
}

func (r *NotificationRepo) ListNotifications(ctx context.Context, userID uuid.UUID, limit int) ([]*model.InAppNotification, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, title, body, type, data, read_at, created_at
		FROM in_app_notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*model.InAppNotification
	for rows.Next() {
		n, err := r.scanNotification(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, n)
	}
	return out, nil
}

func (r *NotificationRepo) MarkRead(ctx context.Context, userID, notificationID uuid.UUID) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE in_app_notifications SET read_at=NOW() WHERE id=$1 AND user_id=$2 AND read_at IS NULL`,
		notificationID, userID)
	if err != nil || tag.RowsAffected() == 0 {
		return domainErr.New(domainErr.ErrNotFound, "notification not found", err)
	}
	return nil
}

func (r *NotificationRepo) CountUnread(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM in_app_notifications WHERE user_id=$1 AND read_at IS NULL`, userID).Scan(&count)
	return count, err
}

func (r *NotificationRepo) scanNotification(row pgx.Row) (*model.InAppNotification, error) {
	var n model.InAppNotification
	var dataJSON []byte
	err := row.Scan(&n.ID, &n.UserID, &n.Title, &n.Body, &n.Type, &dataJSON, &n.ReadAt, &n.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainErr.New(domainErr.ErrNotFound, "notification not found", nil)
		}
		return nil, domainErr.New(domainErr.ErrInternal, "failed to scan notification", err)
	}
	_ = json.Unmarshal(dataJSON, &n.Data)
	return &n, nil
}
