package ai

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/ai/dto"
	"github.com/masterfabric-go/masterfabric/internal/application/ai/usecase"
	aimodel "github.com/masterfabric-go/masterfabric/internal/domain/ai/model"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
	"github.com/masterfabric-go/masterfabric/internal/shared/response"
	"github.com/masterfabric-go/masterfabric/internal/shared/validator"
)

type Handler struct {
	svc *usecase.Service
}

func NewHandler(svc *usecase.Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) ListConsents(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	data, err := h.svc.ListConsents(r.Context(), userID)
	respond(w, data, err)
}

func (h *Handler) UpdateConsent(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	scope := aimodel.ConsentScope(chi.URLParam(r, "scope"))
	if !scope.Valid() {
		response.YuvmiFail(w, domainErr.New(domainErr.ErrValidation, "unknown consent scope", nil))
		return
	}
	var req dto.UpdateConsentRequest
	if err := decodeAndValidate(r, &req); err != nil {
		response.YuvmiFail(w, err)
		return
	}
	data, err := h.svc.SetConsent(r.Context(), userID, scope, *req.Granted)
	respond(w, data, err)
}

// GoalSuggestions backs the onboarding step-3 chips. A non-2xx response is the
// client's cue to render its static list, so failures here are expected
// traffic rather than exceptional.
func (h *Handler) GoalSuggestions(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	data, err := h.svc.GoalSuggestions(r.Context(), userID)
	respond(w, data, err)
}

// PlanSuggestions backs the onboarding step-4 plan cards.
func (h *Handler) PlanSuggestions(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	data, err := h.svc.PlanSuggestions(r.Context(), userID)
	respond(w, data, err)
}

func (h *Handler) GetJob(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	jobID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.YuvmiFail(w, domainErr.New(domainErr.ErrValidation, "invalid job id", err))
		return
	}
	data, err := h.svc.GetJob(r.Context(), userID, jobID)
	respond(w, data, err)
}

// RecordDecision reports what the user did with a suggestion, feeding the
// training corpus behind the ai_training_data scope.
//
// It answers 204 whether or not a sample was labelled. Whether one exists
// depends on a consent the client does not track, and returning 404 for the
// ordinary "training not enabled" case would make every client handle an error
// it cannot act on.
func (h *Handler) RecordDecision(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	jobID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.YuvmiFail(w, domainErr.New(domainErr.ErrValidation, "invalid job id", err))
		return
	}
	var req dto.RecordDecisionRequest
	if err := decodeAndValidate(r, &req); err != nil {
		response.YuvmiFail(w, err)
		return
	}
	if err := h.svc.RecordDecision(
		r.Context(), userID, jobID, aimodel.Decision(req.Decision), req.FinalOutput,
	); err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiNoContent(w)
}

// decodeAndValidate replaces validator.DecodeAndValidate, which returns bare
// errors that HTTPStatusCode cannot classify and so reports as 500 — masking
// the field-level detail the client needs to fix its request. Decoding and
// validation are run separately here so an unparseable body (400) is
// distinguishable from a well-formed body with a bad field (422).
func decodeAndValidate(r *http.Request, target any) error {
	if err := json.NewDecoder(r.Body).Decode(target); err != nil {
		return domainErr.New(domainErr.ErrBadRequest, "invalid JSON body", err)
	}
	if err := validator.ValidateStruct(target); err != nil {
		// The formatted message already names the offending fields, so it is
		// passed as the message and not also wrapped — DomainError.Error()
		// renders both, which would print it twice.
		return domainErr.New(domainErr.ErrValidation, validator.FormatValidationErrors(err), nil)
	}
	return nil
}

func requireUserID(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		response.YuvmiFail(w, domainErr.New(domainErr.ErrUnauthorized, "not authenticated", nil))
		return uuid.UUID{}, false
	}
	return userID, true
}

func respond(w http.ResponseWriter, data any, err error) {
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}
