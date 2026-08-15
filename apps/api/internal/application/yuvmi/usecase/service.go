package usecase

import (
	"context"
	"time"

	"github.com/google/uuid"
	iamRepo "github.com/masterfabric-go/masterfabric/internal/domain/iam/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/application/yuvmi/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/alignment"
	fsmodel "github.com/masterfabric-go/masterfabric/internal/domain/futureself/model"
	fsRepo "github.com/masterfabric-go/masterfabric/internal/domain/futureself/repository"
	goalmodel "github.com/masterfabric-go/masterfabric/internal/domain/goal/model"
	goalRepo "github.com/masterfabric-go/masterfabric/internal/domain/goal/repository"
	"github.com/masterfabric-go/masterfabric/internal/domain/profile/model"
	profileRepo "github.com/masterfabric-go/masterfabric/internal/domain/profile/repository"
	assetRepo "github.com/masterfabric-go/masterfabric/internal/domain/asset/repository"
	spaceRepo "github.com/masterfabric-go/masterfabric/internal/domain/space/repository"
	subRepo "github.com/masterfabric-go/masterfabric/internal/domain/subscription/repository"
	pgProfile "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/profile"
	infraNotify "github.com/masterfabric-go/masterfabric/internal/infrastructure/notification"
	"github.com/masterfabric-go/masterfabric/internal/infrastructure/storage"
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	infraStripe "github.com/masterfabric-go/masterfabric/internal/infrastructure/payment/stripe"
)

type Service struct {
	users         iamRepo.UserRepository
	profiles      profileRepo.ProfileRepository
	profilePG     *pgProfile.ProfileRepo
	futureSelf    fsRepo.FutureSelfRepository
	goals         goalRepo.GoalRepository
	plans         goalRepo.PlanRepository
	tasks         goalRepo.TaskRepository
	checkins      profileRepo.CheckinRepository
	alignment     profileRepo.AlignmentRepository
	reviews       goalRepo.WeeklyReviewRepository
	notifications profileRepo.NotificationRepository
	spaces        spaceRepo.SpaceRepository
	assets        assetRepo.AssetRepository
	subscriptions subRepo.SubscriptionRepository
	storage       storage.ObjectStorage
	engine        *alignment.Engine
	push          *infraNotify.ExpoPushClient
	yuvmiCfg      config.YuvmiConfig
	stripe        *infraStripe.Client
}

func NewService(
	users iamRepo.UserRepository,
	profiles profileRepo.ProfileRepository,
	profilePG *pgProfile.ProfileRepo,
	futureSelf fsRepo.FutureSelfRepository,
	goals goalRepo.GoalRepository,
	plans goalRepo.PlanRepository,
	tasks goalRepo.TaskRepository,
	checkins profileRepo.CheckinRepository,
	alignment profileRepo.AlignmentRepository,
	reviews goalRepo.WeeklyReviewRepository,
	notifications profileRepo.NotificationRepository,
	spaces spaceRepo.SpaceRepository,
	assets assetRepo.AssetRepository,
	subscriptions subRepo.SubscriptionRepository,
	store storage.ObjectStorage,
	engine *alignment.Engine,
	push *infraNotify.ExpoPushClient,
	yuvmiCfg config.YuvmiConfig,
) *Service {
	svc := &Service{
		users: users, profiles: profiles, profilePG: profilePG,
		futureSelf: futureSelf, goals: goals, plans: plans, tasks: tasks,
		checkins: checkins, alignment: alignment, reviews: reviews,
		notifications: notifications, spaces: spaces, assets: assets,
		subscriptions: subscriptions, storage: store, engine: engine, push: push,
		yuvmiCfg: yuvmiCfg,
	}
	if yuvmiCfg.Stripe.Enabled() {
		svc.stripe = infraStripe.NewClient(yuvmiCfg.Stripe.SecretKey, yuvmiCfg.Stripe.WebhookSecret)
	}
	return svc
}

