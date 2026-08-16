package repository

import (
	"context"

	"github.com/masterfabric-go/masterfabric/internal/domain/waitlist/model"
)

// RegisterResult describes the outcome of a waitlist registration attempt.
type RegisterResult struct {
	Created bool
}

// SignupRepository persists waitlist signups.
type SignupRepository interface {
	Register(ctx context.Context, signup *model.Signup) (RegisterResult, error)
}
