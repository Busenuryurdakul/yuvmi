package model

import (
	"time"

	"github.com/google/uuid"
)

const (
	SourceWebLanding = "web_landing"
	LocaleTR         = "tr"
)

// Signup represents a waitlist registration.
type Signup struct {
	ID                   uuid.UUID
	EmailNormalized      string
	Source               string
	Locale               string
	ConsentAt            time.Time
	PrivacyPolicyVersion string
	CreatedAt            time.Time
}
