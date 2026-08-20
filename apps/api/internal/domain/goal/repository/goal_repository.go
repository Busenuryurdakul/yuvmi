package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/goal/model"
)

type GoalRepository interface {
	Create(ctx context.Context, goal *model.Goal) error
	GetActiveByUserID(ctx context.Context, userID uuid.UUID) (*model.Goal, error)
	GetLatestByUserID(ctx context.Context, userID uuid.UUID) (*model.Goal, error)
	GetByID(ctx context.Context, userID, goalID uuid.UUID) (*model.Goal, error)
	Update(ctx context.Context, goal *model.Goal) error
	Activate(ctx context.Context, userID, goalID uuid.UUID) error
	CountByUserID(ctx context.Context, userID uuid.UUID) (int, error)
}

type PlanRepository interface {
	Create(ctx context.Context, plan *model.Plan) error
	GetActiveByUserID(ctx context.Context, userID uuid.UUID) (*model.Plan, error)
	GetByID(ctx context.Context, userID, planID uuid.UUID) (*model.Plan, error)
	ListByUserID(ctx context.Context, userID uuid.UUID) ([]*model.Plan, error)
	GetMaxVersion(ctx context.Context, userID uuid.UUID, goalID *uuid.UUID) (int, error)
	Activate(ctx context.Context, userID, planID uuid.UUID) error
	SupersedeOthers(ctx context.Context, userID, planID uuid.UUID) error
	// ActivatePlanTx atomically supersedes the user's other active plans,
	// activates planID, creates its day-one task, and (when goalID is set)
	// activates the linked goal — all in one transaction, so a mid-flight
	// failure can't leave the user with an active plan but no task, or a
	// task with no active goal behind it.
	ActivatePlanTx(ctx context.Context, userID, planID uuid.UUID, goalID *uuid.UUID, task *model.DailyTask) error
}

type WeeklyReviewRepository interface {
	GetByWeek(ctx context.Context, userID uuid.UUID, weekStart time.Time) (*model.WeeklyReview, error)
	List(ctx context.Context, userID uuid.UUID, limit int) ([]*model.WeeklyReview, error)
	Create(ctx context.Context, review *model.WeeklyReview) error
	Update(ctx context.Context, review *model.WeeklyReview) error
}

type TaskRepository interface {
	Create(ctx context.Context, task *model.DailyTask) error
	GetByDate(ctx context.Context, userID uuid.UUID, date time.Time) (*model.DailyTask, error)
	GetByID(ctx context.Context, userID, taskID uuid.UUID) (*model.DailyTask, error)
	// Complete marks the task completed and reports whether it performed a
	// genuine pending->completed transition (false if already completed/skipped).
	Complete(ctx context.Context, userID, taskID uuid.UUID) (bool, error)
	Skip(ctx context.Context, userID, taskID uuid.UUID, reason *string) error
	ListRecent(ctx context.Context, userID uuid.UUID, since time.Time) ([]*model.DailyTask, error)
}