func (s *Service) GetMe(ctx context.Context, userID uuid.UUID) (*dto.UserProfileResponse, error) {
	user, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	profile, err := s.profiles.GetByUserID(ctx, userID)
	if err != nil {
		displayName := user.FullName()
		_ = s.profilePG.EnsureDefault(ctx, userID, displayName)
		profile = &model.UserProfile{
			UserID: userID, DisplayName: displayName, Locale: "tr", Timezone: "Europe/Istanbul",
		}
	}
	return &dto.UserProfileResponse{
		ID: userID, Email: user.Email, DisplayName: profile.DisplayName,
		AvatarURL: profile.AvatarURL, Locale: profile.Locale, Timezone: profile.Timezone,
		OnboardingComplete: profile.OnboardingComplete, CreatedAt: user.CreatedAt,
	}, nil
}

func (s *Service) UpdateMe(ctx context.Context, userID uuid.UUID, req dto.UpdateProfileRequest) (*dto.UserProfileResponse, error) {
	profile, err := s.profiles.GetByUserID(ctx, userID)
	if err != nil {
		user, uerr := s.users.GetByID(ctx, userID)
		if uerr != nil {
			return nil, uerr
		}
		profile = &model.UserProfile{UserID: userID, DisplayName: user.FullName(), Locale: "tr", Timezone: "Europe/Istanbul"}
	}
	if req.DisplayName != nil {
		profile.DisplayName = *req.DisplayName
	}
	if req.AvatarURL != nil {
		profile.AvatarURL = req.AvatarURL
	}
	if req.Locale != nil {
		profile.Locale = *req.Locale
	}
	if req.Timezone != nil {
		profile.Timezone = *req.Timezone
	}
	if err := s.profiles.Upsert(ctx, profile); err != nil {
		return nil, err
	}
	return s.GetMe(ctx, userID)
}

func (s *Service) CreateFutureSelf(ctx context.Context, userID uuid.UUID, req dto.CreateFutureSelfRequest) (*dto.FutureSelfResponse, error) {
	if existing, _ := s.futureSelf.GetByUserID(ctx, userID); existing != nil {
		return nil, domainErr.New(domainErr.ErrAlreadyExists, "future self already exists", nil)
	}
	fs := &fsmodel.FutureSelf{
		UserID: userID, Title: req.Title, Description: req.Description,
		Domains: req.Domains, Affirmations: req.Affirmations, Status: fsmodel.FutureSelfDraft,
	}
	for _, v := range req.VisionItems {
		fs.VisionItems = append(fs.VisionItems, fsmodel.VisionItem{
			Domain: v.Domain, Title: v.Title, ImageURL: v.ImageURL, Note: v.Note, SortOrder: v.SortOrder,
		})
	}
	if err := s.futureSelf.Create(ctx, fs); err != nil {
		return nil, err
	}
	return toFutureSelfResponse(fs), nil
}

func (s *Service) GetFutureSelf(ctx context.Context, userID uuid.UUID) (*dto.FutureSelfResponse, error) {
	fs, err := s.futureSelf.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return toFutureSelfResponse(fs), nil
}

func (s *Service) UpdateFutureSelf(ctx context.Context, userID uuid.UUID, req dto.CreateFutureSelfRequest) (*dto.FutureSelfResponse, error) {
	fs, err := s.futureSelf.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if fs.Status != fsmodel.FutureSelfDraft {
		return nil, domainErr.New(domainErr.ErrForbidden, "approved profile cannot be edited", nil)
	}
	fs.Title = req.Title
	fs.Description = req.Description
	fs.Domains = req.Domains
	fs.Affirmations = req.Affirmations
	fs.VisionItems = nil
	for _, v := range req.VisionItems {
		fs.VisionItems = append(fs.VisionItems, fsmodel.VisionItem{
			Domain: v.Domain, Title: v.Title, ImageURL: v.ImageURL, Note: v.Note, SortOrder: v.SortOrder,
		})
	}
	if err := s.futureSelf.Update(ctx, fs); err != nil {
		return nil, err
	}
	return toFutureSelfResponse(fs), nil
}

