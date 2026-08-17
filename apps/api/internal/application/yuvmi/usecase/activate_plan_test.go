package usecase

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	goalmodel "github.com/masterfabric-go/masterfabric/internal/domain/goal/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/profile/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

// --- mocks -----------------------------------------------------------------

type mockPlanRepo struct{ mock.Mock }

func (m *mockPlanRepo) Create(ctx context.Context, plan *goalmodel.Plan) error {
	args := m.Called(ctx, plan)
	return args.Error(0)
}
func (m *mockPlanRepo) GetActiveByUserID(ctx context.Context, userID uuid.UUID) (*goalmodel.Plan, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*goalmodel.Plan), args.Error(1)
}
func (m *mockPlanRepo) GetByID(ctx context.Context, userID, planID uuid.UUID) (*goalmodel.Plan, error) {
	args := m.Called(ctx, userID, planID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*goalmodel.Plan), args.Error(1)
}
func (m *mockPlanRepo) ListByUserID(ctx context.Context, userID uuid.UUID) ([]*goalmodel.Plan, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*goalmodel.Plan), args.Error(1)
}
func (m *mockPlanRepo) GetMaxVersion(ctx context.Context, userID uuid.UUID, goalID *uuid.UUID) (int, error) {
	args := m.Called(ctx, userID, goalID)
	return args.Int(0), args.Error(1)
}
func (m *mockPlanRepo) Activate(ctx context.Context, userID, planID uuid.UUID) error {
	args := m.Called(ctx, userID, planID)
	return args.Error(0)
}
func (m *mockPlanRepo) SupersedeOthers(ctx context.Context, userID, planID uuid.UUID) error {
	args := m.Called(ctx, userID, planID)
	return args.Error(0)
}
func (m *mockPlanRepo) ActivatePlanTx(ctx context.Context, userID, planID uuid.UUID, goalID *uuid.UUID, task *goalmodel.DailyTask) error {
	args := m.Called(ctx, userID, planID, goalID, task)
	return args.Error(0)
}

type mockTaskRepo struct{ mock.Mock }

func (m *mockTaskRepo) Create(ctx context.Context, task *goalmodel.DailyTask) error {
	args := m.Called(ctx, task)
	return args.Error(0)
}
func (m *mockTaskRepo) GetByDate(ctx context.Context, userID uuid.UUID, date time.Time) (*goalmodel.DailyTask, error) {
	args := m.Called(ctx, userID, date)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*goalmodel.DailyTask), args.Error(1)
}
func (m *mockTaskRepo) GetByID(ctx context.Context, userID, taskID uuid.UUID) (*goalmodel.DailyTask, error) {
	args := m.Called(ctx, userID, taskID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*goalmodel.DailyTask), args.Error(1)
}
func (m *mockTaskRepo) Complete(ctx context.Context, userID, taskID uuid.UUID) (bool, error) {
	args := m.Called(ctx, userID, taskID)
	return args.Bool(0), args.Error(1)
}
func (m *mockTaskRepo) Skip(ctx context.Context, userID, taskID uuid.UUID, reason *string) error {
	args := m.Called(ctx, userID, taskID, reason)
	return args.Error(0)
}
func (m *mockTaskRepo) ListRecent(ctx context.Context, userID uuid.UUID, since time.Time) ([]*goalmodel.DailyTask, error) {
	args := m.Called(ctx, userID, since)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*goalmodel.DailyTask), args.Error(1)
}

type mockGoalRepo struct{ mock.Mock }

