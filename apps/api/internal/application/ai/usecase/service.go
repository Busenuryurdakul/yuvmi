// Package usecase holds the AI orchestrator: the single place where a consent
// check, a quota check, a prompt build and a provider call are sequenced. No
// handler talks to a Provider directly, so the consent gate cannot be bypassed
// by adding an endpoint.
package usecase

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/ai/dto"
	aimodel "github.com/masterfabric-go/masterfabric/internal/domain/ai/model"
	airepo "github.com/masterfabric-go/masterfabric/internal/domain/ai/repository"
	aiService "github.com/masterfabric-go/masterfabric/internal/domain/ai/service"
	fsRepo "github.com/masterfabric-go/masterfabric/internal/domain/futureself/repository"
	goalRepo "github.com/masterfabric-go/masterfabric/internal/domain/goal/repository"
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

type Service struct {
	consents   airepo.ConsentRepository
	jobs       airepo.JobRepository
	provider   aiService.Provider
	futureSelf fsRepo.FutureSelfRepository
	goals      goalRepo.GoalRepository
	cfg        config.AIConfig
}

type Deps struct {
	Consents   airepo.ConsentRepository
	Jobs       airepo.JobRepository
	Provider   aiService.Provider
	FutureSelf fsRepo.FutureSelfRepository
	Goals      goalRepo.GoalRepository
	Cfg        config.AIConfig
}

func NewService(deps Deps) *Service {
	return &Service{
		consents:   deps.Consents,
		jobs:       deps.Jobs,
		provider:   deps.Provider,
		futureSelf: deps.FutureSelf,
		goals:      deps.Goals,
		cfg:        deps.Cfg,
	}
}

// --- Consent ---

// ListConsents returns one row per known scope. Scopes the user has never been
// asked about come back as denied rather than being omitted, so the settings
// screen can render a complete toggle list without knowing the scope set.
func (s *Service) ListConsents(ctx context.Context, userID uuid.UUID) ([]dto.ConsentResponse, error) {
	stored, err := s.consents.ListByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	byScope := make(map[aimodel.ConsentScope]dto.ConsentResponse, len(stored))
	for _, c := range stored {
		byScope[c.Scope] = dto.ConsentResponse{
			Scope: c.Scope, Granted: c.Granted, GrantedAt: c.GrantedAt, RevokedAt: c.RevokedAt,
		}
	}

	all := aimodel.AllScopes()
	out := make([]dto.ConsentResponse, 0, len(all))
	for _, scope := range all {
		if existing, ok := byScope[scope]; ok {
			out = append(out, existing)
			continue
		}
		out = append(out, dto.ConsentResponse{Scope: scope, Granted: false})
	}
	return out, nil
}

// SetConsent grants or revokes one scope. Revoking also cancels that scope's
// unfinished jobs (PRD-AI 04, rule 6): permission withdrawn must stop work
// already in flight, not just work not yet started.
func (s *Service) SetConsent(ctx context.Context, userID uuid.UUID, scope aimodel.ConsentScope, granted bool) (*dto.ConsentResponse, error) {
	if !scope.Valid() {
		return nil, domainErr.New(domainErr.ErrValidation, "unknown consent scope", nil)
	}
	consent, err := s.consents.Set(ctx, userID, scope, granted)
	if err != nil {
		return nil, err
	}
	if !granted {
		if err := s.jobs.CancelPending(ctx, userID, scope); err != nil {
			// The consent record is already durable and is what gates future
			// work, so a stale job row must not fail the revocation.
			slog.ErrorContext(ctx, "cancel pending ai jobs after consent revoke failed",
				"user_id", userID, "scope", scope, "error", err)
		}
	}
	return &dto.ConsentResponse{
		Scope: consent.Scope, Granted: consent.Granted,
		GrantedAt: consent.GrantedAt, RevokedAt: consent.RevokedAt,
	}, nil
}