func (s *Service) ApproveFutureSelf(ctx context.Context, userID uuid.UUID) (*dto.FutureSelfResponse, error) {
	if err := s.futureSelf.Approve(ctx, userID); err != nil {
		return nil, err
	}
	return s.GetFutureSelf(ctx, userID)
}

func (s *Service) CreateGoal(ctx context.Context, userID uuid.UUID, req dto.CreateGoalRequest) (*dto.GoalResponse, error) {
	if err := s.checkGoalLimit(ctx, userID); err != nil {
		return nil, err
	}
	goal := &goalmodel.Goal{
		UserID: userID, FutureSelfID: req.FutureSelfID,
		Title: req.Title, Description: req.Description, Status: goalmodel.GoalDraft,
	}
	if req.TargetDate != nil {
		t, err := dto.ParseDate(*req.TargetDate)
		if err != nil {
			return nil, domainErr.New(domainErr.ErrValidation, "invalid targetDate", err)
		}
		goal.TargetDate = &t
	}
	if err := s.goals.Create(ctx, goal); err != nil {
		return nil, err
	}
	return toGoalResponse(goal), nil
}

func (s *Service) GetActiveGoal(ctx context.Context, userID uuid.UUID) (*dto.GoalResponse, error) {
	goal, err := s.goals.GetActiveByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return toGoalResponse(goal), nil
}

func (s *Service) GetCurrentGoal(ctx context.Context, userID uuid.UUID) (*dto.GoalResponse, error) {
	goal, err := s.goals.GetLatestByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return toGoalResponse(goal), nil
}

func (s *Service) UpdateGoal(ctx context.Context, userID uuid.UUID, req dto.CreateGoalRequest) (*dto.GoalResponse, error) {
	goal, err := s.goals.GetLatestByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	goal.FutureSelfID = req.FutureSelfID
	goal.Title = req.Title
	goal.Description = req.Description
	goal.TargetDate = nil
	if req.TargetDate != nil {
		t, err := dto.ParseDate(*req.TargetDate)
		if err != nil {
			return nil, domainErr.New(domainErr.ErrValidation, "invalid targetDate", err)
		}
		goal.TargetDate = &t
	}
	if err := s.goals.Update(ctx, goal); err != nil {
		return nil, err
	}
	return toGoalResponse(goal), nil
}

func (s *Service) ActivateGoal(ctx context.Context, userID, goalID uuid.UUID) (*dto.GoalResponse, error) {
	if err := s.goals.Activate(ctx, userID, goalID); err != nil {
		return nil, err
	}
	goal, err := s.goals.GetByID(ctx, userID, goalID)
	if err != nil {
		return nil, err
	}
	return toGoalResponse(goal), nil
}

func (s *Service) CreatePlan(ctx context.Context, userID uuid.UUID, req dto.CreatePlanRequest) (*dto.PlanResponse, error) {
	plan := &goalmodel.Plan{
		UserID: userID, GoalID: req.GoalID, Title: req.Title,
		Description: req.Description, Status: goalmodel.PlanDraft, Version: 1,
	}
	for _, step := range req.Steps {
		plan.Steps = append(plan.Steps, goalmodel.PlanStep{
			DayOffset: step.DayOffset, Title: step.Title, Description: step.Description, SortOrder: step.SortOrder,
		})
	}
	if err := s.plans.Create(ctx, plan); err != nil {
		return nil, err
	}
	return toPlanResponse(plan), nil
}

func (s *Service) GetActivePlan(ctx context.Context, userID uuid.UUID) (*dto.PlanResponse, error) {
	plan, err := s.plans.GetActiveByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return toPlanResponse(plan), nil
}

