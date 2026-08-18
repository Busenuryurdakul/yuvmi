package usecase

import (
	"strings"

	"github.com/masterfabric-go/masterfabric/internal/application/ai/dto"
)

// The API's JSON Schema subset supports neither item counts nor string
// lengths, so the model is asked for these in prose and held to them here.
// Treating the limits as advisory and enforcing them after the fact keeps a
// verbose generation from breaking the onboarding layout.
const (
	maxGoalSuggestions = 6
	maxPlanTemplates   = 5
	maxStepsPerPlan    = 4

	maxTitleLen       = 60
	maxDescriptionLen = 160
)

// validateGoalSuggestions drops unusable entries and caps the list. Over-long
// text is truncated on a word boundary rather than discarded: a slightly long
// chip is still a good suggestion, and dropping it would leave the row short.
func validateGoalSuggestions(raw []string) []string {
	out := make([]string, 0, len(raw))
	seen := make(map[string]struct{}, len(raw))

	for _, s := range raw {
		s = strings.TrimSpace(s)
		if s == "" {
			continue
		}
		s = truncateWords(s, maxTitleLen)

		// The model occasionally restates a suggestion with different wording;
		// two near-identical chips look like a bug to the user.
		key := strings.ToLower(s)
		if _, dup := seen[key]; dup {
			continue
		}
		seen[key] = struct{}{}

		out = append(out, s)
		if len(out) == maxGoalSuggestions {
			break
		}
	}
	return out
}

// validatePlanTemplates enforces the card and step limits. A template with no
// usable steps is dropped entirely — a plan card the user cannot act on is
// worse than one fewer option.
func validatePlanTemplates(raw []dto.PlanTemplateSuggestion) []dto.PlanTemplateSuggestion {
	out := make([]dto.PlanTemplateSuggestion, 0, len(raw))

	for _, tpl := range raw {
		title := truncateWords(strings.TrimSpace(tpl.Title), maxTitleLen)
		if title == "" {
			continue
		}

		steps := make([]dto.PlanStepSuggestion, 0, len(tpl.Steps))
		for _, step := range tpl.Steps {
			stepTitle := truncateWords(strings.TrimSpace(step.Title), maxTitleLen)
			if stepTitle == "" {
				continue
			}
			steps = append(steps, dto.PlanStepSuggestion{
				// Re-index rather than trusting the model's dayOffset: the
				// activation path picks the step for day 0, so a duplicated or
				// skipped offset would silently produce the wrong first task.
				DayOffset:   len(steps),
				Title:       stepTitle,
				Description: truncateWords(strings.TrimSpace(step.Description), maxDescriptionLen),
			})
			if len(steps) == maxStepsPerPlan {
				break
			}
		}
		if len(steps) == 0 {
			continue
		}

		out = append(out, dto.PlanTemplateSuggestion{
			Title:       title,
			Description: truncateWords(strings.TrimSpace(tpl.Description), maxDescriptionLen),
			Steps:       steps,
		})
		if len(out) == maxPlanTemplates {
			break
		}
	}
	return out
}

// truncateWords shortens s to at most max characters, cutting at the last word
// boundary so the result does not end mid-word. Counting is over runes, since
// Turkish text is multi-byte and a byte slice could split a character.
func truncateWords(s string, max int) string {
	runes := []rune(s)
	if len(runes) <= max {
		return s
	}
	cut := string(runes[:max])
	if idx := strings.LastIndex(cut, " "); idx > 0 {
		cut = cut[:idx]
	}
	return strings.TrimRight(strings.TrimSpace(cut), ",;:-")
}
