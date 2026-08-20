package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// Decision is what the user did with a suggestion. It is the label half of a
// training pair: without it a sample records only what the model said, which
// teaches nothing about whether saying it was right.
type Decision string

const (
	// DecisionPending is the state a sample is born in. The generation is
	// recorded before the user has seen it, because the alternative — writing
	// the row only once a decision arrives — loses every sample from a user who
	// closes the app, which is exactly the population worth learning from.
	DecisionPending  Decision = "pending"
	DecisionAccepted Decision = "accepted"
	DecisionEdited   Decision = "edited"
	DecisionRejected Decision = "rejected"
)

// ValidDecision reports whether d is a decision a client may report. Pending is
// excluded on purpose: it is the initial state the server writes, not something
// a client can transition back to.
func ValidDecision(d Decision) bool {
	switch d {
	case DecisionAccepted, DecisionEdited, DecisionRejected:
		return true
	default:
		return false
	}
}

// TrainingSample is one generation kept for model improvement.
//
// Unlike Job, this record holds the real prompt and the real output. That is
// the whole reason it exists and the whole reason it is gated behind its own
// consent scope — see ScopeTrainingData.
type TrainingSample struct {
	ID            uuid.UUID
	JobID         uuid.UUID
	UserID        uuid.UUID
	Scope         ConsentScope
	Provider      *string
	Model         *string
	PromptContext string
	Output        json.RawMessage
	Decision      Decision
	// FinalOutput is set only for DecisionEdited: the version the user kept.
	// The difference between Output and FinalOutput is the strongest signal
	// this table collects.
	FinalOutput json.RawMessage
	DecidedAt   *time.Time
	CreatedAt   time.Time
}
