package usecase

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/application/yuvmi/dto"
	goalmodel "github.com/masterfabric-go/masterfabric/internal/domain/goal/model"
	profilemodel "github.com/masterfabric-go/masterfabric/internal/domain/profile/model"
	infraNotify "github.com/masterfabric-go/masterfabric/internal/infrastructure/notification"
)

func weekStartUTC(t time.Time) time.Time {
	t = t.UTC()
	weekday := int(t.Weekday())
	if weekday == 0 {
		weekday = 7
	}
	return time.Date(t.Year(), t.Month(), t.Day()-(weekday-1), 0, 0, 0, 0, time.UTC)
}

func (s *Service) GetOrCreateCurrentWeeklyReview(ctx context.Context, userID uuid.UUID) (*dto.WeeklyReviewResponse, error) {
	plan, err := s.plans.GetActiveByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	weekStart := weekStartUTC(time.Now())
	if existing, err := s.reviews.GetByWeek(ctx, userID, weekStart); err == nil {
		return toWeeklyReviewResponse(existing), nil
	}

	since := weekStart.AddDate(0, 0, -6)
	metrics, daysActive, err := s.aggregateWeekMetrics(ctx, userID, since)
	if err != nil {
		return nil, err
	}

	if daysActive < 7 && time.Since(plan.CreatedAt).Hours()/24 < 7 {
		return nil, domainErr.New(domainErr.ErrNotFound, "weekly review not ready yet", nil)
	}

	nextVersion := plan.Version + 1
	summary, adaptations := buildWeeklySummary(metrics, plan.Version)

	review := &goalmodel.WeeklyReview{
		UserID: userID, PlanID: plan.ID, WeekStartDate: weekStart,
		Summary: summary, Adaptations: adaptations, Metrics: metrics,
		NextPlanVersion: &nextVersion, Status: goalmodel.WeeklyReviewReady,
	}
	if err := s.reviews.Create(ctx, review); err != nil {
		return nil, err
	}

	_ = s.notifyUser(ctx, userID, "Haftalık değerlendirme hazır",
		"Bu haftanın özetini ve plan önerilerini incele.", "weekly_review",
		map[string]string{"reviewId": review.ID.String()})

	return toWeeklyReviewResponse(review), nil
}

func (s *Service) ListWeeklyReviews(ctx context.Context, userID uuid.UUID) ([]dto.WeeklyReviewResponse, error) {
	reviews, err := s.reviews.List(ctx, userID, 12)
	if err != nil {
		return nil, err
	}
	out := make([]dto.WeeklyReviewResponse, len(reviews))
	for i, r := range reviews {
		out[i] = *toWeeklyReviewResponse(r)
	}
	return out, nil
}

func (s *Service) UpdateWeeklyReview(ctx context.Context, userID, reviewID uuid.UUID, req dto.UpdateWeeklyReviewRequest) (*dto.WeeklyReviewResponse, error) {
	reviews, err := s.reviews.List(ctx, userID, 50)
	if err != nil {
		return nil, err
	}
	var review *goalmodel.WeeklyReview
	for _, r := range reviews {
		if r.ID == reviewID {
			review = r
			break
		}
	}
	if review == nil {
		return nil, domainErr.New(domainErr.ErrNotFound, "weekly review not found", nil)
	}
	if req.Reflection != nil {
		review.Reflection = *req.Reflection
	}
	if err := s.reviews.Update(ctx, review); err != nil {
		return nil, err
	}
	return toWeeklyReviewResponse(review), nil
}

