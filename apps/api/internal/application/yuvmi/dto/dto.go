package dto

import (
	"time"

	"github.com/google/uuid"
	fsmodel "github.com/masterfabric-go/masterfabric/internal/domain/futureself/model"
	goalmodel "github.com/masterfabric-go/masterfabric/internal/domain/goal/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/profile/model"
)

type UserProfileResponse struct {
	ID                 uuid.UUID `json:"id"`
	Email              string    `json:"email"`
	DisplayName        string    `json:"displayName"`
	AvatarURL          *string   `json:"avatarUrl,omitempty"`
	Locale             string    `json:"locale"`
	Timezone           string    `json:"timezone"`
	OnboardingComplete bool      `json:"onboardingComplete"`
	CreatedAt          time.Time `json:"createdAt"`
}

type UpdateProfileRequest struct {
	DisplayName *string `json:"displayName"`
	AvatarURL   *string `json:"avatarUrl"`
	Locale      *string `json:"locale" validate:"omitempty,len=2"`
	Timezone    *string `json:"timezone"`
}

type VisionItemInput struct {
	Domain    fsmodel.LifeDomain `json:"domain" validate:"required"`
	Title     string             `json:"title" validate:"required"`
	ImageURL  *string            `json:"imageUrl"`
	Note      *string            `json:"note"`
	SortOrder int                `json:"sortOrder"`
}

type CreateFutureSelfRequest struct {
	Title        string            `json:"title" validate:"required"`
	Description  string            `json:"description"`
	Domains      []fsmodel.LifeDomain `json:"domains" validate:"required,min=1"`
	Affirmations []string          `json:"affirmations"`
	VisionItems  []VisionItemInput `json:"visionItems"`
}

type FutureSelfResponse struct {
	ID           uuid.UUID              `json:"id"`
	Title        string                 `json:"title"`
	Description  string                 `json:"description"`
	Domains      []fsmodel.LifeDomain   `json:"domains"`
	Affirmations []string               `json:"affirmations"`
	VisionItems  []VisionItemResponse   `json:"visionItems"`
	Status       fsmodel.FutureSelfStatus `json:"status"`
	CreatedAt    time.Time              `json:"createdAt"`
	UpdatedAt    time.Time              `json:"updatedAt"`
}

type VisionItemResponse struct {
	ID        uuid.UUID          `json:"id"`
	Domain    fsmodel.LifeDomain `json:"domain"`
	Title     string             `json:"title"`
	ImageURL  *string            `json:"imageUrl,omitempty"`
	Note      *string            `json:"note,omitempty"`
	SortOrder int                `json:"sortOrder"`
}

type CreateGoalRequest struct {
	FutureSelfID *uuid.UUID `json:"futureSelfId"`
	Title        string     `json:"title" validate:"required"`
	Description  string     `json:"description"`
	TargetDate   *string    `json:"targetDate"`
}

type GoalResponse struct {
	ID           uuid.UUID           `json:"id"`
	FutureSelfID *uuid.UUID          `json:"futureSelfId,omitempty"`
	Title        string              `json:"title"`
	Description  string              `json:"description"`
	TargetDate   *string             `json:"targetDate,omitempty"`
	Status       goalmodel.GoalStatus `json:"status"`
	CreatedAt    time.Time           `json:"createdAt"`
}

type PlanStepInput struct {
	DayOffset   int    `json:"dayOffset"`
	Title       string `json:"title" validate:"required"`
	Description string `json:"description"`
	SortOrder   int    `json:"sortOrder"`
}

type CreatePlanRequest struct {
	GoalID      *uuid.UUID      `json:"goalId"`
	Title       string          `json:"title" validate:"required"`
	Description *string         `json:"description"`
	Steps       []PlanStepInput `json:"steps" validate:"required,min=1"`
}

type PlanResponse struct {
	ID          uuid.UUID            `json:"id"`
	GoalID      *uuid.UUID           `json:"goalId,omitempty"`
	Title       string               `json:"title"`
	Description *string              `json:"description,omitempty"`
	Status      goalmodel.PlanStatus `json:"status"`
	Version     int                  `json:"version"`
	Steps       []PlanStepResponse   `json:"steps"`
	CreatedAt   time.Time            `json:"createdAt"`
}

type PlanStepResponse struct {
	ID          uuid.UUID `json:"id"`
	DayOffset   int       `json:"dayOffset"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	SortOrder   int       `json:"sortOrder"`
}

type DailyTaskResponse struct {
	ID            uuid.UUID           `json:"id"`
	PlanID        uuid.UUID           `json:"planId"`
	Date          string              `json:"date"`
	Title         string              `json:"title"`
	Description   string              `json:"description"`
	Status        goalmodel.TaskStatus `json:"status"`
	CompletedAt   *time.Time          `json:"completedAt,omitempty"`
	SkippedReason *string             `json:"skippedReason,omitempty"`
}

type SkipTaskRequest struct {
	Reason *string `json:"reason"`
}

type UpsertCheckinRequest struct {
	Mood         int               `json:"mood" validate:"required,min=1,max=5"`
	Energy       int               `json:"energy" validate:"required,min=1,max=5"`
	Gratitude    []string          `json:"gratitude" validate:"max=3"`
	Reflection   string            `json:"reflection"`
	DomainScores map[fsmodel.LifeDomain]int `json:"domainScores"`
}

type CheckinResponse struct {
	ID           uuid.UUID                    `json:"id"`
	Date         string                       `json:"date"`
	Mood         int                          `json:"mood"`
	Energy       int                          `json:"energy"`
	Gratitude    []string                     `json:"gratitude"`
	Reflection   string                       `json:"reflection"`
	DomainScores map[fsmodel.LifeDomain]int   `json:"domainScores"`
	CreatedAt    time.Time                    `json:"createdAt"`
}

type AlignmentResponse struct {
	ID                 uuid.UUID              `json:"id"`
	Date               string                 `json:"date"`
	OverallScore       int                    `json:"overallScore"`
	Factors            []model.AlignmentFactor `json:"factors"`
	SummaryExplanation string                 `json:"summaryExplanation"`
	GoalID             *uuid.UUID             `json:"goalId,omitempty"`
	PlanID             *uuid.UUID             `json:"planId,omitempty"`
}

func FormatDate(t time.Time) string {
	return t.Format("2006-01-02")
}

func ParseDate(s string) (time.Time, error) {
	return time.Parse("2006-01-02", s)
}
