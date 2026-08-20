package model

import (
	"time"

	"github.com/google/uuid"
)

// ConsentScope names a single, separately revocable permission to send the
// user's data to an AI provider. Scopes are deliberately narrow: granting
// plan generation must not imply permission to read daily reflections.
type ConsentScope string

const (
	ScopeProfileGeneration ConsentScope = "ai_profile_generation"
	ScopePlanGeneration    ConsentScope = "ai_plan_generation"
	ScopeDailyTask         ConsentScope = "ai_daily_task"
	ScopeWeeklyReview      ConsentScope = "ai_weekly_review"
	ScopeSharedSpace       ConsentScope = "ai_shared_space"
	ScopeCompanion         ConsentScope = "ai_companion"
	ScopeDataExport        ConsentScope = "data_export"

	// ScopeTrainingData permits keeping a suggestion and the user's reaction to
	// it so the model can be improved later. It is separate from the scopes
	// above because it is a different purpose, not a different feature: those
	// permit sending data to produce an answer the user asked for, this one
	// permits retaining that exchange after the answer has been delivered.
	// Granting plan generation must not silently enrol someone in a corpus.
	ScopeTrainingData ConsentScope = "ai_training_data"
)

// AllScopes is the canonical scope list. GET /consents returns a row for every
// entry so the settings screen can render toggles without hardcoding the set.
func AllScopes() []ConsentScope {
	return []ConsentScope{
		ScopeProfileGeneration,
		ScopePlanGeneration,
		ScopeDailyTask,
		ScopeWeeklyReview,
		ScopeSharedSpace,
		ScopeCompanion,
		ScopeDataExport,
		ScopeTrainingData,
	}
}

// Valid reports whether s is a scope the system knows about. Unknown scopes are
// rejected rather than stored, so a typo in a client can never create a consent
// row that no code path will ever check.
func (s ConsentScope) Valid() bool {
	for _, known := range AllScopes() {
		if s == known {
			return true
		}
	}
	return false
}

// Consent records one user's decision about one scope. Revoking flips Granted
// to false rather than deleting the row: KVKK/GDPR require an audit trail of
// when permission was given and withdrawn.
type Consent struct {
	ID           uuid.UUID
	UserID       uuid.UUID
	Scope        ConsentScope
	Granted      bool
	ResourceType *string
	ResourceID   *uuid.UUID
	GrantedAt    *time.Time
	RevokedAt    *time.Time
	CreatedAt    time.Time
	UpdatedAt    time.Time
}
