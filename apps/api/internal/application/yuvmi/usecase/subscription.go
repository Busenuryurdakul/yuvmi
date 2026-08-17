package usecase

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/application/yuvmi/dto"
	submodel "github.com/masterfabric-go/masterfabric/internal/domain/subscription/model"
)

const (
	freeMaxGoals  = 1
	freeMaxSpaces = 1

	premiumMaxGoals  = 10
	premiumMaxSpaces = 10
)

func (s *Service) GetSubscription(ctx context.Context, userID uuid.UUID) (*dto.SubscriptionResponse, error) {
	sub, err := s.ensureSubscription(ctx, userID)
	if err != nil {
		return nil, err
	}
	return s.buildSubscriptionResponse(ctx, userID, sub)
}

func (s *Service) DevUpgradeSubscription(ctx context.Context, userID uuid.UUID) (*dto.SubscriptionResponse, error) {
	if !s.yuvmiCfg.AllowDevPremium {
		return nil, domainErr.New(domainErr.ErrForbidden, "dev premium upgrade is disabled", nil)
	}

	provider := submodel.ProviderDev
	periodEnd := time.Now().UTC().AddDate(1, 0, 0)
	sub := &submodel.Subscription{
		UserID:           userID,
		Tier:             submodel.TierPremium,
		Status:           submodel.StatusActive,
		Provider:         &provider,
		CurrentPeriodEnd: &periodEnd,
	}
	if err := s.subscriptions.Upsert(ctx, sub); err != nil {
		return nil, err
	}
	return s.buildSubscriptionResponse(ctx, userID, sub)
}

func (s *Service) ExportUserData(ctx context.Context, userID uuid.UUID) (*dto.DataExportResponse, error) {
	sub, err := s.ensureSubscription(ctx, userID)
	if err != nil {
		return nil, err
	}
	if !sub.IsPremiumActive() {
		return nil, domainErr.New(domainErr.ErrPaymentRequired, "data export requires premium", nil)
	}

	export := map[string]any{
		"exportedAt": time.Now().UTC().Format(time.RFC3339),
		"version":    "1",
	}

	if profile, err := s.GetMe(ctx, userID); err == nil {
		export["profile"] = profile
	}
	if fs, err := s.GetFutureSelf(ctx, userID); err == nil {
		export["futureSelf"] = fs
	}
	if goal, err := s.GetActiveGoal(ctx, userID); err == nil {
		export["activeGoal"] = goal
	}
	if plans, err := s.ListPlans(ctx, userID); err == nil {
		export["plans"] = plans
	}
	if reviews, err := s.ListWeeklyReviews(ctx, userID); err == nil {
		export["weeklyReviews"] = reviews
	}
	if spaces, err := s.ListSpaces(ctx, userID); err == nil {
		export["spaces"] = spaces
	}
	if alignment, err := s.GetAlignmentHistory(ctx, userID); err == nil {
		export["alignmentHistory"] = alignment
	}
	checkins, _ := s.checkins.ListSince(ctx, userID, time.Time{})
	if len(checkins) > 0 {
		export["checkins"] = checkins
	}

	raw, err := json.MarshalIndent(export, "", "  ")
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to serialize export", err)
	}

	zipBytes, err := buildExportZip(raw)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to build export archive", err)
	}

	encoded := base64.StdEncoding.EncodeToString(zipBytes)
	data, err := json.Marshal(encoded)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to encode export", err)
	}
	return &dto.DataExportResponse{
		Filename: "yuvmi-export.zip",
		MimeType: "application/zip",
		Encoding: "base64",
		Data:     data,
	}, nil
}

func buildExportZip(jsonPayload []byte) ([]byte, error) {
	buf := new(bytes.Buffer)
	zw := zip.NewWriter(buf)
	w, err := zw.Create("yuvmi-export.json")
	if err != nil {
		return nil, err
	}
	if _, err := w.Write(jsonPayload); err != nil {
		return nil, err
	}
	if err := zw.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func (s *Service) ensureSubscription(ctx context.Context, userID uuid.UUID) (*submodel.Subscription, error) {
	sub, err := s.subscriptions.GetByUserID(ctx, userID)
	if err == nil {
		return sub, nil
	}
	if !errors.Is(err, domainErr.ErrNotFound) {
		return nil, err
	}

	sub = &submodel.Subscription{
		UserID: userID,
		Tier:   submodel.TierFree,
		Status: submodel.StatusActive,
	}
	if err := s.subscriptions.Upsert(ctx, sub); err != nil {
		return nil, err
	}
	return sub, nil
}

func (s *Service) checkGoalLimit(ctx context.Context, userID uuid.UUID) error {
	sub, err := s.ensureSubscription(ctx, userID)
	if err != nil {
		return err
	}
	if sub.IsPremiumActive() {
		return nil
	}

	count, err := s.goals.CountByUserID(ctx, userID)
	if err != nil {
		return err
	}
	if count >= freeMaxGoals {
		return domainErr.New(domainErr.ErrPaymentRequired, "premium required for additional goals", nil)
	}
	return nil
}

func (s *Service) checkSpaceLimit(ctx context.Context, userID uuid.UUID) error {
	sub, err := s.ensureSubscription(ctx, userID)
	if err != nil {
		return err
	}
	if sub.IsPremiumActive() {
		return nil
	}

	count, err := s.spaces.CountOwnedByUserID(ctx, userID)
	if err != nil {
		return err
	}
	if count >= freeMaxSpaces {
		return domainErr.New(domainErr.ErrPaymentRequired, "premium required for additional spaces", nil)
	}
	return nil
}

func (s *Service) buildSubscriptionResponse(ctx context.Context, userID uuid.UUID, sub *submodel.Subscription) (*dto.SubscriptionResponse, error) {
	goalCount, err := s.goals.CountByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	spaceCount, err := s.spaces.CountOwnedByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	limits := dto.PremiumLimitsResponse{
		MaxGoals:   freeMaxGoals,
		MaxSpaces:  freeMaxSpaces,
		DataExport: false,
	}
	if sub.IsPremiumActive() {
		limits.MaxGoals = premiumMaxGoals
		limits.MaxSpaces = premiumMaxSpaces
		limits.DataExport = true
	}

	resp := &dto.SubscriptionResponse{
		Tier:          string(sub.Tier),
		Status:        string(sub.Status),
		PremiumActive: sub.IsPremiumActive(),
		Limits:        limits,
		Usage: dto.PremiumUsageResponse{
			Goals:  goalCount,
			Spaces: spaceCount,
		},
	}
	if sub.Provider != nil {
		p := string(*sub.Provider)
		resp.Provider = &p
	}
	if sub.CurrentPeriodEnd != nil {
		t := sub.CurrentPeriodEnd.Format(time.RFC3339)
		resp.CurrentPeriodEnd = &t
	}
	return resp, nil
}
