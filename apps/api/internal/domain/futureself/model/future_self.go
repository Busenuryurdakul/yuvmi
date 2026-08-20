package model

import (
	"time"

	"github.com/google/uuid"
)

type LifeDomain string

const (
	DomainCareer          LifeDomain = "career"
	DomainRelationships   LifeDomain = "relationships"
	DomainHealth          LifeDomain = "health"
	DomainFinance         LifeDomain = "finance"
	DomainPersonalGrowth  LifeDomain = "personal_growth"
	DomainCreativity      LifeDomain = "creativity"
	DomainPeace           LifeDomain = "peace"
	DomainLearning        LifeDomain = "learning"
	DomainFreedom         LifeDomain = "freedom" // legacy
)

type FutureSelfStatus string

const (
	FutureSelfDraft    FutureSelfStatus = "draft"
	FutureSelfApproved FutureSelfStatus = "approved"
)

type FutureSelf struct {
	ID           uuid.UUID
	UserID       uuid.UUID
	Title        string
	Description  string
	Domains      []LifeDomain
	Affirmations []string
	Status       FutureSelfStatus
	VisionItems  []VisionItem
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type VisionItem struct {
	ID           uuid.UUID
	FutureSelfID uuid.UUID
	Domain       LifeDomain
	Title        string
	ImageURL     *string
	Note         *string
	SortOrder    int
}
