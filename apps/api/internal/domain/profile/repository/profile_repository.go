package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/profile/model"
)

type ProfileRepository interface {
	GetByUserID(ctx context.Context, userID uuid.UUID) (*model.UserProfile, error)
	Upsert(ctx context.Context, profile *model.UserProfile) error
	SetOnboardingComplete(ctx context.Context, userID uuid.UUID) error
}

type CheckinRepository interface {
	GetByDate(ctx context.Context, userID uuid.UUID, date time.Time) (*model.TodayEntry, error)
	Upsert(ctx context.Context, entry *model.TodayEntry) error
	ListSince(ctx context.Context, userID uuid.UUID, since time.Time) ([]*model.TodayEntry, error)
}

type AlignmentRepository interface {
	GetByDate(ctx context.Context, userID uuid.UUID, date time.Time) (*model.AlignmentSnapshot, error)
	Upsert(ctx context.Context, snapshot *model.AlignmentSnapshot) error
	ListHistory(ctx context.Context, userID uuid.UUID, limit int) ([]*model.AlignmentSnapshot, error)
	ListSince(ctx context.Context, userID uuid.UUID, since time.Time) ([]*model.AlignmentSnapshot, error)
}

type NotificationRepository interface {
	UpsertToken(ctx context.Context, token *model.NotificationToken) error
	ListTokens(ctx context.Context, userID uuid.UUID) ([]*model.NotificationToken, error)
	CreateNotification(ctx context.Context, n *model.InAppNotification) error
	ListNotifications(ctx context.Context, userID uuid.UUID, limit int) ([]*model.InAppNotification, error)
	MarkRead(ctx context.Context, userID, notificationID uuid.UUID) error
	CountUnread(ctx context.Context, userID uuid.UUID) (int, error)
}
