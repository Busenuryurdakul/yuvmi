package notification

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type PushMessage struct {
	To    string            `json:"to"`
	Title string            `json:"title"`
	Body  string            `json:"body"`
	Data  map[string]string `json:"data,omitempty"`
	Sound string            `json:"sound,omitempty"`
}

type ExpoPushClient struct {
	client  *http.Client
	baseURL string
}

func NewExpoPushClient() *ExpoPushClient {
	return &ExpoPushClient{
		client:  &http.Client{Timeout: 10 * time.Second},
		baseURL: "https://exp.host/--/api/v2/push/send",
	}
}

func (c *ExpoPushClient) Send(ctx context.Context, msg PushMessage) error {
	if msg.To == "" {
		return fmt.Errorf("empty push token")
	}
	if msg.Sound == "" {
		msg.Sound = "default"
	}

	payload, err := json.Marshal(msg)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("expo push failed: status %d", resp.StatusCode)
	}
	return nil
}