func (s *Service) ApplyWeeklyReview(ctx context.Context, userID, reviewID uuid.UUID) (*dto.PlanResponse, error) {
	reviews, err := s.reviews.List(ctx, userID, 50)
	if err != nil {
		return nil, err
	}
	var review *goalmodel.WeeklyReview
	for _, r := range reviews {
		if r.ID == reviewID {
			review = r
			break
		}
	}
	if review == nil {
		return nil, domainErr.New(domainErr.ErrNotFound, "weekly review not found", nil)
	}
	if review.Status == goalmodel.WeeklyReviewApplied {
		return nil, domainErr.New(domainErr.ErrValidation, "review already applied", nil)
	}

	basePlan, err := s.plans.GetByID(ctx, userID, review.PlanID)
	if err != nil {
		return nil, err
	}

	maxVersion, _ := s.plans.GetMaxVersion(ctx, userID, basePlan.GoalID)
	newPlan := &goalmodel.Plan{
		UserID: userID, GoalID: basePlan.GoalID,
		Title: basePlan.Title, Description: basePlan.Description,
		Status: goalmodel.PlanDraft, Version: maxVersion + 1,
	}
	for _, step := range basePlan.Steps {
		newPlan.Steps = append(newPlan.Steps, goalmodel.PlanStep{
			DayOffset: step.DayOffset, Title: step.Title,
			Description: step.Description, SortOrder: step.SortOrder,
		})
	}
	if len(review.Adaptations) > 0 && len(newPlan.Steps) > 0 {
		newPlan.Steps[0].Title = review.Adaptations[0]
	}

	if err := s.plans.Create(ctx, newPlan); err != nil {
		return nil, err
	}

	activated, err := s.ActivatePlan(ctx, userID, newPlan.ID)
	if err != nil {
		return nil, err
	}

	review.Status = goalmodel.WeeklyReviewApplied
	_ = s.reviews.Update(ctx, review)

	return activated, nil
}

func (s *Service) ListPlans(ctx context.Context, userID uuid.UUID) ([]dto.PlanResponse, error) {
	plans, err := s.plans.ListByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]dto.PlanResponse, len(plans))
	for i, p := range plans {
		out[i] = *toPlanResponse(p)
	}
	return out, nil
}

func (s *Service) GetPlan(ctx context.Context, userID, planID uuid.UUID) (*dto.PlanResponse, error) {
	plan, err := s.plans.GetByID(ctx, userID, planID)
	if err != nil {
		return nil, err
	}
	return toPlanResponse(plan), nil
}

func (s *Service) RevisePlan(ctx context.Context, userID uuid.UUID, req dto.RevisePlanRequest) (*dto.PlanResponse, error) {
	base, err := s.plans.GetByID(ctx, userID, req.BasePlanID)
	if err != nil {
		return nil, err
	}

	maxVersion, _ := s.plans.GetMaxVersion(ctx, userID, base.GoalID)
	plan := &goalmodel.Plan{
		UserID: userID, GoalID: base.GoalID,
		Title: base.Title, Description: base.Description,
		Status: goalmodel.PlanDraft, Version: maxVersion + 1,
	}
	if req.Title != nil {
		plan.Title = *req.Title
	}
	if req.Description != nil {
		plan.Description = req.Description
	}

	steps := req.Steps
	if len(steps) == 0 {
		for _, step := range base.Steps {
			plan.Steps = append(plan.Steps, goalmodel.PlanStep{
				DayOffset: step.DayOffset, Title: step.Title,
				Description: step.Description, SortOrder: step.SortOrder,
			})
		}
	} else {
		for _, step := range steps {
			plan.Steps = append(plan.Steps, goalmodel.PlanStep{
				DayOffset: step.DayOffset, Title: step.Title,
				Description: step.Description, SortOrder: step.SortOrder,
			})
		}
	}

	if err := s.plans.Create(ctx, plan); err != nil {
		return nil, err
	}
	if req.Activate {
		return s.ActivatePlan(ctx, userID, plan.ID)
	}
	return toPlanResponse(plan), nil
}

