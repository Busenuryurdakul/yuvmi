package goal

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/domain/goal/model"
)

type GoalRepo struct{ db *pgxpool.Pool }

func NewGoalRepo(db *pgxpool.Pool) *GoalRepo { return &GoalRepo{db: db} }

func (r *GoalRepo) Create(ctx context.Context, goal *model.Goal) error {
	if goal.ID == uuid.Nil {
		goal.ID = uuid.New()
	}
	now := time.Now().UTC()
	goal.CreatedAt = now
	goal.UpdatedAt = now
	_, err := r.db.Exec(ctx, `
		INSERT INTO goals (id, user_id, future_self_id, title, description, target_date, status, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
		goal.ID, goal.UserID, goal.FutureSelfID, goal.Title, goal.Description, goal.TargetDate, goal.Status, goal.CreatedAt, goal.UpdatedAt)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to create goal", err)
	}
	return nil
}

func (r *GoalRepo) GetActiveByUserID(ctx context.Context, userID uuid.UUID) (*model.Goal, error) {
	return r.scanGoal(r.db.QueryRow(ctx, `
		SELECT id, user_id, future_self_id, title, description, target_date, status, created_at, updated_at
		FROM goals WHERE user_id=$1 AND status='active' ORDER BY created_at DESC LIMIT 1`, userID))
}

func (r *GoalRepo) GetByID(ctx context.Context, userID, goalID uuid.UUID) (*model.Goal, error) {
	return r.scanGoal(r.db.QueryRow(ctx, `
		SELECT id, user_id, future_self_id, title, description, target_date, status, created_at, updated_at
		FROM goals WHERE id=$1 AND user_id=$2`, goalID, userID))
}

func (r *GoalRepo) Activate(ctx context.Context, userID, goalID uuid.UUID) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to begin tx", err)
	}
	defer tx.Rollback(ctx)
	_, _ = tx.Exec(ctx, `UPDATE goals SET status='archived', updated_at=NOW() WHERE user_id=$1 AND status='active'`, userID)
	tag, err := tx.Exec(ctx, `UPDATE goals SET status='active', updated_at=NOW() WHERE id=$1 AND user_id=$2`, goalID, userID)
	if err != nil || tag.RowsAffected() == 0 {
		return domainErr.New(domainErr.ErrNotFound, "goal not found", err)
	}
	return tx.Commit(ctx)
}

func (r *GoalRepo) scanGoal(row pgx.Row) (*model.Goal, error) {
	var g model.Goal
	err := row.Scan(&g.ID, &g.UserID, &g.FutureSelfID, &g.Title, &g.Description, &g.TargetDate, &g.Status, &g.CreatedAt, &g.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainErr.New(domainErr.ErrNotFound, "goal not found", nil)
		}
		return nil, domainErr.New(domainErr.ErrInternal, "failed to scan goal", err)
	}
	return &g, nil
}

func (r *GoalRepo) CountByUserID(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM goals WHERE user_id=$1 AND status != 'archived'`, userID).Scan(&count)
	if err != nil {
		return 0, domainErr.New(domainErr.ErrInternal, "failed to count goals", err)
	}
	return count, nil
}

type PlanRepo struct{ db *pgxpool.Pool }

func NewPlanRepo(db *pgxpool.Pool) *PlanRepo { return &PlanRepo{db: db} }

