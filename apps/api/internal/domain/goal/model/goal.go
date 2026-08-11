package model

import (
	"time"

	"github.com/google/uuid"
)

type GoalStatus string

const (
	GoalDraft     GoalStatus = "draft"
	GoalActive    GoalStatus = "active"
	GoalCompleted GoalStatus = "completed"
	GoalPaused    GoalStatus = "paused"
	GoalArchived  GoalStatus = "archived"
)

type Goal struct {
	ID           uuid.UUID
	UserID       uuid.UUID
	FutureSelfID *uuid.UUID
	Title        string
	Description  string
	TargetDate   *time.Time
	Status       GoalStatus
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type PlanStatus string

const (
	PlanDraft      PlanStatus = "draft"
	PlanActive     PlanStatus = "active"
	PlanCompleted  PlanStatus = "completed"
	PlanSuperseded PlanStatus = "superseded"
)

type Plan struct {
	ID          uuid.UUID
	UserID      uuid.UUID
	GoalID      *uuid.UUID
	Title       string
	Description *string
	Status      PlanStatus
	Version     int
	Steps       []PlanStep
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type PlanStep struct {
	ID          uuid.UUID
	PlanID      uuid.UUID
	DayOffset   int
	Title       string
	Description string
	SortOrder   int
}

type TaskStatus string

const (
	TaskPending    TaskStatus = "pending"
	TaskInProgress TaskStatus = "in_progress"
	TaskCompleted  TaskStatus = "completed"
	TaskSkipped    TaskStatus = "skipped"
)

type DailyTask struct {
	ID            uuid.UUID
	UserID        uuid.UUID
	PlanID        uuid.UUID
	Date          time.Time
	Title         string
	Description   string
	Status        TaskStatus
	CompletedAt   *time.Time
	SkippedReason *string
	CreatedAt     time.Time
	UpdatedAt     time.Time
}
