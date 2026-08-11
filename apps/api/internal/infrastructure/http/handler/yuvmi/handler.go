package yuvmi

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
	"github.com/masterfabric-go/masterfabric/internal/shared/validator"
	"github.com/masterfabric-go/masterfabric/internal/application/yuvmi/dto"
	"github.com/masterfabric-go/masterfabric/internal/application/yuvmi/usecase"
	"github.com/masterfabric-go/masterfabric/internal/shared/response"
)

type Handler struct {
	svc *usecase.Service
}

func NewHandler(svc *usecase.Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) GetMe(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		response.YuvmiFail(w, errUnauthorized())
		return
	}
	data, err := h.svc.GetMe(r.Context(), userID)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) UpdateMe(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		response.YuvmiFail(w, errUnauthorized())
		return
	}
	var req dto.UpdateProfileRequest
	if err := validator.DecodeAndValidate(r, &req); err != nil {
		response.YuvmiFail(w, err)
		return
	}
	data, err := h.svc.UpdateMe(r.Context(), userID, req)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) CreateFutureSelf(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	var req dto.CreateFutureSelfRequest
	if err := validator.DecodeAndValidate(r, &req); err != nil {
		response.YuvmiFail(w, err)
		return
	}
	data, err := h.svc.CreateFutureSelf(r.Context(), userID, req)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiCreated(w, data)
}

func (h *Handler) GetFutureSelf(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	data, err := h.svc.GetFutureSelf(r.Context(), userID)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) UpdateFutureSelf(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	var req dto.CreateFutureSelfRequest
	if err := validator.DecodeAndValidate(r, &req); err != nil {
		response.YuvmiFail(w, err)
		return
	}
	data, err := h.svc.UpdateFutureSelf(r.Context(), userID, req)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) ApproveFutureSelf(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	data, err := h.svc.ApproveFutureSelf(r.Context(), userID)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) CreateGoal(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	var req dto.CreateGoalRequest
	if err := validator.DecodeAndValidate(r, &req); err != nil {
		response.YuvmiFail(w, err)
		return
	}
	data, err := h.svc.CreateGoal(r.Context(), userID, req)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiCreated(w, data)
}

func (h *Handler) GetActiveGoal(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	data, err := h.svc.GetActiveGoal(r.Context(), userID)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) CreatePlan(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	var req dto.CreatePlanRequest
	if err := validator.DecodeAndValidate(r, &req); err != nil {
		response.YuvmiFail(w, err)
		return
	}
	data, err := h.svc.CreatePlan(r.Context(), userID, req)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiCreated(w, data)
}

func (h *Handler) GetActivePlan(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	data, err := h.svc.GetActivePlan(r.Context(), userID)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) ActivatePlan(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	planID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	data, err := h.svc.ActivatePlan(r.Context(), userID, planID)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) GetTodayTask(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	data, err := h.svc.GetTodayTask(r.Context(), userID)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) CompleteTask(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	taskID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	data, err := h.svc.CompleteTask(r.Context(), userID, taskID)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) SkipTask(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	taskID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	var req dto.SkipTaskRequest
	_ = validator.DecodeAndValidate(r, &req)
	data, err := h.svc.SkipTask(r.Context(), userID, taskID, req.Reason)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) GetTodayCheckin(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	data, err := h.svc.GetTodayCheckin(r.Context(), userID)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) UpsertCheckin(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	var req dto.UpsertCheckinRequest
	if err := validator.DecodeAndValidate(r, &req); err != nil {
		response.YuvmiFail(w, err)
		return
	}
	data, err := h.svc.UpsertCheckin(r.Context(), userID, req)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) GetTodayAlignment(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	data, err := h.svc.GetTodayAlignment(r.Context(), userID)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) GetAlignmentHistory(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	data, err := h.svc.GetAlignmentHistory(r.Context(), userID)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func mustUserID(w http.ResponseWriter, r *http.Request) uuid.UUID {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		response.YuvmiFail(w, errUnauthorized())
		return uuid.Nil
	}
	return userID
}

func errUnauthorized() error {
	return domainErr.New(domainErr.ErrUnauthorized, "not authenticated", nil)
}