func (s *Service) GetPlanDiff(ctx context.Context, userID, fromID, toID uuid.UUID) (*dto.PlanDiffResponse, error) {
	from, err := s.plans.GetByID(ctx, userID, fromID)
	if err != nil {
		return nil, err
	}
	to, err := s.plans.GetByID(ctx, userID, toID)
	if err != nil {
		return nil, err
	}

	fromMap := map[int]goalmodel.PlanStep{}
	for _, step := range from.Steps {
		fromMap[step.DayOffset] = step
	}
	toMap := map[int]goalmodel.PlanStep{}
	for _, step := range to.Steps {
		toMap[step.DayOffset] = step
	}

	diff := &dto.PlanDiffResponse{
		FromPlanID: from.ID, ToPlanID: to.ID,
		FromVersion: from.Version, ToVersion: to.Version,
	}

	for offset, step := range toMap {
		if old, ok := fromMap[offset]; !ok {
			diff.Added = append(diff.Added, dto.PlanStepResponse{
				ID: step.ID, DayOffset: step.DayOffset, Title: step.Title,
				Description: step.Description, SortOrder: step.SortOrder,
			})
		} else if old.Title != step.Title || old.Description != step.Description {
			diff.Changed = append(diff.Changed, dto.PlanStepResponse{
				ID: step.ID, DayOffset: step.DayOffset, Title: step.Title,
				Description: step.Description, SortOrder: step.SortOrder,
			})
		}
	}
	for offset, step := range fromMap {
		if _, ok := toMap[offset]; !ok {
			diff.Removed = append(diff.Removed, dto.PlanStepResponse{
				ID: step.ID, DayOffset: step.DayOffset, Title: step.Title,
				Description: step.Description, SortOrder: step.SortOrder,
			})
		}
	}
	return diff, nil
}

func (s *Service) RegisterPushToken(ctx context.Context, userID uuid.UUID, req dto.RegisterPushTokenRequest) error {
	platform := req.Platform
	if platform == "" {
		platform = "expo"
	}
	return s.notifications.UpsertToken(ctx, &profilemodel.NotificationToken{
		UserID: userID, Token: req.Token, Platform: platform,
	})
}

func (s *Service) SendTestPush(ctx context.Context, userID uuid.UUID) error {
	return s.notifyUser(ctx, userID, "Yuvmi test bildirimi",
		"Push bildirimleri çalışıyor.", "test", nil)
}

func (s *Service) ListNotifications(ctx context.Context, userID uuid.UUID) ([]dto.NotificationResponse, error) {
	items, err := s.notifications.ListNotifications(ctx, userID, 50)
	if err != nil {
		return nil, err
	}
	out := make([]dto.NotificationResponse, len(items))
	for i, n := range items {
		out[i] = dto.NotificationResponse{
			ID: n.ID, Title: n.Title, Body: n.Body, Type: n.Type,
			Data: n.Data, ReadAt: n.ReadAt, CreatedAt: n.CreatedAt,
		}
	}
	return out, nil
}

func (s *Service) MarkNotificationRead(ctx context.Context, userID, notificationID uuid.UUID) error {
	return s.notifications.MarkRead(ctx, userID, notificationID)
}

func (s *Service) GetUnreadNotificationCount(ctx context.Context, userID uuid.UUID) (*dto.UnreadCountResponse, error) {
	count, err := s.notifications.CountUnread(ctx, userID)
	if err != nil {
		return nil, err
	}
	return &dto.UnreadCountResponse{Count: count}, nil
}

func (s *Service) notifyUser(ctx context.Context, userID uuid.UUID, title, body, nType string, data map[string]string) error {
	if data == nil {
		data = map[string]string{}
	}
	_ = s.notifications.CreateNotification(ctx, &profilemodel.InAppNotification{
		UserID: userID, Title: title, Body: body, Type: nType, Data: data,
	})

	if s.push == nil {
		return nil
	}
	tokens, err := s.notifications.ListTokens(ctx, userID)
	if err != nil {
		return err
	}
	for _, t := range tokens {
		_ = s.push.Send(ctx, infraNotify.PushMessage{
			To: t.Token, Title: title, Body: body, Data: data,
		})
	}
	return nil
}