func (m *mockGoalRepo) Create(ctx context.Context, goal *goalmodel.Goal) error {
	args := m.Called(ctx, goal)
	return args.Error(0)
}
func (m *mockGoalRepo) GetActiveByUserID(ctx context.Context, userID uuid.UUID) (*goalmodel.Goal, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*goalmodel.Goal), args.Error(1)
}
func (m *mockGoalRepo) GetLatestByUserID(ctx context.Context, userID uuid.UUID) (*goalmodel.Goal, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*goalmodel.Goal), args.Error(1)
}
func (m *mockGoalRepo) GetByID(ctx context.Context, userID, goalID uuid.UUID) (*goalmodel.Goal, error) {
	args := m.Called(ctx, userID, goalID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*goalmodel.Goal), args.Error(1)
}
func (m *mockGoalRepo) Update(ctx context.Context, goal *goalmodel.Goal) error {
	args := m.Called(ctx, goal)
	return args.Error(0)
}
func (m *mockGoalRepo) Activate(ctx context.Context, userID, goalID uuid.UUID) error {
	args := m.Called(ctx, userID, goalID)
	return args.Error(0)
}
func (m *mockGoalRepo) CountByUserID(ctx context.Context, userID uuid.UUID) (int, error) {
	args := m.Called(ctx, userID)
	return args.Int(0), args.Error(1)
}

type mockProfileRepo struct{ mock.Mock }

func (m *mockProfileRepo) GetByUserID(ctx context.Context, userID uuid.UUID) (*model.UserProfile, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.UserProfile), args.Error(1)
}
func (m *mockProfileRepo) Upsert(ctx context.Context, profile *model.UserProfile) error {
	args := m.Called(ctx, profile)
	return args.Error(0)
}
func (m *mockProfileRepo) SetOnboardingComplete(ctx context.Context, userID uuid.UUID) error {
	args := m.Called(ctx, userID)
	return args.Error(0)
}
func (m *mockProfileRepo) EnsureDefault(ctx context.Context, userID uuid.UUID, displayName string) error {
	args := m.Called(ctx, userID, displayName)
	return args.Error(0)
}

// --- tests -------------------------------------------------------------------

// TestActivatePlan_CallsActivatePlanTxAndCreatesTodayTask locks in plan
// versioning: activating a plan must supersede/activate/create-today's-task/
// activate-goal atomically (via ActivatePlanTx) so no two plans are ever
// active at once and a mid-flight failure can't leave the user with an
// active plan but no task.
func TestActivatePlan_CallsActivatePlanTxAndCreatesTodayTask(t *testing.T) {
	userID := uuid.New()
	goalID := uuid.New()
	planID := uuid.New()

	plans := new(mockPlanRepo)
	tasks := new(mockTaskRepo)
	goals := new(mockGoalRepo)
	profiles := new(mockProfileRepo)

	plan := &goalmodel.Plan{
		ID: planID, UserID: userID, GoalID: &goalID, Version: 2, Status: goalmodel.PlanDraft,
		Steps: []goalmodel.PlanStep{
			{DayOffset: 0, Title: "İlk adım", Description: "Küçük bir başlangıç"},
			{DayOffset: 1, Title: "İkinci adım", Description: "Devam"},
		},
	}
	activatedPlan := &goalmodel.Plan{
		ID: planID, UserID: userID, GoalID: &goalID, Version: 2, Status: goalmodel.PlanActive,
		Steps: plan.Steps,
	}

	var capturedTask *goalmodel.DailyTask
	var capturedGoalID *uuid.UUID
	plans.On("GetByID", mock.Anything, userID, planID).Return(plan, nil).Once()
	plans.On("ActivatePlanTx", mock.Anything, userID, planID, mock.Anything, mock.AnythingOfType("*model.DailyTask")).
		Run(func(args mock.Arguments) {
			capturedGoalID = args.Get(3).(*uuid.UUID)
			capturedTask = args.Get(4).(*goalmodel.DailyTask)
		}).
		Return(nil).Once()
	plans.On("GetByID", mock.Anything, userID, planID).Return(activatedPlan, nil).Once()
	profiles.On("SetOnboardingComplete", mock.Anything, userID).Return(nil).Once()

	svc := &Service{plans: plans, tasks: tasks, goals: goals, profiles: profiles}

	resp, err := svc.ActivatePlan(context.Background(), userID, planID)
	require.NoError(t, err)

	assert.Equal(t, goalmodel.PlanActive, resp.Status, "activated plan must come back with active status")

	require.NotNil(t, capturedGoalID)
	assert.Equal(t, goalID, *capturedGoalID, "the plan's linked goal must be passed through to the atomic activation")

	require.NotNil(t, capturedTask)
	assert.Equal(t, userID, capturedTask.UserID)
	assert.Equal(t, planID, capturedTask.PlanID)
	assert.Equal(t, goalmodel.TaskPending, capturedTask.Status)
	assert.Equal(t, "İlk adım", capturedTask.Title, "today's task must come from the plan's day-0 step")
	assert.Equal(t, todayUTC(), capturedTask.Date)

	plans.AssertExpectations(t)
	tasks.AssertExpectations(t)
	goals.AssertExpectations(t)
	profiles.AssertExpectations(t)
}

