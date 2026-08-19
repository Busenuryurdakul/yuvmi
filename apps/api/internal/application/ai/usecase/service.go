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
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/ai/dto"
	aimodel "github.com/masterfabric-go/masterfabric/internal/domain/ai/model"
	airepo "github.com/masterfabric-go/masterfabric/internal/domain/ai/repository"
	aiService "github.com/masterfabric-go/masterfabric/internal/domain/ai/service"
	fsmodel "github.com/masterfabric-go/masterfabric/internal/domain/futureself/model"
	fsRepo "github.com/masterfabric-go/masterfabric/internal/domain/futureself/repository"
	goalmodel "github.com/masterfabric-go/masterfabric/internal/domain/goal/model"
	goalRepo "github.com/masterfabric-go/masterfabric/internal/domain/goal/repository"
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

type Service struct {
	consents   airepo.ConsentRepository
	jobs       airepo.JobRepository
	training   airepo.TrainingSampleRepository
	provider   aiService.Provider
	futureSelf fsRepo.FutureSelfRepository
	goals      goalRepo.GoalRepository
	plans      companionPlanSource
	tasks      companionTaskSource
	checkins   companionCheckinSource
	cfg        config.AIConfig
}

type Deps struct {
	Consents airepo.ConsentRepository
	Jobs     airepo.JobRepository
	// Training may be nil. Every call site treats a nil repository as "this
	// deployment does not collect training data", which keeps the corpus an
	// opt-in of the operator as well as of the user.
	Training   airepo.TrainingSampleRepository
	Provider   aiService.Provider
	FutureSelf fsRepo.FutureSelfRepository
	Goals      goalRepo.GoalRepository
	Plans      companionPlanSource
	Tasks      companionTaskSource
	Checkins   companionCheckinSource
	Cfg        config.AIConfig
}