func (r *PlanRepo) Create(ctx context.Context, plan *model.Plan) error {
	if plan.ID == uuid.Nil {
		plan.ID = uuid.New()
	}
	now := time.Now().UTC()
	plan.CreatedAt = now
	plan.UpdatedAt = now

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to begin tx", err)
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `
		INSERT INTO plans (id, user_id, goal_id, title, description, status, version, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
		plan.ID, plan.UserID, plan.GoalID, plan.Title, plan.Description, plan.Status, plan.Version, plan.CreatedAt, plan.UpdatedAt)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to create plan", err)
	}

	for i := range plan.Steps {
		step := &plan.Steps[i]
		if step.ID == uuid.Nil {
			step.ID = uuid.New()
		}
		step.PlanID = plan.ID
		_, err = tx.Exec(ctx, `
			INSERT INTO plan_steps (id, plan_id, day_offset, title, description, sort_order)
			VALUES ($1,$2,$3,$4,$5,$6)`,
			step.ID, step.PlanID, step.DayOffset, step.Title, step.Description, step.SortOrder)
		if err != nil {
			return domainErr.New(domainErr.ErrInternal, "failed to create plan step", err)
		}
	}
	return tx.Commit(ctx)
}

func (r *PlanRepo) GetActiveByUserID(ctx context.Context, userID uuid.UUID) (*model.Plan, error) {
	plan, err := r.scanPlan(r.db.QueryRow(ctx, `
		SELECT id, user_id, goal_id, title, description, status, version, created_at, updated_at
		FROM plans WHERE user_id=$1 AND status='active' ORDER BY created_at DESC LIMIT 1`, userID))
	if err != nil {
		return nil, err
	}
	return r.attachSteps(ctx, plan)
}

func (r *PlanRepo) GetByID(ctx context.Context, userID, planID uuid.UUID) (*model.Plan, error) {
	plan, err := r.scanPlan(r.db.QueryRow(ctx, `
		SELECT id, user_id, goal_id, title, description, status, version, created_at, updated_at
		FROM plans WHERE id=$1 AND user_id=$2`, planID, userID))
	if err != nil {
		return nil, err
	}
	return r.attachSteps(ctx, plan)
}

func (r *PlanRepo) Activate(ctx context.Context, userID, planID uuid.UUID) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE plans SET status='active', updated_at=NOW() WHERE id=$1 AND user_id=$2`, planID, userID)
	if err != nil || tag.RowsAffected() == 0 {
		return domainErr.New(domainErr.ErrNotFound, "plan not found", err)
	}
	return nil
}

func (r *PlanRepo) SupersedeOthers(ctx context.Context, userID, planID uuid.UUID) error {
	_, err := r.db.Exec(ctx, `
		UPDATE plans SET status='superseded', updated_at=NOW()
		WHERE user_id=$1 AND id<>$2 AND status='active'`, userID, planID)
	return err
}

func (r *PlanRepo) ListByUserID(ctx context.Context, userID uuid.UUID) ([]*model.Plan, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, goal_id, title, description, status, version, created_at, updated_at
		FROM plans WHERE user_id=$1 ORDER BY version DESC, created_at DESC`, userID)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to list plans", err)
	}
	defer rows.Close()

	var plans []*model.Plan
	for rows.Next() {
		p, err := r.scanPlan(rows)
		if err != nil {
			return nil, err
		}
		p, err = r.attachSteps(ctx, p)
		if err != nil {
			return nil, err
		}
		plans = append(plans, p)
	}
	return plans, nil
}

func (r *PlanRepo) GetMaxVersion(ctx context.Context, userID uuid.UUID, goalID *uuid.UUID) (int, error) {
	var maxVersion int
	if goalID != nil {
		err := r.db.QueryRow(ctx, `
			SELECT COALESCE(MAX(version), 0) FROM plans WHERE user_id=$1 AND goal_id=$2`, userID, *goalID).Scan(&maxVersion)
		return maxVersion, err
	}
	err := r.db.QueryRow(ctx, `
		SELECT COALESCE(MAX(version), 0) FROM plans WHERE user_id=$1`, userID).Scan(&maxVersion)
	return maxVersion, err
}

func (r *PlanRepo) scanPlan(row pgx.Row) (*model.Plan, error) {
	var p model.Plan
	err := row.Scan(&p.ID, &p.UserID, &p.GoalID, &p.Title, &p.Description, &p.Status, &p.Version, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainErr.New(domainErr.ErrNotFound, "plan not found", nil)
		}
		return nil, domainErr.New(domainErr.ErrInternal, "failed to scan plan", err)
	}
	return &p, nil
}

func (r *PlanRepo) attachSteps(ctx context.Context, plan *model.Plan) (*model.Plan, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, plan_id, day_offset, title, description, sort_order
		FROM plan_steps WHERE plan_id=$1 ORDER BY day_offset, sort_order`, plan.ID)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to list plan steps", err)
	}
	defer rows.Close()
	for rows.Next() {
		var s model.PlanStep
		if err := rows.Scan(&s.ID, &s.PlanID, &s.DayOffset, &s.Title, &s.Description, &s.SortOrder); err != nil {
			return nil, domainErr.New(domainErr.ErrInternal, "failed to scan plan step", err)
		}
		plan.Steps = append(plan.Steps, s)
	}
	return plan, nil
}

type TaskRepo struct{ db *pgxpool.Pool }

