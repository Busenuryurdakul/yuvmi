package alignment

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	goalmodel "github.com/masterfabric-go/masterfabric/internal/domain/goal/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/profile/model"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

// --- mocks -----------------------------------------------------------------

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

type mockCheckinRepo struct{ mock.Mock }

func (m *mockCheckinRepo) GetByDate(ctx context.Context, userID uuid.UUID, date time.Time) (*model.TodayEntry, error) {
	args := m.Called(ctx, userID, date)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.TodayEntry), args.Error(1)
}
func (m *mockCheckinRepo) Upsert(ctx context.Context, entry *model.TodayEntry) error {
	args := m.Called(ctx, entry)
	return args.Error(0)
}
func (m *mockCheckinRepo) ListSince(ctx context.Context, userID uuid.UUID, since time.Time) ([]*model.TodayEntry, error) {
	args := m.Called(ctx, userID, since)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.TodayEntry), args.Error(1)
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

type mockAlignmentRepo struct{ mock.Mock }

func (m *mockAlignmentRepo) GetByDate(ctx context.Context, userID uuid.UUID, date time.Time) (*model.AlignmentSnapshot, error) {
	args := m.Called(ctx, userID, date)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.AlignmentSnapshot), args.Error(1)
}
func (m *mockAlignmentRepo) Upsert(ctx context.Context, snapshot *model.AlignmentSnapshot) error {
	args := m.Called(ctx, snapshot)
	return args.Error(0)
}
func (m *mockAlignmentRepo) ListHistory(ctx context.Context, userID uuid.UUID, limit int) ([]*model.AlignmentSnapshot, error) {
	args := m.Called(ctx, userID, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.AlignmentSnapshot), args.Error(1)
}
func (m *mockAlignmentRepo) ListSince(ctx context.Context, userID uuid.UUID, since time.Time) ([]*model.AlignmentSnapshot, error) {
	args := m.Called(ctx, userID, since)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.AlignmentSnapshot), args.Error(1)
}

// --- fixtures ----------------------------------------------------------------

// checkinsWithMood returns two check-ins for the current week whose only
// difference is Mood, so any score delta between runs must come from mood.
func checkinsWithMood(userID uuid.UUID, weekStart time.Time, mood int) []*model.TodayEntry {
	return []*model.TodayEntry{
		{UserID: userID, Date: weekStart, Mood: mood, Energy: 3},
	}
}

func newEngineWithMocks() (*Engine, *mockTaskRepo, *mockCheckinRepo, *mockGoalRepo, *mockPlanRepo, *mockAlignmentRepo) {
	tasks := new(mockTaskRepo)
	checkins := new(mockCheckinRepo)
	goals := new(mockGoalRepo)
	plans := new(mockPlanRepo)
	align := new(mockAlignmentRepo)
	engine := NewEngine(tasks, checkins, goals, plans, align)
	return engine, tasks, checkins, goals, plans, align
}

// --- tests -------------------------------------------------------------------

// TestRecalculate_LowMoodDoesNotLowerScore locks in the PRD guarantee (see
// docs/PRD.md: "Ruh hâli düşük olduğu için hizalanma puanını düşürmez") that
// mood never factors into the alignment score: two otherwise-identical weeks
// that differ only in check-in mood must produce the exact same score and
// factor breakdown.
func TestRecalculate_LowMoodDoesNotLowerScore(t *testing.T) {
	userID := uuid.New()
	date := time.Date(2026, 8, 16, 0, 0, 0, 0, time.UTC) // Sunday: weekStart == date
	weekStart := date

	run := func(mood int) *model.AlignmentSnapshot {
		engine, tasks, checkins, goals, plans, align := newEngineWithMocks()

		tasks.On("ListRecent", mock.Anything, userID, weekStart).Return([]*goalmodel.DailyTask{}, nil)
		checkins.On("ListSince", mock.Anything, userID, weekStart).
			Return(checkinsWithMood(userID, weekStart, mood), nil)
		goals.On("GetActiveByUserID", mock.Anything, userID).Return(nil, domainErr.ErrNotFound)
		plans.On("GetActiveByUserID", mock.Anything, userID).Return(nil, domainErr.ErrNotFound)
		align.On("Upsert", mock.Anything, mock.AnythingOfType("*model.AlignmentSnapshot")).Return(nil)

		snapshot, err := engine.Recalculate(context.Background(), userID, date)
		require.NoError(t, err)
		return snapshot
	}

	lowMood := run(1)  // "Yorgun" — lowest mood
	highMood := run(4) // "Canlı" — highest mood

	assert.Equal(t, highMood.OverallScore, lowMood.OverallScore,
		"mood must never change the overall alignment score")
	assert.Equal(t, highMood.Factors, lowMood.Factors,
		"mood must never change any individual factor contribution")
}