func (s *Service) ActivatePlan(ctx context.Context, userID, planID uuid.UUID) (*dto.PlanResponse, error) {
	plan, err := s.plans.GetByID(ctx, userID, planID)
	if err != nil {
		return nil, err
	}
	_ = s.plans.SupersedeOthers(ctx, userID, planID)
	if err := s.plans.Activate(ctx, userID, planID); err != nil {
		return nil, err
	}
	plan.Status = goalmodel.PlanActive

	today := todayUTC()
	step := firstStepForDay(plan, 0)
	task := &goalmodel.DailyTask{
		UserID: userID, PlanID: plan.ID, Date: today,
		Title: step.Title, Description: step.Description, Status: goalmodel.TaskPending,
	}
	_ = s.tasks.Create(ctx, task)

	if plan.GoalID != nil {
		_ = s.goals.Activate(ctx, userID, *plan.GoalID)
	}
	_ = s.profiles.SetOnboardingComplete(ctx, userID)

	plan, _ = s.plans.GetByID(ctx, userID, planID)
	return toPlanResponse(plan), nil
}

func (s *Service) GetTodayTask(ctx context.Context, userID uuid.UUID) (*dto.DailyTaskResponse, error) {
	task, err := s.tasks.GetByDate(ctx, userID, todayUTC())
	if err != nil {
		return nil, err
	}
	return toTaskResponse(task), nil
}

func (s *Service) CompleteTask(ctx context.Context, userID, taskID uuid.UUID) (*dto.DailyTaskResponse, error) {
	if err := s.tasks.Complete(ctx, userID, taskID); err != nil {
		return nil, err
	}
	task, err := s.tasks.GetByID(ctx, userID, taskID)
	if err != nil {
		return nil, err
	}
	_, _ = s.engine.Recalculate(ctx, userID, todayUTC())
	return toTaskResponse(task), nil
}

func (s *Service) SkipTask(ctx context.Context, userID, taskID uuid.UUID, reason *string) (*dto.DailyTaskResponse, error) {
	if err := s.tasks.Skip(ctx, userID, taskID, reason); err != nil {
		return nil, err
	}
	task, err := s.tasks.GetByID(ctx, userID, taskID)
	if err != nil {
		return nil, err
	}
	_, _ = s.engine.Recalculate(ctx, userID, todayUTC())
	return toTaskResponse(task), nil
}

func (s *Service) GetTodayCheckin(ctx context.Context, userID uuid.UUID) (*dto.CheckinResponse, error) {
	entry, err := s.checkins.GetByDate(ctx, userID, todayUTC())
	if err != nil {
		return nil, err
	}
	return toCheckinResponse(entry), nil
}

func (s *Service) UpsertCheckin(ctx context.Context, userID uuid.UUID, req dto.UpsertCheckinRequest) (*dto.CheckinResponse, error) {
	entry := &model.TodayEntry{
		UserID: userID, Date: todayUTC(), Mood: req.Mood, Energy: req.Energy,
		Gratitude: req.Gratitude, Reflection: req.Reflection, DomainScores: req.DomainScores,
	}
	if err := s.checkins.Upsert(ctx, entry); err != nil {
		return nil, err
	}
	saved, err := s.checkins.GetByDate(ctx, userID, todayUTC())
	if err != nil {
		return nil, err
	}
	_, _ = s.engine.Recalculate(ctx, userID, todayUTC())
	return toCheckinResponse(saved), nil
}

func (s *Service) GetTodayAlignment(ctx context.Context, userID uuid.UUID) (*dto.AlignmentResponse, error) {
	today := todayUTC()
	snap, err := s.alignment.GetByDate(ctx, userID, today)
	if err != nil {
		return s.recalcAndReturn(ctx, userID, today)
	}
	return toAlignmentResponse(snap), nil
}

func (s *Service) GetAlignmentHistory(ctx context.Context, userID uuid.UUID) ([]dto.AlignmentResponse, error) {
	snaps, err := s.alignment.ListHistory(ctx, userID, 30)
	if err != nil {
		return nil, err
	}
	out := make([]dto.AlignmentResponse, len(snaps))
	for i, snap := range snaps {
		out[i] = *toAlignmentResponse(snap)
	}
	return out, nil
}

