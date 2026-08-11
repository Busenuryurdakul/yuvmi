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
	GetByID(ctx context.Context, userID, goalID uuid.UUID) (*model.Goal, error)
	Activate(ctx context.Context, userID, goalID uuid.UUID) error
}

type PlanRepository interface {
	Create(ctx context.Context, plan *model.Plan) error
	GetActiveByUserID(ctx context.Context, userID uuid.UUID) (*model.Plan, error)
	GetByID(ctx context.Context, userID, planID uuid.UUID) (*model.Plan, error)
	Activate(ctx context.Context, userID, planID uuid.UUID) error
	SupersedeOthers(ctx context.Context, userID, planID uuid.UUID) error
}

type TaskRepository interface {
	Create(ctx context.Context, task *model.DailyTask) error
	GetByDate(ctx context.Context, userID uuid.UUID, date time.Time) (*model.DailyTask, error)
	GetByID(ctx context.Context, userID, taskID uuid.UUID) (*model.DailyTask, error)
	Complete(ctx context.Context, userID, taskID uuid.UUID) error
	Skip(ctx context.Context, userID, taskID uuid.UUID, reason *string) error
	ListRecent(ctx context.Context, userID uuid.UUID, since time.Time) ([]*model.DailyTask, error)
}
