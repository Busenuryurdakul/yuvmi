package response

import (
	"encoding/json"
	"net/http"

	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

type YuvmiEnvelope struct {
	Data  any         `json:"data,omitempty"`
	Error *YuvmiError `json:"error,omitempty"`
}

type YuvmiError struct {
	Message string `json:"message"`
	Code    int    `json:"code"`
}

func YuvmiData(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(YuvmiEnvelope{Data: payload})
}

func YuvmiCreated(w http.ResponseWriter, payload any) {
	YuvmiData(w, http.StatusCreated, payload)
}

func YuvmiNoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}

func YuvmiFail(w http.ResponseWriter, err error) {
	code := domainErr.HTTPStatusCode(err)
	msg := err.Error()
	if code >= http.StatusInternalServerError {
		msg = "an internal error occurred"
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(YuvmiEnvelope{
		Error: &YuvmiError{Message: msg, Code: code},
	})
}