// hasConsent reports whether the user granted a scope. A missing row means the
// user was never asked, which is not consent — so the default is deny.
func (s *Service) hasConsent(ctx context.Context, userID uuid.UUID, scope aimodel.ConsentScope) (bool, error) {
	consent, err := s.consents.Get(ctx, userID, scope)
	if err != nil {
		if errors.Is(err, domainErr.ErrNotFound) {
			return false, nil
		}
		return false, err
	}
	return consent.Granted, nil
}

// --- Suggestions ---

// GoalSuggestions produces the onboarding step-3 goal chips from the user's
// approved or draft Future Self profile.
func (s *Service) GoalSuggestions(ctx context.Context, userID uuid.UUID) (*dto.GoalSuggestionsResponse, error) {
	// Gate before reading the profile: a user who has not consented should not
	// have their Future Self loaded into memory to build a prompt that will
	// never be sent.
	if err := s.guard(ctx, userID, aimodel.ScopeProfileGeneration); err != nil {
		return nil, err
	}

	fs, err := s.futureSelf.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	var payload struct {
		Suggestions []string `json:"suggestions"`
	}
	jobID, err := s.generate(ctx, userID, aimodel.ScopeProfileGeneration,
		buildGoalContext(fs), goalSuggestionSchema, &payload)
	if err != nil {
		return nil, err
	}

	suggestions := validateGoalSuggestions(payload.Suggestions)
	if len(suggestions) == 0 {
		// Schema-valid but useless output (all entries empty or over-long) is
		// still a failed generation as far as the product is concerned.
		s.failJob(ctx, jobID, aimodel.ErrCodeInvalidOutput)
		return nil, domainErr.New(domainErr.ErrInternal, "ai returned no usable suggestions", nil)
	}

	return &dto.GoalSuggestionsResponse{Suggestions: suggestions, JobID: jobID}, nil
}

// PlanSuggestions produces the onboarding step-4 plan cards. It needs both the
// profile and the goal, so it runs after the goal step.
func (s *Service) PlanSuggestions(ctx context.Context, userID uuid.UUID) (*dto.PlanSuggestionsResponse, error) {
	if err := s.guard(ctx, userID, aimodel.ScopePlanGeneration); err != nil {
		return nil, err
	}

	fs, err := s.futureSelf.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	goal, err := s.goals.GetLatestByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	var payload struct {
		Templates []dto.PlanTemplateSuggestion `json:"templates"`
	}
	jobID, err := s.generate(ctx, userID, aimodel.ScopePlanGeneration,
		buildPlanContext(fs, goal), planSuggestionSchema, &payload)
	if err != nil {
		return nil, err
	}

	templates := validatePlanTemplates(payload.Templates)
	if len(templates) == 0 {
		s.failJob(ctx, jobID, aimodel.ErrCodeInvalidOutput)
		return nil, domainErr.New(domainErr.ErrInternal, "ai returned no usable plan templates", nil)
	}

	return &dto.PlanSuggestionsResponse{Templates: templates, JobID: jobID}, nil
}

func (s *Service) GetJob(ctx context.Context, userID, jobID uuid.UUID) (*dto.AIJobResponse, error) {
	job, err := s.jobs.GetByID(ctx, userID, jobID)
	if err != nil {
		return nil, err
	}
	return &dto.AIJobResponse{
		ID: job.ID, Scope: job.Scope, Status: job.Status, ErrorCode: job.ErrorCode,
		TokensUsed: job.TokensUsed, LatencyMs: job.LatencyMs,
		CreatedAt: job.CreatedAt, CompletedAt: job.CompletedAt,
	}, nil
}

// --- Orchestration ---

// guard runs every precondition that does not need the user's content:
// provider availability, consent, and quota. Callers run it before loading any
// profile data, so a request that will be refused never reads — let alone
// assembles into a prompt — the data it was refused access to.
func (s *Service) guard(ctx context.Context, userID uuid.UUID, scope aimodel.ConsentScope) error {
	if s.provider == nil || !s.provider.Available() {
		return domainErr.New(domainErr.ErrNotImplemented, "ai suggestions are not enabled", nil)
	}

	granted, err := s.hasConsent(ctx, userID, scope)
	if err != nil {
		return err
	}
	if !granted {
		return domainErr.New(domainErr.ErrForbidden, "ai consent not granted for this scope", nil)
	}

	return s.checkQuota(ctx, userID, scope)
}

