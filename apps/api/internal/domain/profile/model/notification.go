package model

import (
	"time"

	"github.com/google/uuid"
)

type NotificationToken struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	Token     string
	Platform  string
	CreatedAt time.Time
	UpdatedAt time.Time
}

type InAppNotification struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	Title     string
	Body      string
	Type      string
	Data      map[string]string
	ReadAt    *time.Time
	CreatedAt time.Time
}
