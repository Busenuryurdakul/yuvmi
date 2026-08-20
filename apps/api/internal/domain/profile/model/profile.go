package model

import (
	"time"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/futureself/model"
)

type UserProfile struct {
	UserID              uuid.UUID
	DisplayName         string
	AvatarURL           *string
	Locale              string
	Timezone            string
	OnboardingComplete  bool
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

type TodayEntry struct {
	ID           uuid.UUID
	UserID       uuid.UUID
	Date         time.Time
	Mood         int
	Energy       int
	Gratitude    []string
	Reflection   string
	DomainScores map[model.LifeDomain]int
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type AlignmentFactorType string

const (
	FactorTaskCompletion AlignmentFactorType = "task_completion"
	FactorPlanReturn     AlignmentFactorType = "plan_return"
	FactorGoalProgress   AlignmentFactorType = "goal_progress"
	FactorReflection     AlignmentFactorType = "reflection"
	FactorConsistency    AlignmentFactorType = "consistency"
)

type AlignmentFactor struct {
	Type          AlignmentFactorType `json:"type"`
	Label         string              `json:"label"`
	Contribution  int                 `json:"contribution"`
	Explanation   string              `json:"explanation"`
}

type AlignmentSnapshot struct {
	ID                 uuid.UUID
	UserID             uuid.UUID
	Date               time.Time
	OverallScore       int
	Factors            []AlignmentFactor
	SummaryExplanation string
	GoalID             *uuid.UUID
	PlanID             *uuid.UUID
	CreatedAt          time.Time
}