func NewTaskRepo(db *pgxpool.Pool) *TaskRepo { return &TaskRepo{db: db} }

func (r *TaskRepo) Create(ctx context.Context, task *model.DailyTask) error {
	if task.ID == uuid.Nil {
		task.ID = uuid.New()
	}
	now := time.Now().UTC()
	task.CreatedAt = now
	task.UpdatedAt = now
	_, err := r.db.Exec(ctx, `
		INSERT INTO daily_tasks (id, user_id, plan_id, date, title, description, status, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		ON CONFLICT (user_id, date) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description, updated_at=EXCLUDED.updated_at`,
		task.ID, task.UserID, task.PlanID, task.Date, task.Title, task.Description, task.Status, task.CreatedAt, task.UpdatedAt)
	return err
}

func (r *TaskRepo) GetByDate(ctx context.Context, userID uuid.UUID, date time.Time) (*model.DailyTask, error) {
	return r.scanTask(r.db.QueryRow(ctx, `
		SELECT id, user_id, plan_id, date, title, description, status, completed_at, skipped_reason, created_at, updated_at
		FROM daily_tasks WHERE user_id=$1 AND date=$2`, userID, date))
}

func (r *TaskRepo) GetByID(ctx context.Context, userID, taskID uuid.UUID) (*model.DailyTask, error) {
	return r.scanTask(r.db.QueryRow(ctx, `
		SELECT id, user_id, plan_id, date, title, description, status, completed_at, skipped_reason, created_at, updated_at
		FROM daily_tasks WHERE id=$1 AND user_id=$2`, taskID, userID))
}

func (r *TaskRepo) Complete(ctx context.Context, userID, taskID uuid.UUID) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE daily_tasks SET status='completed', completed_at=NOW(), updated_at=NOW()
		WHERE id=$1 AND user_id=$2 AND status='pending'`, taskID, userID)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to complete task", err)
	}
	if tag.RowsAffected() > 0 {
		return nil
	}
	// Idempotent: already completed or skipped — treat as success.
	var status string
	err = r.db.QueryRow(ctx, `SELECT status FROM daily_tasks WHERE id=$1 AND user_id=$2`, taskID, userID).Scan(&status)
	if err != nil {
		return domainErr.New(domainErr.ErrNotFound, "task not found", err)
	}
	if status == "completed" || status == "skipped" {
		return nil
	}
	return domainErr.New(domainErr.ErrNotFound, "task not found", nil)
}

func (r *TaskRepo) Skip(ctx context.Context, userID, taskID uuid.UUID, reason *string) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE daily_tasks SET status='skipped', skipped_reason=$3, updated_at=NOW()
		WHERE id=$1 AND user_id=$2 AND status='pending'`, taskID, userID, reason)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to skip task", err)
	}
	if tag.RowsAffected() > 0 {
		return nil
	}
	var status string
	err = r.db.QueryRow(ctx, `SELECT status FROM daily_tasks WHERE id=$1 AND user_id=$2`, taskID, userID).Scan(&status)
	if err != nil {
		return domainErr.New(domainErr.ErrNotFound, "task not found", err)
	}
	if status == "completed" || status == "skipped" {
		return nil
	}
	return domainErr.New(domainErr.ErrNotFound, "task not found", nil)
}

func (r *TaskRepo) ListRecent(ctx context.Context, userID uuid.UUID, since time.Time) ([]*model.DailyTask, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, plan_id, date, title, description, status, completed_at, skipped_reason, created_at, updated_at
		FROM daily_tasks WHERE user_id=$1 AND date >= $2 ORDER BY date DESC`, userID, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var tasks []*model.DailyTask
	for rows.Next() {
		t, err := r.scanTask(rows)
		if err != nil {
			return nil, err
		}
		tasks = append(tasks, t)
	}
	return tasks, nil
}

func (r *TaskRepo) scanTask(row pgx.Row) (*model.DailyTask, error) {
	var t model.DailyTask
	err := row.Scan(&t.ID, &t.UserID, &t.PlanID, &t.Date, &t.Title, &t.Description, &t.Status, &t.CompletedAt, &t.SkippedReason, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainErr.New(domainErr.ErrNotFound, "task not found", nil)
		}
		return nil, domainErr.New(domainErr.ErrInternal, "failed to scan task", err)
	}
	return &t, nil
}