// generate records a job, calls the provider and decodes the model's JSON into
// out. It assumes guard has already passed — callers must not reach it with an
// ungated request.
func (s *Service) generate(
	ctx context.Context,
	userID uuid.UUID,
	scope aimodel.ConsentScope,
	userContext string,
	schema map[string]any,
	out any,
) (uuid.UUID, error) {
	job := &aimodel.Job{
		UserID:    userID,
		Scope:     scope,
		Status:    aimodel.JobRunning,
		InputHash: inputHash(scope, userContext),
	}
	if err := s.jobs.Create(ctx, job); err != nil {
		return uuid.Nil, err
	}

	started := time.Now()
	result, err := s.provider.GenerateJSON(ctx, aiService.GenerationRequest{
		System:      guardrails,
		UserContext: userContext,
		Schema:      schema,
		SchemaName:  string(scope),
		MaxTokens:   s.cfg.MaxTokens,
	})
	latency := int(time.Since(started).Milliseconds())

	if err != nil {
		code := aimodel.ErrCodeProvider
		if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) {
			code = aimodel.ErrCodeTimeout
		}
		if failErr := s.jobs.Fail(ctx, job.ID, code, latency); failErr != nil {
			slog.ErrorContext(ctx, "record ai job failure failed", "job_id", job.ID, "error", failErr)
		}
		// The provider error is logged but not returned: vendor messages can
		// echo prompt content, which would put user text in a client response.
		slog.ErrorContext(ctx, "ai generation failed",
			"user_id", userID, "scope", scope, "job_id", job.ID, "error", err)
		return uuid.Nil, domainErr.New(domainErr.ErrInternal, "ai generation failed", nil)
	}

	if err := json.Unmarshal(result.Content, out); err != nil {
		s.failJob(ctx, job.ID, aimodel.ErrCodeInvalidOutput)
		slog.ErrorContext(ctx, "ai output did not match schema",
			"user_id", userID, "scope", scope, "job_id", job.ID, "error", err)
		return uuid.Nil, domainErr.New(domainErr.ErrInternal, "ai returned malformed output", nil)
	}

	if err := s.jobs.Complete(ctx, job.ID, result.TokensUsed, latency, s.provider.Name()); err != nil {
		slog.ErrorContext(ctx, "record ai job completion failed", "job_id", job.ID, "error", err)
	}
	return job.ID, nil
}

// checkQuota enforces the per-user, per-scope daily cap. A quota of zero or
// less disables the check, which is how a self-hosted deployment opts out.
func (s *Service) checkQuota(ctx context.Context, userID uuid.UUID, scope aimodel.ConsentScope) error {
	if s.cfg.DailyQuota <= 0 {
		return nil
	}
	since := time.Now().UTC().Truncate(24 * time.Hour)
	count, err := s.jobs.CountSince(ctx, userID, scope, since)
	if err != nil {
		return err
	}
	if count >= s.cfg.DailyQuota {
		return domainErr.New(domainErr.ErrRateLimited, "daily ai limit reached for this feature", nil)
	}
	return nil
}

// failJob records a terminal failure best-effort. The caller is already
// returning an error to the user, so a bookkeeping write that fails must not
// replace that error with a less useful one.
func (s *Service) failJob(ctx context.Context, jobID uuid.UUID, code string) {
	if err := s.jobs.Fail(ctx, jobID, code, 0); err != nil {
		slog.ErrorContext(ctx, "record ai job failure failed", "job_id", jobID, "error", err)
	}
}

// inputHash fingerprints the prompt context so duplicate work is visible in
// ai_jobs without the table ever storing what the user wrote.
func inputHash(scope aimodel.ConsentScope, userContext string) string {
	sum := sha256.Sum256([]byte(fmt.Sprintf("%s|%s", scope, userContext)))
	return hex.EncodeToString(sum[:])
}
