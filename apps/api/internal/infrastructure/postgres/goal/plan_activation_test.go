package goal

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/masterfabric-go/masterfabric/internal/domain/goal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// testPool connects to a local Postgres instance for integration testing of
// plan versioning, which lives in a single SQL transaction (ActivatePlanTx)
// and can't be verified through mocks. Point TEST_DATABASE_URL at a
// migrated database (see docker-compose.yml + `make migrate`) to run these;
// otherwise they skip.
func testPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://yuvmi:yuvmi@localhost:5432/yuvmi?sslmode=disable"
	}
	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		t.Skipf("skipping integration test: cannot parse TEST_DATABASE_URL: %v", err)
	}
	if err := pool.Ping(context.Background()); err != nil {
		pool.Close()
		t.Skipf("skipping integration test: postgres not reachable at %s: %v", dsn, err)
	}
	if _, err := pool.Exec(context.Background(), `SELECT 1 FROM plan_steps LIMIT 0`); err != nil {
		pool.Close()
		t.Skipf("skipping integration test: schema not migrated: %v", err)
	}
	return pool
}

// createTestUser inserts a throwaway user row and registers cleanup that
// removes it (and, via ON DELETE CASCADE, every goal/plan/task/pearl_award
// created under it) once the test finishes.
func createTestUser(t *testing.T, pool *pgxpool.Pool) uuid.UUID {
	t.Helper()
	userID := uuid.New()
	email := fmt.Sprintf("test-%s@yuvmi.local", userID)
	_, err := pool.Exec(context.Background(),
		`INSERT INTO users (id, email, status) VALUES ($1, $2, 'active')`, userID, email)
	require.NoError(t, err)
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM users WHERE id = $1`, userID)
	})
	return userID
}

func todayForTest() time.Time {
	now := time.Now().UTC()
	return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
}

// TestActivatePlanTx_SupersedesOldActivatesNewCreatesTask locks in plan
// versioning: activating a plan must supersede whatever plan was active
// before it, flip the new plan to active, and materialize today's daily
// task from the plan's day-0 step — all inside one transaction.
func TestActivatePlanTx_SupersedesOldActivatesNewCreatesTask(t *testing.T) {
	pool := testPool(t)
	defer pool.Close()
	ctx := context.Background()

	goals := NewGoalRepo(pool)
	plans := NewPlanRepo(pool)

	userID := createTestUser(t, pool)

	goal := &model.Goal{UserID: userID, Title: "Test goal", Status: model.GoalDraft}
	require.NoError(t, goals.Create(ctx, goal))

	oldPlan := &model.Plan{UserID: userID, GoalID: &goal.ID, Title: "Eski plan", Status: model.PlanDraft, Version: 1}
	require.NoError(t, plans.Create(ctx, oldPlan))
	require.NoError(t, plans.Activate(ctx, userID, oldPlan.ID))

	newPlan := &model.Plan{
		UserID: userID, GoalID: &goal.ID, Title: "Yeni plan", Status: model.PlanDraft, Version: 2,
		Steps: []model.PlanStep{{DayOffset: 0, Title: "Bugünün adımı", Description: "Küçük bir adım"}},
	}
	require.NoError(t, plans.Create(ctx, newPlan))

	task := &model.DailyTask{
		UserID: userID, PlanID: newPlan.ID, Date: todayForTest(),
		Title: newPlan.Steps[0].Title, Description: newPlan.Steps[0].Description, Status: model.TaskPending,
	}
	require.NoError(t, plans.ActivatePlanTx(ctx, userID, newPlan.ID, newPlan.GoalID, task))

	refreshedOld, err := plans.GetByID(ctx, userID, oldPlan.ID)
	require.NoError(t, err)
	assert.Equal(t, model.PlanSuperseded, refreshedOld.Status, "activating a new plan must supersede the previously active one")

	refreshedNew, err := plans.GetByID(ctx, userID, newPlan.ID)
	require.NoError(t, err)
	assert.Equal(t, model.PlanActive, refreshedNew.Status, "the newly activated plan must become active")

	createdGoal, err := goals.GetByID(ctx, userID, goal.ID)
	require.NoError(t, err)
	assert.Equal(t, model.GoalActive, createdGoal.Status, "the plan's linked goal must be activated too")

	tasks := NewTaskRepo(pool)
	dailyTask, err := tasks.GetByDate(ctx, userID, todayForTest())
	require.NoError(t, err)
	assert.Equal(t, newPlan.ID, dailyTask.PlanID, "today's task must belong to the newly activated plan")
	assert.Equal(t, "Bugünün adımı", dailyTask.Title)
	assert.Equal(t, model.TaskPending, dailyTask.Status)
}

// TestActivatePlanTx_FailureRollsBackSupersede proves the whole activation
// is one atomic unit: if activating the target plan fails partway through,
// the plans that ActivatePlanTx already superseded must NOT stay superseded
// — otherwise a failed activation could leave the user with no active plan
// at all.
func TestActivatePlanTx_FailureRollsBackSupersede(t *testing.T) {
	pool := testPool(t)
	defer pool.Close()
	ctx := context.Background()

	plans := NewPlanRepo(pool)
	userID := createTestUser(t, pool)
	otherUserID := createTestUser(t, pool)

	activePlan := &model.Plan{UserID: userID, Title: "Halihazırda aktif", Status: model.PlanDraft, Version: 1}
	require.NoError(t, plans.Create(ctx, activePlan))
	require.NoError(t, plans.Activate(ctx, userID, activePlan.ID))

	// A plan ID that does not belong to userID (it belongs to otherUserID),
	// so the internal Activate() call inside ActivatePlanTx will affect zero
	// rows and return ErrNotFound, forcing a rollback.
	foreignPlan := &model.Plan{UserID: otherUserID, Title: "Başkasının planı", Status: model.PlanDraft, Version: 1}
	require.NoError(t, plans.Create(ctx, foreignPlan))

	task := &model.DailyTask{
		UserID: userID, PlanID: foreignPlan.ID, Date: todayForTest(),
		Title: "olmayacak görev", Status: model.TaskPending,
	}
	err := plans.ActivatePlanTx(ctx, userID, foreignPlan.ID, nil, task)
	require.Error(t, err)

	refreshedActive, err := plans.GetByID(ctx, userID, activePlan.ID)
	require.NoError(t, err)
	assert.Equal(t, model.PlanActive, refreshedActive.Status,
		"a failed activation must roll back any supersede it already applied")

	tasks := NewTaskRepo(pool)
	_, err = tasks.GetByDate(ctx, userID, todayForTest())
	assert.Error(t, err, "no daily task should have been committed for the failed activation")
}
