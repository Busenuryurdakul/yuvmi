package usecase

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	aimodel "github.com/masterfabric-go/masterfabric/internal/domain/ai/model"
	aiService "github.com/masterfabric-go/masterfabric/internal/domain/ai/service"
	fsmodel "github.com/masterfabric-go/masterfabric/internal/domain/futureself/model"
	goalmodel "github.com/masterfabric-go/masterfabric/internal/domain/goal/model"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

// fakeConsents stores grants in a map keyed by scope; a missing key models a
// user who has never been asked.
type fakeConsents struct {
	granted map[aimodel.ConsentScope]bool
}

func newFakeConsents(grants ...aimodel.ConsentScope) *fakeConsents {
	f := &fakeConsents{granted: map[aimodel.ConsentScope]bool{}}
	for _, s := range grants {
		f.granted[s] = true
	}
	return f
}

func (f *fakeConsents) ListByUser(_ context.Context, userID uuid.UUID) ([]aimodel.Consent, error) {
	out := make([]aimodel.Consent, 0, len(f.granted))
	for scope, granted := range f.granted {
		out = append(out, aimodel.Consent{UserID: userID, Scope: scope, Granted: granted})
	}
	return out, nil
}

func (f *fakeConsents) Get(_ context.Context, userID uuid.UUID, scope aimodel.ConsentScope) (*aimodel.Consent, error) {
	granted, ok := f.granted[scope]
	if !ok {
		return nil, domainErr.New(domainErr.ErrNotFound, "consent not found", nil)
	}
	return &aimodel.Consent{UserID: userID, Scope: scope, Granted: granted}, nil
}

func (f *fakeConsents) Set(_ context.Context, userID uuid.UUID, scope aimodel.ConsentScope, granted bool) (*aimodel.Consent, error) {
	f.granted[scope] = granted
	return &aimodel.Consent{UserID: userID, Scope: scope, Granted: granted}, nil
}

type fakeJobs struct {
	created   []aimodel.Job
	completed int
	failed    []string
	cancelled []aimodel.ConsentScope
	// countSince is what CountSince reports, letting a test simulate a user
	// who has already spent the day's quota.
	countSince int
}

func (f *fakeJobs) Create(_ context.Context, job *aimodel.Job) error {
	if job.ID == uuid.Nil {
		job.ID = uuid.New()
	}
	f.created = append(f.created, *job)
	return nil
}

func (f *fakeJobs) Complete(_ context.Context, _ uuid.UUID, _, _ int, _ string) error {
	f.completed++
	return nil
}

func (f *fakeJobs) Fail(_ context.Context, _ uuid.UUID, errorCode string, _ int) error {
	f.failed = append(f.failed, errorCode)
	return nil
}

func (f *fakeJobs) GetByID(_ context.Context, _, jobID uuid.UUID) (*aimodel.Job, error) {
	for _, j := range f.created {
		if j.ID == jobID {
			return &j, nil
		}
	}
	return nil, domainErr.New(domainErr.ErrNotFound, "ai job not found", nil)
}

func (f *fakeJobs) CountSince(_ context.Context, _ uuid.UUID, _ aimodel.ConsentScope, _ time.Time) (int, error) {
	return f.countSince, nil
}

func (f *fakeJobs) CancelPending(_ context.Context, _ uuid.UUID, scope aimodel.ConsentScope) error {
	f.cancelled = append(f.cancelled, scope)
	return nil
}

type fakeFutureSelf struct {
	fs *fsmodel.FutureSelf
	// reads counts profile lookups, so a test can assert that a refused
	// request never touched the user's content at all.
	reads int
}

func (f *fakeFutureSelf) Create(context.Context, *fsmodel.FutureSelf) error { return nil }
func (f *fakeFutureSelf) Update(context.Context, *fsmodel.FutureSelf) error { return nil }
func (f *fakeFutureSelf) Approve(context.Context, uuid.UUID) error          { return nil }
func (f *fakeFutureSelf) GetByUserID(context.Context, uuid.UUID) (*fsmodel.FutureSelf, error) {
	f.reads++
	if f.fs == nil {
		return nil, domainErr.New(domainErr.ErrNotFound, "future self not found", nil)
	}
	return f.fs, nil
}

type fakeGoals struct {
	goal *goalmodel.Goal
}

func (f *fakeGoals) Create(context.Context, *goalmodel.Goal) error { return nil }
func (f *fakeGoals) Update(context.Context, *goalmodel.Goal) error { return nil }
func (f *fakeGoals) Activate(context.Context, uuid.UUID, uuid.UUID) error {
	return nil
}
func (f *fakeGoals) CountByUserID(context.Context, uuid.UUID) (int, error) { return 0, nil }
func (f *fakeGoals) GetActiveByUserID(context.Context, uuid.UUID) (*goalmodel.Goal, error) {
	return f.goal, nil
}
func (f *fakeGoals) GetByID(context.Context, uuid.UUID, uuid.UUID) (*goalmodel.Goal, error) {
	return f.goal, nil
}
func (f *fakeGoals) GetLatestByUserID(context.Context, uuid.UUID) (*goalmodel.Goal, error) {
	if f.goal == nil {
		return nil, domainErr.New(domainErr.ErrNotFound, "goal not found", nil)
	}
	return f.goal, nil
}

// fakeProvider records the request it was handed so tests can assert on the
// exact prompt text that would have gone to the vendor.
type fakeProvider struct {
	available bool
	response  string
	err       error
	lastReq   *aiService.GenerationRequest
	calls     int
}

func (f *fakeProvider) Name() string    { return "fake" }
func (f *fakeProvider) Available() bool { return f.available }

func (f *fakeProvider) GenerateJSON(_ context.Context, req aiService.GenerationRequest) (*aiService.GenerationResult, error) {
	f.calls++
	f.lastReq = &req
	if f.err != nil {
		return nil, f.err
	}
	return &aiService.GenerationResult{
		Content:    json.RawMessage(f.response),
		TokensUsed: 42,
		Model:      "fake-model",
	}, nil
}
