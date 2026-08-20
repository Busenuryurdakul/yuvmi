// Package anthropic adapts the Anthropic Messages API to the domain's
// ai/service.Provider port. Nothing above this package knows which vendor
// serves a generation.
package anthropic

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	sdk "github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
	aiService "github.com/masterfabric-go/masterfabric/internal/domain/ai/service"
)

// Provider talks to the Anthropic Messages API with structured outputs.
type Provider struct {
	client  sdk.Client
	model   string
	effort  sdk.OutputConfigEffort
	enabled bool
}

// Config holds the settings NewProvider needs. An empty APIKey yields a
// disabled provider rather than an error, so a developer without a key gets
// the offline fallback instead of a boot failure.
type Config struct {
	APIKey  string
	Model   string
	Effort  string
	Timeout time.Duration
}

const (
	// DefaultModel is the current Opus generation. Overridable via config so
	// changing models is an env edit, not a redeploy of new code.
	DefaultModel = "claude-opus-5"

	// defaultEffort is low because these are short, well-specified generations
	// (a handful of Turkish goal or plan suggestions) sitting on an onboarding
	// screen with a P95 latency budget of 25s (PRD-AI 11). Raise it via
	// AI_EFFORT if suggestion quality proves insufficient.
	defaultEffort = "low"

	defaultTimeout = 30 * time.Second
)

func NewProvider(cfg Config) *Provider {
	if cfg.APIKey == "" {
		return &Provider{enabled: false}
	}
	if cfg.Model == "" {
		cfg.Model = DefaultModel
	}
	if cfg.Timeout <= 0 {
		cfg.Timeout = defaultTimeout
	}
	effort := sdk.OutputConfigEffort(cfg.Effort)
	if cfg.Effort == "" {
		effort = sdk.OutputConfigEffort(defaultEffort)
	}

	return &Provider{
		client: sdk.NewClient(
			option.WithAPIKey(cfg.APIKey),
			option.WithRequestTimeout(cfg.Timeout),
		),
		model:   cfg.Model,
		effort:  effort,
		enabled: true,
	}
}

func (p *Provider) Name() string { return "anthropic" }

func (p *Provider) Available() bool { return p.enabled }

func (p *Provider) GenerateJSON(ctx context.Context, req aiService.GenerationRequest) (*aiService.GenerationResult, error) {
	if !p.enabled {
		return nil, fmt.Errorf("anthropic provider not configured")
	}

	maxTokens := req.MaxTokens
	if maxTokens <= 0 {
		maxTokens = 4096
	}

	params := sdk.MessageNewParams{
		Model:     sdk.Model(p.model),
		MaxTokens: int64(maxTokens),
		System: []sdk.TextBlockParam{{
			Text: req.System,
			// The guardrail prompt is identical across every user, so caching it
			// makes each additional call read the prefix instead of re-billing it.
			CacheControl: sdk.NewCacheControlEphemeralParam(),
		}},
		Messages: []sdk.MessageParam{
			// User-authored context goes in a user turn, never the system prompt:
			// it is untrusted input, and this is the boundary that keeps a
			// sentence the user typed from being read as instructions.
			sdk.NewUserMessage(sdk.NewTextBlock(req.UserContext)),
		},
		OutputConfig: sdk.OutputConfigParam{
			Effort: p.effort,
			Format: sdk.JSONOutputFormatParam{Schema: req.Schema},
		},
	}

	resp, err := p.client.Messages.New(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("anthropic message create: %w", err)
	}

	// Safety classifiers can decline a request with HTTP 200 and an empty or
	// partial body. Checking stop_reason before reading content keeps that from
	// surfacing as a confusing parse failure.
	if resp.StopReason == sdk.StopReasonRefusal {
		return nil, fmt.Errorf("anthropic declined the request (category: %s)", resp.StopDetails.Category)
	}

	var text strings.Builder
	for _, block := range resp.Content {
		if tb, ok := block.AsAny().(sdk.TextBlock); ok {
			text.WriteString(tb.Text)
		}
	}
	payload := strings.TrimSpace(text.String())
	if payload == "" {
		return nil, fmt.Errorf("anthropic returned no text content (stop reason: %s)", resp.StopReason)
	}
	if !json.Valid([]byte(payload)) {
		return nil, fmt.Errorf("anthropic returned non-JSON content")
	}

	return &aiService.GenerationResult{
		Content:    json.RawMessage(payload),
		TokensUsed: int(resp.Usage.InputTokens + resp.Usage.OutputTokens),
		Model:      string(resp.Model),
	}, nil
}
