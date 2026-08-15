package alignment

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"
	goalRepo "github.com/masterfabric-go/masterfabric/internal/domain/goal/repository"
	"github.com/masterfabric-go/masterfabric/internal/domain/profile/model"
	profileRepo "github.com/masterfabric-go/masterfabric/internal/domain/profile/repository"
)

type Engine struct {
	tasks    goalRepo.TaskRepository
	checkins profileRepo.CheckinRepository
	goals    goalRepo.GoalRepository
	plans    goalRepo.PlanRepository
	align    profileRepo.AlignmentRepository
}

func NewEngine(
	tasks goalRepo.TaskRepository,
	checkins profileRepo.CheckinRepository,
	goals goalRepo.GoalRepository,
	plans goalRepo.PlanRepository,
	align profileRepo.AlignmentRepository,
) *Engine {
	return &Engine{tasks: tasks, checkins: checkins, goals: goals, plans: plans, align: align}
}

func (e *Engine) Recalculate(ctx context.Context, userID uuid.UUID, date time.Time) (*model.AlignmentSnapshot, error) {
	weekStart := date.AddDate(0, 0, -int(date.Weekday()))
	if date.Weekday() == time.Sunday {
		weekStart = date
	}

	tasks, _ := e.tasks.ListRecent(ctx, userID, weekStart)
	checkins, _ := e.checkins.ListSince(ctx, userID, weekStart)

	completed := 0
	total := len(tasks)
	for _, t := range tasks {
		if t.Status == "completed" {
			completed++
		}
	}
	taskScore := 0
	if total > 0 {
		taskScore = int(math.Round(float64(completed) / float64(total) * 25))
	}

	checkinScore := min(len(checkins)*5, 25)

	var goalID, planID *uuid.UUID
	goalProgress := 15
	if goal, err := e.goals.GetActiveByUserID(ctx, userID); err == nil {
		goalID = &goal.ID
		if goal.TargetDate != nil {
			totalDays := goal.TargetDate.Sub(goal.CreatedAt).Hours() / 24
			elapsed := date.Sub(goal.CreatedAt).Hours() / 24
			if totalDays > 0 {
				ratio := elapsed / totalDays
				goalProgress = int(math.Min(25, math.Round(ratio*25)))
			}
		}
	}
	if plan, err := e.plans.GetActiveByUserID(ctx, userID); err == nil {
		planID = &plan.ID
	}

	reflectionScore := 0
	for _, c := range checkins {
		if c.Reflection != "" {
			reflectionScore = 10
			break
		}
	}

	streak := consistencyStreak(checkins, date)
	consistencyScore := min(streak*4, 20)

	factors := []model.AlignmentFactor{
		{
			Type:         model.FactorTaskCompletion,
			Label:        "Görev tamamlama",
			Contribution: taskScore,
			Explanation:  fmt.Sprintf("%d/%d görev bu hafta tamamlandı", completed, total),
		},
		{
			Type:         model.FactorPlanReturn,
			Label:        "Plana dönüş",
			Contribution: checkinScore,
			Explanation:  fmt.Sprintf("%d check-in bu hafta", len(checkins)),
		},
		{
			Type:         model.FactorGoalProgress,
			Label:        "Hedef ilerlemesi",
			Contribution: goalProgress,
			Explanation:  "Hedef yolculuğundaki ilerlemen",
		},
		{
			Type:         model.FactorReflection,
			Label:        "Yansıma",
			Contribution: reflectionScore,
			Explanation:  "Bu hafta en az bir yansıma kaydettin",
		},
		{
			Type:         model.FactorConsistency,
			Label:        "Tutarlılık",
			Contribution: consistencyScore,
			Explanation:  fmt.Sprintf("%d günlük check-in serisi", streak),
		},
	}

	overall := 0
	for _, f := range factors {
		overall += f.Contribution
	}
	if overall > 100 {
		overall = 100
	}

	summary := "Küçük adımlarını sürdürüyorsun."
	if overall >= 75 {
		summary = "Güçlü bir hizalanma — devam et."
	} else if overall < 40 {
		summary = "Her gün küçük bir adım yeterli."
	}

	snapshot := &model.AlignmentSnapshot{
		UserID:             userID,
		Date:               date,
		OverallScore:       overall,
		Factors:            factors,
		SummaryExplanation: summary,
		GoalID:             goalID,
		PlanID:             planID,
	}

	if err := e.align.Upsert(ctx, snapshot); err != nil {
		return nil, err
	}
	return snapshot, nil
}

func consistencyStreak(checkins []*model.TodayEntry, today time.Time) int {
	if len(checkins) == 0 {
		return 0
	}
	dates := map[string]bool{}
	for _, c := range checkins {
		dates[c.Date.Format("2006-01-02")] = true
	}
	streak := 0
	for d := today; ; d = d.AddDate(0, 0, -1) {
		if dates[d.Format("2006-01-02")] {
			streak++
		} else {
			break
		}
	}
	return streak
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