func (s *Service) aggregateWeekMetrics(ctx context.Context, userID uuid.UUID, since time.Time) (goalmodel.WeeklyReviewMetrics, int, error) {
	var metrics goalmodel.WeeklyReviewMetrics
	activeDays := map[string]bool{}

	checkins, _ := s.checkins.ListSince(ctx, userID, since)
	metrics.CheckinCount = len(checkins)
	var moodSum, energySum float64
	for _, c := range checkins {
		moodSum += float64(c.Mood)
		energySum += float64(c.Energy)
		activeDays[dto.FormatDate(c.Date)] = true
	}
	if metrics.CheckinCount > 0 {
		metrics.AvgMood = moodSum / float64(metrics.CheckinCount)
		metrics.AvgEnergy = energySum / float64(metrics.CheckinCount)
	}

	tasks, _ := s.tasks.ListRecent(ctx, userID, since)
	for _, t := range tasks {
		activeDays[dto.FormatDate(t.Date)] = true
		switch t.Status {
		case goalmodel.TaskCompleted:
			metrics.TaskCompleted++
		case goalmodel.TaskSkipped:
			metrics.TaskSkipped++
		}
	}

	alignments, _ := s.alignment.ListSince(ctx, userID, since)
	var alignSum float64
	for _, a := range alignments {
		alignSum += float64(a.OverallScore)
	}
	if len(alignments) > 0 {
		metrics.AvgAlignment = alignSum / float64(len(alignments))
	}

	metrics.DaysActive = len(activeDays)
	return metrics, metrics.DaysActive, nil
}

func buildWeeklySummary(metrics goalmodel.WeeklyReviewMetrics, planVersion int) (string, []string) {
	summary := fmt.Sprintf(
		"Plan v%d için son 7 günde %d aktif gün, %d check-in, %d tamamlanan ve %d atlanan görev kaydettin.",
		planVersion, metrics.DaysActive, metrics.CheckinCount, metrics.TaskCompleted, metrics.TaskSkipped,
	)
	if metrics.AvgMood > 0 {
		summary += fmt.Sprintf(" Ortalama ruh hâli %.1f/5.", metrics.AvgMood)
	}
	if metrics.AvgAlignment > 0 {
		summary += fmt.Sprintf(" Hizalanma ortalaması %.0f.", metrics.AvgAlignment)
	}

	adaptations := []string{}
	if metrics.TaskCompleted < 3 {
		adaptations = append(adaptations, "Günlük adımları daha küçük parçalara böl")
	}
	if metrics.AvgMood > 0 && metrics.AvgMood < 3 {
		adaptations = append(adaptations, "Check-in sonrası 5 dakikalık nefes molası ekle")
	}
	if metrics.TaskSkipped > metrics.TaskCompleted {
		adaptations = append(adaptations, "Haftada bir dinlenme günü tanı")
	}
	if len(adaptations) == 0 {
		adaptations = append(adaptations, "Mevcut tempoyu koru; bir sonraki hafta aynı planla devam et")
	}
	return summary, adaptations
}

func toWeeklyReviewResponse(r *goalmodel.WeeklyReview) *dto.WeeklyReviewResponse {
	return &dto.WeeklyReviewResponse{
		ID: r.ID, PlanID: r.PlanID, WeekStartDate: dto.FormatDate(r.WeekStartDate),
		Summary: r.Summary, Adaptations: r.Adaptations,
		Metrics: dto.WeeklyReviewMetricsResponse{
			CheckinCount: r.Metrics.CheckinCount, TaskCompleted: r.Metrics.TaskCompleted,
			TaskSkipped: r.Metrics.TaskSkipped, AvgMood: r.Metrics.AvgMood,
			AvgEnergy: r.Metrics.AvgEnergy, AvgAlignment: r.Metrics.AvgAlignment,
			DaysActive: r.Metrics.DaysActive,
		},
		Reflection: r.Reflection, NextPlanVersion: r.NextPlanVersion,
		Status: r.Status, CreatedAt: r.CreatedAt,
	}
}