func (s *Service) recalcAndReturn(ctx context.Context, userID uuid.UUID, date time.Time) (*dto.AlignmentResponse, error) {
	snap, err := s.engine.Recalculate(ctx, userID, date)
	if err != nil {
		return nil, err
	}
	return toAlignmentResponse(snap), nil
}

func todayUTC() time.Time {
	now := time.Now().UTC()
	return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
}

func firstStepForDay(plan *goalmodel.Plan, dayOffset int) goalmodel.PlanStep {
	for _, step := range plan.Steps {
		if step.DayOffset == dayOffset {
			return step
		}
	}
	if len(plan.Steps) > 0 {
		return plan.Steps[0]
	}
	return goalmodel.PlanStep{Title: "Bugünün adımı", Description: "Küçük bir adım at"}
}

func toFutureSelfResponse(fs *fsmodel.FutureSelf) *dto.FutureSelfResponse {
	resp := &dto.FutureSelfResponse{
		ID: fs.ID, Title: fs.Title, Description: fs.Description,
		Domains: fs.Domains, Affirmations: fs.Affirmations, Status: fs.Status,
		CreatedAt: fs.CreatedAt, UpdatedAt: fs.UpdatedAt,
	}
	for _, v := range fs.VisionItems {
		resp.VisionItems = append(resp.VisionItems, dto.VisionItemResponse{
			ID: v.ID, Domain: v.Domain, Title: v.Title, ImageURL: v.ImageURL, Note: v.Note, SortOrder: v.SortOrder,
		})
	}
	return resp
}

func toGoalResponse(g *goalmodel.Goal) *dto.GoalResponse {
	resp := &dto.GoalResponse{
		ID: g.ID, FutureSelfID: g.FutureSelfID, Title: g.Title, Description: g.Description,
		Status: g.Status, CreatedAt: g.CreatedAt,
	}
	if g.TargetDate != nil {
		s := dto.FormatDate(*g.TargetDate)
		resp.TargetDate = &s
	}
	return resp
}

func toPlanResponse(p *goalmodel.Plan) *dto.PlanResponse {
	resp := &dto.PlanResponse{
		ID: p.ID, GoalID: p.GoalID, Title: p.Title, Description: p.Description,
		Status: p.Status, Version: p.Version, CreatedAt: p.CreatedAt,
	}
	for _, s := range p.Steps {
		resp.Steps = append(resp.Steps, dto.PlanStepResponse{
			ID: s.ID, DayOffset: s.DayOffset, Title: s.Title, Description: s.Description, SortOrder: s.SortOrder,
		})
	}
	return resp
}

func toTaskResponse(t *goalmodel.DailyTask) *dto.DailyTaskResponse {
	return &dto.DailyTaskResponse{
		ID: t.ID, PlanID: t.PlanID, Date: dto.FormatDate(t.Date), Title: t.Title,
		Description: t.Description, Status: t.Status, CompletedAt: t.CompletedAt, SkippedReason: t.SkippedReason,
	}
}

func toCheckinResponse(e *model.TodayEntry) *dto.CheckinResponse {
	return &dto.CheckinResponse{
		ID: e.ID, Date: dto.FormatDate(e.Date), Mood: e.Mood, Energy: e.Energy,
		Gratitude: e.Gratitude, Reflection: e.Reflection, DomainScores: e.DomainScores, CreatedAt: e.CreatedAt,
	}
}

func toAlignmentResponse(s *model.AlignmentSnapshot) *dto.AlignmentResponse {
	return &dto.AlignmentResponse{
		ID: s.ID, Date: dto.FormatDate(s.Date), OverallScore: s.OverallScore,
		Factors: s.Factors, SummaryExplanation: s.SummaryExplanation, GoalID: s.GoalID, PlanID: s.PlanID,
	}
}
