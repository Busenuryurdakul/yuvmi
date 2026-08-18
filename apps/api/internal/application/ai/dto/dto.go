package dto

import (
	"time"

	"github.com/google/uuid"
	aimodel "github.com/masterfabric-go/masterfabric/internal/domain/ai/model"
)

type ConsentResponse struct {
	Scope     aimodel.ConsentScope `json:"scope"`
	Granted   bool                 `json:"granted"`
	GrantedAt *time.Time           `json:"grantedAt,omitempty"`
	RevokedAt *time.Time           `json:"revokedAt,omitempty"`
}

type UpdateConsentRequest struct {
	// Pointer so an omitted field is rejected as a validation error rather
	// than silently revoking consent by defaulting to false.
	Granted *bool `json:"granted" validate:"required"`
}

// A successful response always carries model output. When the API cannot serve
// suggestions — no consent, quota spent, provider down — it returns an error
// status and the client renders its own static list (buildSuggestions /
// getRecommendedPlanTemplates). The fallback content lives in the mobile app
// only, so there is never a second copy to keep in sync.
type GoalSuggestionsResponse struct {
	Suggestions []string  `json:"suggestions"`
	JobID       uuid.UUID `json:"jobId"`
}

type PlanStepSuggestion struct {
	DayOffset   int    `json:"dayOffset"`
	Title       string `json:"title"`
	Description string `json:"description"`
}

type PlanTemplateSuggestion struct {
	Title       string               `json:"title"`
	Description string               `json:"description"`
	Steps       []PlanStepSuggestion `json:"steps"`
}

type PlanSuggestionsResponse struct {
	Templates []PlanTemplateSuggestion `json:"templates"`
	JobID     uuid.UUID                `json:"jobId"`
}

// AIJobResponse exposes accounting and status only. InputHash and prompt
// content are deliberately absent — the client has no use for them and they
// are the fields most likely to carry a trace of what the user wrote.
type AIJobResponse struct {
	ID          uuid.UUID            `json:"id"`
	Scope       aimodel.ConsentScope `json:"scope"`
	Status      aimodel.JobStatus    `json:"status"`
	ErrorCode   *string              `json:"errorCode,omitempty"`
	TokensUsed  *int                 `json:"tokensUsed,omitempty"`
	LatencyMs   *int                 `json:"latencyMs,omitempty"`
	CreatedAt   time.Time            `json:"createdAt"`
	CompletedAt *time.Time           `json:"completedAt,omitempty"`
}
