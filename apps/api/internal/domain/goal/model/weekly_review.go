package model

import (
	"time"

	"github.com/google/uuid"
)

type WeeklyReviewStatus string

const (
	WeeklyReviewPending    WeeklyReviewStatus = "pending"
	WeeklyReviewGenerating WeeklyReviewStatus = "generating"
	WeeklyReviewReady      WeeklyReviewStatus = "ready"
	WeeklyReviewApplied    WeeklyReviewStatus = "applied"
)

type WeeklyReviewMetrics struct {
	CheckinCount   int     `json:"checkinCount"`
	TaskCompleted  int     `json:"taskCompleted"`
	TaskSkipped    int     `json:"taskSkipped"`
	AvgMood        float64 `json:"avgMood"`
	AvgEnergy      float64 `json:"avgEnergy"`
	AvgAlignment   float64 `json:"avgAlignment"`
	DaysActive     int     `json:"daysActive"`
}

type WeeklyReview struct {
	ID              uuid.UUID
	UserID          uuid.UUID
	PlanID          uuid.UUID
	WeekStartDate   time.Time
	Summary         string
	Adaptations     []string
	Metrics         WeeklyReviewMetrics
	Reflection      string
	NextPlanVersion *int
	Status          WeeklyReviewStatus
	CreatedAt       time.Time
	UpdatedAt       time.Time
}