func NewService(deps Deps) *Service {
	return &Service{
		consents:   deps.Consents,
		jobs:       deps.Jobs,
		training:   deps.Training,
		provider:   deps.Provider,
		futureSelf: deps.FutureSelf,
		goals:      deps.Goals,
		plans:      deps.Plans,
		tasks:      deps.Tasks,
		checkins:   deps.Checkins,
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

		// Withdrawing the training permission has to mean the corpus forgets,
		// not merely that it stops growing: the rows already collected are the
		// raw prompts, kept for no purpose the user still permits. This is the
		// one revocation that deletes rather than gates, so unlike the cancel
		// above its failure is returned — reporting success while the samples
		// survive would be a false answer to a privacy request.
		if scope == aimodel.ScopeTrainingData && s.training != nil {
			if err := s.training.DeleteByUser(ctx, userID); err != nil {
				slog.ErrorContext(ctx, "delete ai training samples after consent revoke failed",
					"user_id", userID, "error", err)
				return nil, err
			}
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

const (
	maxCompanionHistory = 8
	maxCompanionMessage = 500
)

// CompanionChat answers one turn of the Yuvmi tab. Profile and goal stay in
// the prompt; plan steps, a 7-day rhythm summary and today's intention are
// attached by allow-list (1–2 slices per question). Nothing here writes back.
func (s *Service) CompanionChat(ctx context.Context, userID uuid.UUID, message string, history []dto.ChatTurn) (*dto.CompanionChatResponse, error) {
	message = strings.TrimSpace(message)
	if message == "" || len([]rune(message)) > maxCompanionMessage {
		return nil, domainErr.New(domainErr.ErrValidation, "message must be 1-500 characters", nil)
	}
	if len(history) > maxCompanionHistory {
		history = history[len(history)-maxCompanionHistory:]
	}

	if err := s.guard(ctx, userID, aimodel.ScopeCompanion); err != nil {
		return nil, err
	}

	fs, err := s.optionalFutureSelf(ctx, userID)
	if err != nil {
		return nil, err
	}
	goal, err := s.optionalGoal(ctx, userID)
	if err != nil {
		return nil, err
	}

	slices := selectCompanionSlices(message)
	var planView *companionPlanView
	var weekView *companionWeekView
	var todayView *companionTodayView
	for _, slice := range slices {
		switch slice {
		case slicePlan:
			planView, err = s.loadCompanionPlan(ctx, userID)
		case sliceWeek:
			weekView, err = s.loadCompanionWeek(ctx, userID)
		case sliceToday:
			todayView, err = s.loadCompanionToday(ctx, userID)
		}
		if err != nil {
			return nil, err
		}
	}
	book := pickCompanionPlaybook(message)
	recordBlock := renderCompanionSlices(planView, weekView, todayView, slices, book)

	turns := make([]companionTurn, 0, len(history))
	for _, h := range history {
		role := strings.TrimSpace(h.Role)
		text := strings.TrimSpace(h.Text)
		if text == "" {
			continue
		}
		if role != "user" && role != "assistant" {
			continue
		}
		turns = append(turns, companionTurn{Role: role, Text: text})
	}

	var payload struct {
		Reply string `json:"reply"`
	}
	jobID, err := s.generate(ctx, userID, aimodel.ScopeCompanion,
		buildCompanionContext(fs, goal, recordBlock, turns, message), companionChatSchema, &payload)
	if err != nil {
		return nil, err
	}

	reply := validateCompanionReply(payload.Reply)
	if reply == "" {
		s.failJob(ctx, jobID, aimodel.ErrCodeInvalidOutput)
		return nil, domainErr.New(domainErr.ErrInternal, "ai returned no usable reply", nil)
	}

	out := &dto.CompanionChatResponse{Reply: reply, JobID: jobID}
	if book != nil {
		out.PlaybookID = book.ID
		out.PlaybookTitle = book.Title
	}
	return out, nil
}

func (s *Service) optionalFutureSelf(ctx context.Context, userID uuid.UUID) (*fsmodel.FutureSelf, error) {
	if s.futureSelf == nil {
		return nil, nil
	}
	fs, err := s.futureSelf.GetByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, domainErr.ErrNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return fs, nil
}

func (s *Service) optionalGoal(ctx context.Context, userID uuid.UUID) (*goalmodel.Goal, error) {
	if s.goals == nil {
		return nil, nil
	}
	goal, err := s.goals.GetLatestByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, domainErr.ErrNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return goal, nil
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
	// Consent is checked before provider availability, and the order matters
	// twice over. It is what PRD-AI 13 specifies ("Consent yok → 403"), and it
	// keeps the answer about the user's own permission independent of server
	// configuration — a caller who has not consented learns nothing about
	// whether AI is wired up on this deployment.
	granted, err := s.hasConsent(ctx, userID, scope)
	if err != nil {
		return err
	}
	if !granted {
		return domainErr.New(domainErr.ErrForbidden, "ai consent not granted for this scope", nil)
	}

	if s.provider == nil || !s.provider.Available() {
		return domainErr.New(domainErr.ErrNotImplemented, "ai suggestions are not enabled", nil)
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

	s.recordTrainingSample(ctx, job, userContext, result)
	return job.ID, nil
}

// recordTrainingSample keeps one generation for later model improvement, if and
// only if the user granted ScopeTrainingData.
//
// The sample is written now, while the output is still in hand, rather than
// when the user decides. Waiting would lose every generation from someone who
// closes the app without answering — which is not a rare edge case but a
// signal in its own right, and the population most worth learning from.
//
// Everything here is best-effort: the user has already been served, and
// failing their request over a corpus write would trade the thing they asked
// for against a thing they will never see.
func (s *Service) recordTrainingSample(
	ctx context.Context,
	job *aimodel.Job,
	userContext string,
	result *aiService.GenerationResult,
) {
	if s.training == nil {
		return
	}

	granted, err := s.hasConsent(ctx, job.UserID, aimodel.ScopeTrainingData)
	if err != nil {
		slog.ErrorContext(ctx, "training consent lookup failed",
			"job_id", job.ID, "error", err)
		return
	}
	if !granted {
		return
	}

	provider := s.provider.Name()
	sample := &aimodel.TrainingSample{
		JobID:         job.ID,
		UserID:        job.UserID,
		Scope:         job.Scope,
		Provider:      &provider,
		PromptContext: userContext,
		Output:        result.Content,
		Decision:      aimodel.DecisionPending,
	}
	if result.Model != "" {
		model := result.Model
		sample.Model = &model
	}

	if err := s.training.Create(ctx, sample); err != nil {
		slog.ErrorContext(ctx, "record ai training sample failed",
			"job_id", job.ID, "error", err)
	}
}

// RecordDecision stores what the user did with a suggestion — the label half of
// a training pair, and the only part of the corpus that carries a judgement.
//
// A job with no sample is the ordinary case rather than an error: it means the
// user never granted the training scope. Clients report decisions without
// knowing whether that scope is on, so a missing sample succeeds silently
// instead of making every caller handle a 404 it cannot act on.
func (s *Service) RecordDecision(
	ctx context.Context,
	userID, jobID uuid.UUID,
	decision aimodel.Decision,
	finalOutput json.RawMessage,
) error {
	if !aimodel.ValidDecision(decision) {
		return domainErr.New(domainErr.ErrValidation, "unknown decision", nil)
	}
	if s.training == nil {
		return nil
	}

	// finalOutput only means something against an "edited" decision. Storing
	// one sent alongside "accepted" or "rejected" would put a value in the
	// column that the export reads as "this is what the user changed it to",
	// which is the opposite of what happened.
	if decision != aimodel.DecisionEdited || len(finalOutput) == 0 {
		finalOutput = nil
	}

	// The repository matches on user_id as well as job_id, so an unrelated job
	// id cannot be labelled or probed for existence.
	if err := s.training.RecordDecision(ctx, userID, jobID, decision, finalOutput); err != nil {
		if errors.Is(err, domainErr.ErrNotFound) {
			return nil
		}
		return err
	}
	return nil
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
