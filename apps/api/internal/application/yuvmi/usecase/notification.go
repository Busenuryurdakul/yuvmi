package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/yuvmi/dto"
	profilemodel "github.com/masterfabric-go/masterfabric/internal/domain/profile/model"
	infraNotify "github.com/masterfabric-go/masterfabric/internal/infrastructure/notification"
)

func (s *Service) RegisterPushToken(ctx context.Context, userID uuid.UUID, req dto.RegisterPushTokenRequest) error {
	platform := req.Platform
	if platform == "" {
		platform = "expo"
	}
	return s.notifications.UpsertToken(ctx, &profilemodel.NotificationToken{
		UserID: userID, Token: req.Token, Platform: platform,
	})
}

func (s *Service) SendTestPush(ctx context.Context, userID uuid.UUID) error {
	return s.notifyUser(ctx, userID, "Yuvmi test bildirimi",
		"Push bildirimleri çalışıyor.", "test", nil)
}

// SendScheduledPush sends a cron-triggered push and in-app notification.
func (s *Service) SendScheduledPush(ctx context.Context, userID uuid.UUID, title, body, nType string) error {
	return s.notifyUser(ctx, userID, title, body, nType, nil)
}

func (s *Service) ListNotifications(ctx context.Context, userID uuid.UUID) ([]dto.NotificationResponse, error) {
	items, err := s.notifications.ListNotifications(ctx, userID, 50)
	if err != nil {
		return nil, err
	}
	out := make([]dto.NotificationResponse, len(items))
	for i, n := range items {
		out[i] = dto.NotificationResponse{
			ID: n.ID, Title: n.Title, Body: n.Body, Type: n.Type,
			Data: n.Data, ReadAt: n.ReadAt, CreatedAt: n.CreatedAt,
		}
	}
	return out, nil
}

func (s *Service) MarkNotificationRead(ctx context.Context, userID, notificationID uuid.UUID) error {
	return s.notifications.MarkRead(ctx, userID, notificationID)
}

func (s *Service) GetUnreadNotificationCount(ctx context.Context, userID uuid.UUID) (*dto.UnreadCountResponse, error) {
	count, err := s.notifications.CountUnread(ctx, userID)
	if err != nil {
		return nil, err
	}
	return &dto.UnreadCountResponse{Count: count}, nil
}

func (s *Service) notifyUser(ctx context.Context, userID uuid.UUID, title, body, nType string, data map[string]string) error {
	if data == nil {
		data = map[string]string{}
	}
	_ = s.notifications.CreateNotification(ctx, &profilemodel.InAppNotification{
		UserID: userID, Title: title, Body: body, Type: nType, Data: data,
	})

	if s.push == nil {
		return nil
	}
	tokens, err := s.notifications.ListTokens(ctx, userID)
	if err != nil {
		return err
	}
	for _, t := range tokens {
		_ = s.push.Send(ctx, infraNotify.PushMessage{
			To: t.Token, Title: title, Body: body, Data: data,
		})
	}
	return nil
}
