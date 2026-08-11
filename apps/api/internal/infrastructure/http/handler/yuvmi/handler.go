package yuvmi

import (
	"io"
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

func (h *Handler) GetCurrentWeeklyReview(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	data, err := h.svc.GetOrCreateCurrentWeeklyReview(r.Context(), userID)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) ListWeeklyReviews(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	data, err := h.svc.ListWeeklyReviews(r.Context(), userID)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) UpdateWeeklyReview(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	reviewID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	var req dto.UpdateWeeklyReviewRequest
	if err := validator.DecodeAndValidate(r, &req); err != nil {
		response.YuvmiFail(w, err)
		return
	}
	data, err := h.svc.UpdateWeeklyReview(r.Context(), userID, reviewID, req)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) ApplyWeeklyReview(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	reviewID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	data, err := h.svc.ApplyWeeklyReview(r.Context(), userID, reviewID)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) ListPlans(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	data, err := h.svc.ListPlans(r.Context(), userID)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) GetPlan(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	planID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	data, err := h.svc.GetPlan(r.Context(), userID, planID)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) RevisePlan(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	var req dto.RevisePlanRequest
	if err := validator.DecodeAndValidate(r, &req); err != nil {
		response.YuvmiFail(w, err)
		return
	}
	data, err := h.svc.RevisePlan(r.Context(), userID, req)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) GetPlanDiff(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	fromID, err := uuid.Parse(chi.URLParam(r, "fromId"))
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	toID, err := uuid.Parse(chi.URLParam(r, "toId"))
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	data, err := h.svc.GetPlanDiff(r.Context(), userID, fromID, toID)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) RegisterPushToken(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	var req dto.RegisterPushTokenRequest
	if err := validator.DecodeAndValidate(r, &req); err != nil {
		response.YuvmiFail(w, err)
		return
	}
	if err := h.svc.RegisterPushToken(r.Context(), userID, req); err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiNoContent(w)
}

func (h *Handler) SendTestPush(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	if err := h.svc.SendTestPush(r.Context(), userID); err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiNoContent(w)
}

func (h *Handler) ListNotifications(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	data, err := h.svc.ListNotifications(r.Context(), userID)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) MarkNotificationRead(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	notificationID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	if err := h.svc.MarkNotificationRead(r.Context(), userID, notificationID); err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiNoContent(w)
}

func (h *Handler) GetUnreadNotificationCount(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	data, err := h.svc.GetUnreadNotificationCount(r.Context(), userID)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) ListSpaces(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	data, err := h.svc.ListSpaces(r.Context(), userID)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) CreateSpace(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	var req dto.CreateSpaceRequest
	if err := validator.DecodeAndValidate(r, &req); err != nil {
		response.YuvmiFail(w, err)
		return
	}
	data, err := h.svc.CreateSpace(r.Context(), userID, req)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiCreated(w, data)
}

func (h *Handler) GetSpace(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	spaceID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	data, err := h.svc.GetSpace(r.Context(), userID, spaceID)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) CreateSpaceInvite(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	spaceID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	var req dto.CreateSpaceInviteRequest
	if err := validator.DecodeAndValidate(r, &req); err != nil {
		response.YuvmiFail(w, err)
		return
	}
	data, err := h.svc.CreateSpaceInvite(r.Context(), userID, spaceID, req)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiCreated(w, data)
}

func (h *Handler) ListPendingSpaceInvites(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	data, err := h.svc.ListPendingInvites(r.Context(), userID)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) AcceptSpaceInvite(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	inviteID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	data, err := h.svc.AcceptSpaceInvite(r.Context(), userID, inviteID)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) DeclineSpaceInvite(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	inviteID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	if err := h.svc.DeclineSpaceInvite(r.Context(), userID, inviteID); err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiNoContent(w)
}

func (h *Handler) LeaveSpace(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	spaceID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	if err := h.svc.LeaveSpace(r.Context(), userID, spaceID); err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiNoContent(w)
}

func (h *Handler) UploadAsset(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	if err := r.ParseMultipartForm(30 << 20); err != nil {
		response.YuvmiFail(w, domainErr.New(domainErr.ErrValidation, "invalid multipart form", err))
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		response.YuvmiFail(w, domainErr.New(domainErr.ErrValidation, "file required", err))
		return
	}
	defer file.Close()
	title := r.FormValue("title")
	data, err := h.svc.UploadAsset(r.Context(), userID, title, header.Filename, header.Header.Get("Content-Type"), header.Size, file)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiCreated(w, data)
}

func (h *Handler) ListMyAssets(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	data, err := h.svc.ListMyAssets(r.Context(), userID)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) GetAsset(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	assetID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	data, err := h.svc.GetAsset(r.Context(), userID, assetID)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) GetAssetContent(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	assetID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	rc, mimeType, err := h.svc.GetAssetContent(r.Context(), userID, assetID)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	defer rc.Close()
	w.Header().Set("Content-Type", mimeType)
	w.Header().Set("Cache-Control", "private, max-age=3600")
	_, _ = io.Copy(w, rc)
}

func (h *Handler) ShareAsset(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	assetID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	var req dto.ShareAssetRequest
	if err := validator.DecodeAndValidate(r, &req); err != nil {
		response.YuvmiFail(w, err)
		return
	}
	data, err := h.svc.ShareAsset(r.Context(), userID, assetID, req)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) RevokeAssetFromSpace(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	assetID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	data, err := h.svc.RevokeAssetFromSpace(r.Context(), userID, assetID)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) ListSpaceAssets(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	spaceID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	data, err := h.svc.ListSpaceAssets(r.Context(), userID, spaceID)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) GetSubscription(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	data, err := h.svc.GetSubscription(r.Context(), userID)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) DevUpgradeSubscription(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	data, err := h.svc.DevUpgradeSubscription(r.Context(), userID)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) CreateSubscriptionCheckout(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	data, err := h.svc.CreateSubscriptionCheckout(r.Context(), userID)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) CancelSubscription(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	data, err := h.svc.CancelSubscription(r.Context(), userID)
	if err != nil {
		response.YuvmiFail(w, err)
		return
	}
	response.YuvmiData(w, http.StatusOK, data)
}

func (h *Handler) StripeWebhook(w http.ResponseWriter, r *http.Request) {
	payload, err := usecase.ReadStripeWebhookBody(r.Body, 1<<20)
	if err != nil {
		response.YuvmiFail(w, domainErr.New(domainErr.ErrBadRequest, "invalid webhook body", err))
		return
	}
	if err := h.svc.HandleStripeWebhook(r.Context(), payload, r.Header.Get("Stripe-Signature")); err != nil {
		response.YuvmiFail(w, err)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (h *Handler) ExportUserData(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(w, r)
	if userID == uuid.Nil {
		return
	}
	data, err := h.svc.ExportUserData(r.Context(), userID)
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
