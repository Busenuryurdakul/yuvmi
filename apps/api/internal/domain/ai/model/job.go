package model

import (
	"time"

	"github.com/google/uuid"
)

type JobStatus string

const (
	JobQueued    JobStatus = "queued"
	JobRunning   JobStatus = "running"
	JobCompleted JobStatus = "completed"
	JobFailed    JobStatus = "failed"
	JobCancelled JobStatus = "cancelled"
)

// Error codes surfaced to the client. They are stable identifiers the mobile
// app maps to copy — never raw provider errors, which can echo prompt content.
const (
	ErrCodeConsentDenied = "consent_denied"
	ErrCodeRateLimited   = "rate_limited"
	ErrCodeProvider      = "provider_error"
	ErrCodeInvalidOutput = "invalid_output"
	ErrCodeTimeout       = "timeout"
)

// Job is the audit record for one AI generation. It holds accounting and
// diagnostics only: InputHash is a fingerprint of the prompt context rather
// than the context itself, so the table can be read freely during debugging
// without exposing what a user wrote about their life.
type Job struct {
	ID                 uuid.UUID
	UserID             uuid.UUID
	Scope              ConsentScope
	Status             JobStatus
	InputHash          string
	OutputResourceType *string
	OutputResourceID   *uuid.UUID
	ErrorCode          *string
	TokensUsed         *int
	LatencyMs          *int
	Provider           *string
	CreatedAt          time.Time
	CompletedAt        *time.Time
}
