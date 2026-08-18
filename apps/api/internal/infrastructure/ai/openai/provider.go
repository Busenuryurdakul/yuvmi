// Package openai adapts the OpenAI Responses API to the domain's
// ai/service.Provider port, interchangeable with the anthropic and gemini
// packages.
package openai

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	aiService "github.com/masterfabric-go/masterfabric/internal/domain/ai/service"
	sdk "github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/option"
	"github.com/openai/openai-go/v3/responses"
)

type Provider struct {
	client  sdk.Client
	model   string
	enabled bool
}

type Config struct {
	APIKey  string
	Model   string
	Timeout time.Duration
}

const (
	// DefaultModel is a small, fast model: these generations are a handful of
	// short Turkish suggestions on an onboarding screen, not deep reasoning.
	// Override with AI_MODEL to trade cost for quality.
	DefaultModel = "gpt-5.4-mini"

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

	return &Provider{
		client: sdk.NewClient(
			option.WithAPIKey(cfg.APIKey),
			option.WithRequestTimeout(cfg.Timeout),
		),
		model:   cfg.Model,
		enabled: true,
	}
}

func (p *Provider) Name() string { return "openai" }

func (p *Provider) Available() bool { return p.enabled }

func (p *Provider) GenerateJSON(ctx context.Context, req aiService.GenerationRequest) (*aiService.GenerationResult, error) {
	if !p.enabled {
		return nil, fmt.Errorf("openai provider not configured")
	}

	maxTokens := req.MaxTokens
	if maxTokens <= 0 {
		maxTokens = 4096
	}

	schemaName := req.SchemaName
	if schemaName == "" {
		schemaName = "yuvmi_suggestion"
	}

	resp, err := p.client.Responses.New(ctx, responses.ResponseNewParams{
		Model: p.model,
		// Guardrails go in Instructions and the user's own words in Input, so
		// user-authored text is never read as policy — the same boundary the
		// other two adapters enforce.
		Instructions:    sdk.String(req.System),
		Input:           responses.ResponseNewParamsInputUnion{OfString: sdk.String(req.UserContext)},
		MaxOutputTokens: sdk.Int(int64(maxTokens)),
		Text: responses.ResponseTextConfigParam{
			Format: responses.ResponseFormatTextConfigUnionParam{
				OfJSONSchema: &responses.ResponseFormatTextJSONSchemaConfigParam{
					Name:   schemaName,
					Schema: req.Schema,
					// Strict decoding is safe here: the shared schemas already
					// set additionalProperties:false and mark every property
					// required, which is exactly what strict mode demands.
					Strict: sdk.Bool(true),
				},
			},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("openai create response: %w", err)
	}

	// An incomplete response carries truncated or empty output — usually the
	// token cap or a content filter. Naming it beats a confusing parse error.
	if resp.Status == responses.ResponseStatusIncomplete {
		return nil, fmt.Errorf("openai returned an incomplete response (reason: %s)",
			resp.IncompleteDetails.Reason)
	}

	payload := strings.TrimSpace(resp.OutputText())
	if payload == "" {
		return nil, fmt.Errorf("openai returned no text content (status: %s)", resp.Status)
	}
	if !json.Valid([]byte(payload)) {
		return nil, fmt.Errorf("openai returned non-JSON content")
	}

	return &aiService.GenerationResult{
		Content:    json.RawMessage(payload),
		TokensUsed: int(resp.Usage.InputTokens + resp.Usage.OutputTokens),
		Model:      resp.Model,
	}, nil
}
