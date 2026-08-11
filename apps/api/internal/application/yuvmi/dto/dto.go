package dto

import (
	"encoding/json"
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

type WeeklyReviewMetricsResponse struct {
	CheckinCount  int     `json:"checkinCount"`
	TaskCompleted int     `json:"taskCompleted"`
	TaskSkipped   int     `json:"taskSkipped"`
	AvgMood       float64 `json:"avgMood"`
	AvgEnergy     float64 `json:"avgEnergy"`
	AvgAlignment  float64 `json:"avgAlignment"`
	DaysActive    int     `json:"daysActive"`
}

type WeeklyReviewResponse struct {
	ID              uuid.UUID                   `json:"id"`
	PlanID          uuid.UUID                   `json:"planId"`
	WeekStartDate   string                      `json:"weekStartDate"`
	Summary         string                      `json:"summary"`
	Adaptations     []string                    `json:"adaptations"`
	Metrics         WeeklyReviewMetricsResponse `json:"metrics"`
	Reflection      string                      `json:"reflection"`
	NextPlanVersion *int                        `json:"nextPlanVersion,omitempty"`
	Status          goalmodel.WeeklyReviewStatus `json:"status"`
	CreatedAt       time.Time                   `json:"createdAt"`
}

type UpdateWeeklyReviewRequest struct {
	Reflection *string `json:"reflection"`
}

type RevisePlanRequest struct {
	BasePlanID  uuid.UUID       `json:"basePlanId" validate:"required"`
	Title       *string         `json:"title"`
	Description *string         `json:"description"`
	Steps       []PlanStepInput `json:"steps"`
	Activate    bool            `json:"activate"`
}

type PlanDiffResponse struct {
	FromPlanID uuid.UUID          `json:"fromPlanId"`
	ToPlanID   uuid.UUID          `json:"toPlanId"`
	FromVersion int               `json:"fromVersion"`
	ToVersion   int               `json:"toVersion"`
	Added       []PlanStepResponse `json:"added"`
	Removed     []PlanStepResponse `json:"removed"`
	Changed     []PlanStepResponse `json:"changed"`
}

type RegisterPushTokenRequest struct {
	Token    string `json:"token" validate:"required"`
	Platform string `json:"platform"`
}

type NotificationResponse struct {
	ID        uuid.UUID         `json:"id"`
	Title     string            `json:"title"`
	Body      string            `json:"body"`
	Type      string            `json:"type"`
	Data      map[string]string `json:"data"`
	ReadAt    *time.Time        `json:"readAt,omitempty"`
	CreatedAt time.Time         `json:"createdAt"`
}

type UnreadCountResponse struct {
	Count int `json:"count"`
}

type CreateSpaceRequest struct {
	Type string `json:"type" validate:"required,oneof=couple friends family"`
	Name string `json:"name"`
}

type CreateSpaceInviteRequest struct {
	InviteeEmail string  `json:"inviteeEmail" validate:"required,email"`
	Role         *string `json:"role" validate:"omitempty,oneof=member viewer"`
}

type SpaceMemberResponse struct {
	UserID      uuid.UUID  `json:"userId"`
	DisplayName string     `json:"displayName"`
	Email       string     `json:"email"`
	Role        string     `json:"role"`
	Status      string     `json:"status"`
	JoinedAt    *time.Time `json:"joinedAt,omitempty"`
}

type SpaceInviteResponse struct {
	ID           uuid.UUID `json:"id"`
	SpaceID      uuid.UUID `json:"spaceId"`
	InviteeEmail string    `json:"inviteeEmail"`
	Role         string    `json:"role"`
	Status       string    `json:"status"`
	ExpiresAt    time.Time `json:"expiresAt"`
	CreatedAt    time.Time `json:"createdAt"`
}

type PendingSpaceInviteResponse struct {
	ID          uuid.UUID `json:"id"`
	SpaceID     uuid.UUID `json:"spaceId"`
	SpaceName   string    `json:"spaceName"`
	SpaceType   string    `json:"spaceType"`
	InviterName string    `json:"inviterName"`
	Role        string    `json:"role"`
	ExpiresAt   time.Time `json:"expiresAt"`
	CreatedAt   time.Time `json:"createdAt"`
}

type SpaceResponse struct {
	ID             uuid.UUID             `json:"id"`
	Type           string                `json:"type"`
	Name           string                `json:"name"`
	OwnerID        uuid.UUID             `json:"ownerId"`
	Status         string                `json:"status"`
	Features       []string              `json:"features"`
	MyRole         string                `json:"myRole,omitempty"`
	Members        []SpaceMemberResponse `json:"members"`
	PendingInvites []SpaceInviteResponse `json:"pendingInvites,omitempty"`
	CreatedAt      time.Time             `json:"createdAt"`
	UpdatedAt      time.Time             `json:"updatedAt"`
}

type ShareAssetRequest struct {
	Visibility string      `json:"visibility" validate:"required,oneof=private space_members specific_members"`
	SpaceID    *uuid.UUID  `json:"spaceId"`
	GranteeIds []uuid.UUID `json:"granteeIds"`
}

type AssetResponse struct {
	ID                  uuid.UUID   `json:"id"`
	OwnerID             uuid.UUID   `json:"ownerId"`
	SpaceID             *uuid.UUID  `json:"spaceId,omitempty"`
	Type                string      `json:"type"`
	Title               string      `json:"title"`
	MimeType            string      `json:"mimeType"`
	FileSize            int64       `json:"fileSize"`
	URL                 string      `json:"url,omitempty"`
	Visibility          string      `json:"visibility"`
	RevokedFromSpaceAt  *time.Time  `json:"revokedFromSpaceAt,omitempty"`
	GranteeIds          []uuid.UUID `json:"granteeIds,omitempty"`
	IsOwner             bool        `json:"isOwner"`
	AIProcessingAllowed bool        `json:"aiProcessingAllowed"`
	CreatedAt           time.Time   `json:"createdAt"`
	UpdatedAt           time.Time   `json:"updatedAt"`
}

type PremiumLimitsResponse struct {
	MaxGoals   int  `json:"maxGoals"`
	MaxSpaces  int  `json:"maxSpaces"`
	DataExport bool `json:"dataExport"`
}

type PremiumUsageResponse struct {
	Goals  int `json:"goals"`
	Spaces int `json:"spaces"`
}

type SubscriptionResponse struct {
	Tier             string                `json:"tier"`
	Status           string                `json:"status"`
	Limits           PremiumLimitsResponse `json:"limits"`
	Usage            PremiumUsageResponse  `json:"usage"`
	Provider         *string               `json:"provider,omitempty"`
	CurrentPeriodEnd *string               `json:"currentPeriodEnd,omitempty"`
}

type DataExportResponse struct {
	Filename string          `json:"filename"`
	MimeType string          `json:"mimeType"`
	Data     json.RawMessage `json:"data"`
}

func FormatDate(t time.Time) string {
	return t.Format("2006-01-02")
}

func ParseDate(s string) (time.Time, error) {
	return time.Parse("2006-01-02", s)
}
