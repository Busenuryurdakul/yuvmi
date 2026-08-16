package dto

// SignupRequest is the public waitlist signup input.
type SignupRequest struct {
	Email   string `json:"email"`
	Consent bool   `json:"consent"`
}

// SignupResponse is returned for accepted waitlist signups.
type SignupResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}

const (
	SignupStatusAccepted = "accepted"
	SignupSuccessMessage = "Bekleme listesine katılımın alındı."
	SignupMaxEmailLength = 320
	SignupMaxBodyBytes   = 4096
)
