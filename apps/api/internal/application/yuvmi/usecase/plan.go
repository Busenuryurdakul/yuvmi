package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/yuvmi/dto"
	goalmodel "github.com/masterfabric-go/masterfabric/internal/domain/goal/model"
)

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
			diff.ChangedPairs = append(diff.ChangedPairs, dto.PlanStepPairResponse{
				DayOffset: step.DayOffset,
				From: dto.PlanStepResponse{
					ID: old.ID, DayOffset: old.DayOffset, Title: old.Title,
					Description: old.Description, SortOrder: old.SortOrder,
				},
				To: dto.PlanStepResponse{
					ID: step.ID, DayOffset: step.DayOffset, Title: step.Title,
					Description: step.Description, SortOrder: step.SortOrder,
				},
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
