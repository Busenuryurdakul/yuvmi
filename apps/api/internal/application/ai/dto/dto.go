package dto

import (
	"encoding/json"
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

type ChatTurn struct {
	Role string `json:"role" validate:"required,oneof=user assistant"`
	Text string `json:"text" validate:"required,max=800"`
}

type CompanionChatRequest struct {
	Message string     `json:"message" validate:"required,min=1,max=500"`
	History []ChatTurn `json:"history" validate:"max=8,dive"`
}

type CompanionChatResponse struct {
	Reply         string    `json:"reply"`
	JobID         uuid.UUID `json:"jobId"`
	PlaybookID    string    `json:"playbookId,omitempty"`
	PlaybookTitle string    `json:"playbookTitle,omitempty"`
}

// RecordDecisionRequest reports what the user did with a suggestion.
//
// The endpoint is fire-and-forget from the client's side: it reports the
// decision without knowing whether the training scope is granted, and the
// server decides whether there is anything to label.
type RecordDecisionRequest struct {
	Decision string `json:"decision" validate:"required,oneof=accepted edited rejected"`

	// FinalOutput is the version the user kept. It is meaningful only with
	// decision "edited" and is ignored otherwise; RawMessage rather than a
	// typed shape because the payload differs per scope and this field is
	// stored, never interpreted.
	FinalOutput json.RawMessage `json:"finalOutput,omitempty"`
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
