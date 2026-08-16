package waitlist

import (
	"net/http"

	waitlistDecoder "github.com/masterfabric-go/masterfabric/internal/application/waitlist/decoder"
	"github.com/masterfabric-go/masterfabric/internal/application/waitlist/usecase"
	"github.com/masterfabric-go/masterfabric/internal/shared/response"
)

// Handler provides waitlist HTTP handlers.
type Handler struct {
	signupUC *usecase.SignupUseCase
}

// NewHandler creates a new waitlist handler.
func NewHandler(signupUC *usecase.SignupUseCase) *Handler {
	return &Handler{signupUC: signupUC}
}

// Signup handles public waitlist registration.
func (h *Handler) Signup(w http.ResponseWriter, r *http.Request) {
	req, err := waitlistDecoder.DecodeSignupRequest(r)
	if err != nil {
		response.Error(w, err)
		return
	}

	result, err := h.signupUC.Execute(r.Context(), req)
	if err != nil {
		response.Error(w, err)
		return
	}

	status := http.StatusOK
	if result.Created {
		status = http.StatusCreated
	}

	response.JSON(w, status, usecase.AcceptedResponse())
}
