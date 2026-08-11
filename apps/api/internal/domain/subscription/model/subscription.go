package model

import (
	"time"

	"github.com/google/uuid"
)

type SubscriptionTier string

const (
	TierFree    SubscriptionTier = "free"
	TierPremium SubscriptionTier = "premium"
)

type SubscriptionStatus string

const (
	StatusActive    SubscriptionStatus = "active"
	StatusCancelled SubscriptionStatus = "cancelled"
	StatusPastDue   SubscriptionStatus = "past_due"
)

type SubscriptionProvider string

const (
	ProviderStripe SubscriptionProvider = "stripe"
	ProviderIyzico SubscriptionProvider = "iyzico"
	ProviderDev    SubscriptionProvider = "dev"
)

// Subscription tracks a user's plan tier and billing provider metadata.
type Subscription struct {
	ID                     uuid.UUID
	UserID                 uuid.UUID
	Tier                   SubscriptionTier
	Status                 SubscriptionStatus
	Provider               *SubscriptionProvider
	ProviderSubscriptionID *string
	CurrentPeriodEnd       *time.Time
	CreatedAt              time.Time
	UpdatedAt              time.Time
}

func (s *Subscription) IsPremiumActive() bool {
	if s.Tier != TierPremium {
		return false
	}
	if s.Status == StatusPastDue {
		return false
	}
	if s.CurrentPeriodEnd != nil && time.Now().UTC().After(*s.CurrentPeriodEnd) {
		return false
	}
	return s.Status == StatusActive || s.Status == StatusCancelled
}
