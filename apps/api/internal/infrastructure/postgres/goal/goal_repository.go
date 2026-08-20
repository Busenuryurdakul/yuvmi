package goal

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/domain/goal/model"
)

// querier is satisfied by both *pgxpool.Pool and pgx.Tx, so these
// repositories can run either against the pool directly or against a
// caller-supplied transaction (see PlanRepo.ActivatePlanTx).
type querier interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Begin(ctx context.Context) (pgx.Tx, error)
}

type GoalRepo struct{ db querier }

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

func (r *GoalRepo) GetLatestByUserID(ctx context.Context, userID uuid.UUID) (*model.Goal, error) {
	return r.scanGoal(r.db.QueryRow(ctx, `
		SELECT id, user_id, future_self_id, title, description, target_date, status, created_at, updated_at
		FROM goals WHERE user_id=$1 AND status != 'archived' ORDER BY updated_at DESC, created_at DESC LIMIT 1`, userID))
}

func (r *GoalRepo) Update(ctx context.Context, goal *model.Goal) error {
	goal.UpdatedAt = time.Now().UTC()
	tag, err := r.db.Exec(ctx, `
		UPDATE goals SET future_self_id=$1, title=$2, description=$3, target_date=$4, updated_at=$5
		WHERE id=$6 AND user_id=$7 AND status != 'archived'`,
		goal.FutureSelfID, goal.Title, goal.Description, goal.TargetDate, goal.UpdatedAt, goal.ID, goal.UserID)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to update goal", err)
	}
	if tag.RowsAffected() == 0 {
		return domainErr.New(domainErr.ErrNotFound, "goal not found", nil)
	}
	return nil
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
	if _, err := tx.Exec(ctx, `UPDATE goals SET status='archived', updated_at=NOW() WHERE user_id=$1 AND status='active'`, userID); err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to archive active goals", err)
	}
	tag, err := tx.Exec(ctx, `UPDATE goals SET status='active', updated_at=NOW() WHERE id=$1 AND user_id=$2`, goalID, userID)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to activate goal", err)
	}
	if tag.RowsAffected() == 0 {
		return domainErr.New(domainErr.ErrNotFound, "goal not found", nil)
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

type PlanRepo struct{ db querier }

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
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to activate plan", err)
	}
	if tag.RowsAffected() == 0 {
		return domainErr.New(domainErr.ErrNotFound, "plan not found", nil)
	}
	return nil
}

func (r *PlanRepo) SupersedeOthers(ctx context.Context, userID, planID uuid.UUID) error {
	_, err := r.db.Exec(ctx, `
		UPDATE plans SET status='superseded', updated_at=NOW()
		WHERE user_id=$1 AND id<>$2 AND status='active'`, userID, planID)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to supersede plans", err)
	}
	return nil
}

// ActivatePlanTx runs plan activation and its correlated writes — superseding
// the user's other active plans, activating planID, creating its day-one
// task, and (when goalID is set) activating the linked goal — inside a
// single transaction. Without this, a mid-flight failure (e.g. the task
// insert) could leave the plan active with no daily task, or a goal
// activated with no active plan behind it, stranding the user mid-onboarding.
func (r *PlanRepo) ActivatePlanTx(ctx context.Context, userID, planID uuid.UUID, goalID *uuid.UUID, task *model.DailyTask) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to begin tx", err)
	}
	defer tx.Rollback(ctx)

	txPlans := &PlanRepo{db: tx}
	if err := txPlans.SupersedeOthers(ctx, userID, planID); err != nil {
		return fmt.Errorf("supersede plans: %w", err)
	}
	if err := txPlans.Activate(ctx, userID, planID); err != nil {
		return fmt.Errorf("activate plan: %w", err)
	}

	txTasks := &TaskRepo{db: tx}
	if err := txTasks.Create(ctx, task); err != nil {
		return fmt.Errorf("create daily task: %w", err)
	}

	if goalID != nil {
		txGoals := &GoalRepo{db: tx}
		if err := txGoals.Activate(ctx, userID, *goalID); err != nil {
			return fmt.Errorf("activate goal: %w", err)
		}
	}

	return tx.Commit(ctx)
}

// ListByUserID fetches every plan for the user together with its steps in a
// single JOIN query, instead of one attachSteps round-trip per plan (N+1)
// run while the outer plans cursor was still open.
func (r *PlanRepo) ListByUserID(ctx context.Context, userID uuid.UUID) ([]*model.Plan, error) {
	rows, err := r.db.Query(ctx, `
		SELECT p.id, p.user_id, p.goal_id, p.title, p.description, p.status, p.version, p.created_at, p.updated_at,
		       s.id, s.day_offset, s.title, s.description, s.sort_order
		FROM plans p
		LEFT JOIN plan_steps s ON s.plan_id = p.id
		WHERE p.user_id=$1
		ORDER BY p.version DESC, p.created_at DESC, s.day_offset, s.sort_order`, userID)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to list plans", err)
	}
	defer rows.Close()

	var plans []*model.Plan
	byID := make(map[uuid.UUID]*model.Plan)
	for rows.Next() {
		var p model.Plan
		var stepID *uuid.UUID
		var dayOffset, sortOrder *int
		var stepTitle, stepDesc *string
		if err := rows.Scan(
			&p.ID, &p.UserID, &p.GoalID, &p.Title, &p.Description, &p.Status, &p.Version, &p.CreatedAt, &p.UpdatedAt,
			&stepID, &dayOffset, &stepTitle, &stepDesc, &sortOrder,
		); err != nil {
			return nil, domainErr.New(domainErr.ErrInternal, "failed to scan plan", err)
		}

		plan, ok := byID[p.ID]
		if !ok {
			plan = &p
			byID[p.ID] = plan
			plans = append(plans, plan)
		}
		if stepID != nil {
			plan.Steps = append(plan.Steps, model.PlanStep{
				ID:          *stepID,
				PlanID:      plan.ID,
				DayOffset:   *dayOffset,
				Title:       *stepTitle,
				Description: *stepDesc,
				SortOrder:   *sortOrder,
			})
		}
	}
	if err := rows.Err(); err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to list plans", err)
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
	if err := rows.Err(); err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to iterate plan steps", err)
	}
	return plan, nil
}

type TaskRepo struct{ db querier }

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

func (r *TaskRepo) Complete(ctx context.Context, userID, taskID uuid.UUID) (bool, error) {
	tag, err := r.db.Exec(ctx, `
		UPDATE daily_tasks SET status='completed', completed_at=NOW(), updated_at=NOW()
		WHERE id=$1 AND user_id=$2 AND status='pending'`, taskID, userID)
	if err != nil {
		return false, domainErr.New(domainErr.ErrInternal, "failed to complete task", err)
	}
	if tag.RowsAffected() > 0 {
		return true, nil
	}
	// Idempotent: already completed or skipped — treat as success, no transition.
	var status string
	err = r.db.QueryRow(ctx, `SELECT status FROM daily_tasks WHERE id=$1 AND user_id=$2`, taskID, userID).Scan(&status)
	if err != nil {
		return false, domainErr.New(domainErr.ErrNotFound, "task not found", err)
	}
	if status == "completed" || status == "skipped" {
		return false, nil
	}
	return false, domainErr.New(domainErr.ErrNotFound, "task not found", nil)
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
	if err := rows.Err(); err != nil {
		return nil, err
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