// TestRecalculate_FactorContributionsSumToOverallScore verifies the
// aggregation rule: OverallScore is the sum of every factor's Contribution
// (capped at 100), so the breakdown shown to the user always adds up.
func TestRecalculate_FactorContributionsSumToOverallScore(t *testing.T) {
	userID := uuid.New()
	date := time.Date(2026, 8, 16, 0, 0, 0, 0, time.UTC) // Sunday: weekStart == date
	weekStart := date

	goalID := uuid.New()
	planID := uuid.New()
	createdAt := date.AddDate(0, 0, -10)
	targetDate := date.AddDate(0, 0, 10)

	engine, tasks, checkins, goals, plans, align := newEngineWithMocks()

	dailyTasks := []*goalmodel.DailyTask{
		{ID: uuid.New(), UserID: userID, Status: goalmodel.TaskCompleted},
		{ID: uuid.New(), UserID: userID, Status: goalmodel.TaskCompleted},
		{ID: uuid.New(), UserID: userID, Status: goalmodel.TaskPending},
		{ID: uuid.New(), UserID: userID, Status: goalmodel.TaskSkipped},
	}
	tasks.On("ListRecent", mock.Anything, userID, weekStart).Return(dailyTasks, nil)

	entries := []*model.TodayEntry{
		{UserID: userID, Date: weekStart, Mood: 2, Reflection: "bugün iyiydi"},
		{UserID: userID, Date: weekStart.AddDate(0, 0, 1), Mood: 3},
	}
	checkins.On("ListSince", mock.Anything, userID, weekStart).Return(entries, nil)

	goal := &goalmodel.Goal{ID: goalID, UserID: userID, CreatedAt: createdAt, TargetDate: &targetDate}
	goals.On("GetActiveByUserID", mock.Anything, userID).Return(goal, nil)

	plan := &goalmodel.Plan{ID: planID, UserID: userID}
	plans.On("GetActiveByUserID", mock.Anything, userID).Return(plan, nil)

	align.On("Upsert", mock.Anything, mock.AnythingOfType("*model.AlignmentSnapshot")).Return(nil)

	snapshot, err := engine.Recalculate(context.Background(), userID, date)
	require.NoError(t, err)

	sum := 0
	for _, f := range snapshot.Factors {
		sum += f.Contribution
	}
	assert.Equal(t, sum, snapshot.OverallScore,
		"overall score must equal the sum of factor contributions")

	// 2/4 tasks completed -> round(2/4*25) = 13
	assert.Equal(t, 13, snapshot.Factors[0].Contribution)
	// 2 check-ins this week -> min(2*5, 25) = 10
	assert.Equal(t, 10, snapshot.Factors[1].Contribution)
	// at least one reflection recorded -> 10
	assert.Equal(t, 10, snapshot.Factors[3].Contribution)

	assert.Equal(t, goalID, *snapshot.GoalID)
	assert.Equal(t, planID, *snapshot.PlanID)
}

// TestRecalculate_OverallScoreCapsAtHundred ensures the sum of factor
// contributions is clamped so the score never overflows 100.
func TestRecalculate_OverallScoreCapsAtHundred(t *testing.T) {
	userID := uuid.New()
	date := time.Date(2026, 8, 16, 0, 0, 0, 0, time.UTC) // Sunday: weekStart == date
	weekStart := date

	engine, tasks, checkins, goals, plans, align := newEngineWithMocks()

	completedTasks := make([]*goalmodel.DailyTask, 0, 5)
	for i := 0; i < 5; i++ {
		completedTasks = append(completedTasks, &goalmodel.DailyTask{ID: uuid.New(), UserID: userID, Status: goalmodel.TaskCompleted})
	}
	tasks.On("ListRecent", mock.Anything, userID, weekStart).Return(completedTasks, nil)

	entries := make([]*model.TodayEntry, 0, 10)
	for i := 0; i < 10; i++ {
		entries = append(entries, &model.TodayEntry{
			UserID: userID, Date: weekStart.AddDate(0, 0, -i), Reflection: "y",
		})
	}
	checkins.On("ListSince", mock.Anything, userID, weekStart).Return(entries, nil)

	targetDate := date.AddDate(0, 0, 1)
	goal := &goalmodel.Goal{ID: uuid.New(), UserID: userID, CreatedAt: date.AddDate(0, 0, -100), TargetDate: &targetDate}
	goals.On("GetActiveByUserID", mock.Anything, userID).Return(goal, nil)
	plans.On("GetActiveByUserID", mock.Anything, userID).Return(nil, domainErr.ErrNotFound)
	align.On("Upsert", mock.Anything, mock.AnythingOfType("*model.AlignmentSnapshot")).Return(nil)

	snapshot, err := engine.Recalculate(context.Background(), userID, date)
	require.NoError(t, err)

	assert.LessOrEqual(t, snapshot.OverallScore, 100)
	assert.Equal(t, 100, snapshot.OverallScore)
}
