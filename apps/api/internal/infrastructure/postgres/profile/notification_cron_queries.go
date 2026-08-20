package profile

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type PushTarget struct {
	UserID   uuid.UUID
	Token    string
	Timezone string
}

func (r *NotificationRepo) ListPushTargets(ctx context.Context) ([]PushTarget, error) {
	rows, err := r.db.Query(ctx, `
		SELECT nt.user_id, nt.token, COALESCE(up.timezone, 'Europe/Istanbul')
		FROM notification_tokens nt
		LEFT JOIN user_profiles up ON up.user_id = nt.user_id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var targets []PushTarget
	for rows.Next() {
		var t PushTarget
		if err := rows.Scan(&t.UserID, &t.Token, &t.Timezone); err != nil {
			return nil, err
		}
		targets = append(targets, t)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return targets, nil
}

func (r *NotificationRepo) TryRecordDispatch(ctx context.Context, userID uuid.UUID, kind string, dispatchDate time.Time) (bool, error) {
	tag, err := r.db.Exec(ctx, `
		INSERT INTO notification_dispatch_log (id, user_id, kind, dispatch_date, created_at)
		VALUES ($1, $2, $3, $4, NOW())
		ON CONFLICT (user_id, kind, dispatch_date) DO NOTHING`,
		uuid.New(), userID, kind, dispatchDate)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

func (r *NotificationRepo) HasCheckinOnDate(ctx context.Context, userID uuid.UUID, date time.Time) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM today_entries WHERE user_id=$1 AND date=$2)`,
		userID, date).Scan(&exists)
	return exists, err
}

func (r *NotificationRepo) HasCompletedTaskOnDate(ctx context.Context, userID uuid.UUID, date time.Time) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM daily_tasks
			WHERE user_id=$1 AND date=$2 AND status IN ('completed', 'skipped')
		)`, userID, date).Scan(&exists)
	return exists, err
}
