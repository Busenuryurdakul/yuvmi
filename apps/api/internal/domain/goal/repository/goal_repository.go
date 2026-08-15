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
	Complete(ctx context.Context, userID, taskID uuid.UUID) error
	Skip(ctx context.Context, userID, taskID uuid.UUID, reason *string) error
	ListRecent(ctx context.Context, userID uuid.UUID, since time.Time) ([]*model.DailyTask, error)
}