// TestActivatePlan_ActivatePlanTxFailureAbortsActivation ensures a failure
// inside the atomic activation stops the flow before onboarding is marked
// complete or the plan is re-fetched — otherwise the user could be told
// onboarding finished while no plan actually got activated.
func TestActivatePlan_ActivatePlanTxFailureAbortsActivation(t *testing.T) {
	userID := uuid.New()
	planID := uuid.New()

	plans := new(mockPlanRepo)
	tasks := new(mockTaskRepo)
	goals := new(mockGoalRepo)
	profiles := new(mockProfileRepo)

	plan := &goalmodel.Plan{ID: planID, UserID: userID, Status: goalmodel.PlanDraft}
	plans.On("GetByID", mock.Anything, userID, planID).Return(plan, nil).Once()
	plans.On("ActivatePlanTx", mock.Anything, userID, planID, mock.Anything, mock.AnythingOfType("*model.DailyTask")).
		Return(errors.New("db down")).Once()

	svc := &Service{plans: plans, tasks: tasks, goals: goals, profiles: profiles}

	resp, err := svc.ActivatePlan(context.Background(), userID, planID)
	require.Error(t, err)
	assert.Nil(t, resp)

	profiles.AssertNotCalled(t, "SetOnboardingComplete", mock.Anything, mock.Anything)
	plans.AssertExpectations(t)
}

// TestActivatePlan_NoGoalPassesNilGoalID ensures a plan created without a
// linked goal (GoalID == nil) passes a nil goal ID through to ActivatePlanTx
// instead of e.g. a zero-value uuid — the repository uses the nil check to
// decide whether to touch the goal at all.
func TestActivatePlan_NoGoalPassesNilGoalID(t *testing.T) {
	userID := uuid.New()
	planID := uuid.New()

	plans := new(mockPlanRepo)
	tasks := new(mockTaskRepo)
	goals := new(mockGoalRepo)
	profiles := new(mockProfileRepo)

	plan := &goalmodel.Plan{ID: planID, UserID: userID, Status: goalmodel.PlanDraft}
	activatedPlan := &goalmodel.Plan{ID: planID, UserID: userID, Status: goalmodel.PlanActive}

	var capturedGoalID *uuid.UUID
	sawCall := false
	plans.On("GetByID", mock.Anything, userID, planID).Return(plan, nil).Once()
	plans.On("ActivatePlanTx", mock.Anything, userID, planID, mock.Anything, mock.AnythingOfType("*model.DailyTask")).
		Run(func(args mock.Arguments) {
			sawCall = true
			capturedGoalID = args.Get(3).(*uuid.UUID)
		}).
		Return(nil).Once()
	plans.On("GetByID", mock.Anything, userID, planID).Return(activatedPlan, nil).Once()
	profiles.On("SetOnboardingComplete", mock.Anything, userID).Return(nil).Once()

	svc := &Service{plans: plans, tasks: tasks, goals: goals, profiles: profiles}

	resp, err := svc.ActivatePlan(context.Background(), userID, planID)
	require.NoError(t, err)
	assert.Equal(t, goalmodel.PlanActive, resp.Status)

	require.True(t, sawCall)
	assert.Nil(t, capturedGoalID, "a plan with no linked goal must pass a nil goal ID through")

	goals.AssertNotCalled(t, "Activate", mock.Anything, mock.Anything, mock.Anything)
}

