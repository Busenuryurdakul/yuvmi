package iam

import (
	"context"
	"fmt"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// testPool connects to a local Postgres instance. AwardPearlsIfUnderDailyCap's
// concurrency safety comes from a Postgres advisory lock (pg_advisory_xact_lock),
// which cannot be exercised through a mock — it has to run against a real
// database. Point TEST_DATABASE_URL at a migrated database (see
// docker-compose.yml + `make migrate`) to run these; otherwise they skip.
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
	if _, err := pool.Exec(context.Background(), `SELECT 1 FROM pearl_awards LIMIT 0`); err != nil {
		pool.Close()
		t.Skipf("skipping integration test: schema not migrated: %v", err)
	}
	return pool
}

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

// TestAwardPearlsIfUnderDailyCap_StopsAtCapSequentially is the baseline
// business rule: once dailyCap awards have been recorded for a reason, the
// next call must be refused and the balance must stay put.
func TestAwardPearlsIfUnderDailyCap_StopsAtCapSequentially(t *testing.T) {
	pool := testPool(t)
	defer pool.Close()
	repo := NewUserRepo(pool)
	ctx := context.Background()

	userID := createTestUser(t, pool)
	const reason = "wave_survived"
	const amount = 1
	const dailyCap = 3
	since := time.Now().Add(-time.Hour)

	var lastBalance int
	for i := 0; i < dailyCap; i++ {
		balance, awarded, err := repo.AwardPearlsIfUnderDailyCap(ctx, userID, reason, amount, dailyCap, since)
		require.NoError(t, err)
		assert.True(t, awarded, "award %d of %d should be granted", i+1, dailyCap)
		lastBalance = balance
	}
	assert.Equal(t, dailyCap*amount, lastBalance)

	balance, awarded, err := repo.AwardPearlsIfUnderDailyCap(ctx, userID, reason, amount, dailyCap, since)
	require.NoError(t, err)
	assert.False(t, awarded, "the award beyond the daily cap must be refused")
	assert.Equal(t, lastBalance, balance, "balance must not change when the cap blocks the award")

	var count int
	require.NoError(t, pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM pearl_awards WHERE user_id = $1 AND reason = $2`, userID, reason,
	).Scan(&count))
	assert.Equal(t, dailyCap, count, "no more than dailyCap rows may ever be recorded for this reason")
}

// TestAwardPearlsIfUnderDailyCap_ConcurrentCallsNeverExceedCap is the core
// guarantee: many goroutines racing to award the same (user, reason) must
// still end up with at most dailyCap awards, because AwardPearlsIfUnderDailyCap
// serializes the count-then-insert check with a Postgres advisory lock
// (pg_advisory_xact_lock). Without that lock, concurrent transactions could
// each read count < dailyCap before any of them commits their insert, and
// all slip past the cap.
func TestAwardPearlsIfUnderDailyCap_ConcurrentCallsNeverExceedCap(t *testing.T) {
	pool := testPool(t)
	defer pool.Close()
	repo := NewUserRepo(pool)
	ctx := context.Background()

	userID := createTestUser(t, pool)
	const reason = "notification_design_confirm"
	const amount = 3
	const dailyCap = 3
	const concurrentCalls = 20
	since := time.Now().Add(-time.Hour)

	var wg sync.WaitGroup
	var mu sync.Mutex
	awardedCount := 0
	errs := make([]error, 0)

	for i := 0; i < concurrentCalls; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, awarded, err := repo.AwardPearlsIfUnderDailyCap(ctx, userID, reason, amount, dailyCap, since)
			mu.Lock()
			defer mu.Unlock()
			if err != nil {
				errs = append(errs, err)
				return
			}
			if awarded {
				awardedCount++
			}
		}()
	}
	wg.Wait()

	require.Empty(t, errs, "no concurrent award call should error")
	assert.Equal(t, dailyCap, awardedCount, "exactly dailyCap of the concurrent calls should have been awarded")

	var count int
	require.NoError(t, pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM pearl_awards WHERE user_id = $1 AND reason = $2 AND created_at >= $3`,
		userID, reason, since,
	).Scan(&count))
	assert.Equal(t, dailyCap, count, "the daily cap must hold even under concurrent award attempts")

	balance, err := repo.GetPearlBalance(ctx, userID)
	require.NoError(t, err)
	assert.Equal(t, dailyCap*amount, balance, "balance must reflect exactly the capped number of awards")
}
