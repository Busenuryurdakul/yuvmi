package stripe

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const apiBase = "https://api.stripe.com/v1"

type Client struct {
	secretKey     string
	webhookSecret string
	http          *http.Client
}

func NewClient(secretKey, webhookSecret string) *Client {
	return &Client{
		secretKey:     secretKey,
		webhookSecret: webhookSecret,
		http:          &http.Client{Timeout: 30 * time.Second},
	}
}

type CheckoutSession struct {
	ID  string `json:"id"`
	URL string `json:"url"`
}

type Subscription struct {
	ID                 string `json:"id"`
	Status             string `json:"status"`
	CurrentPeriodEnd   int64  `json:"current_period_end"`
	CancelAtPeriodEnd  bool   `json:"cancel_at_period_end"`
}

type Event struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

type eventData struct {
	Object json.RawMessage `json:"object"`
}

type checkoutSessionObject struct {
	ClientReferenceID string `json:"client_reference_id"`
	Subscription      string `json:"subscription"`
}

func (c *Client) CreateCheckoutSession(userID, priceID, successURL, cancelURL string) (*CheckoutSession, error) {
	form := url.Values{}
	form.Set("mode", "subscription")
	form.Set("client_reference_id", userID)
	form.Set("success_url", successURL)
	form.Set("cancel_url", cancelURL)
	form.Set("line_items[0][price]", priceID)
	form.Set("line_items[0][quantity]", "1")
	form.Set("allow_promotion_codes", "true")

	var session CheckoutSession
	if err := c.postForm("/checkout/sessions", form, &session); err != nil {
		return nil, err
	}
	return &session, nil
}

func (c *Client) GetSubscription(subscriptionID string) (*Subscription, error) {
	var sub Subscription
	if err := c.get("/subscriptions/"+subscriptionID, &sub); err != nil {
		return nil, err
	}
	return &sub, nil
}

func (c *Client) CancelSubscriptionAtPeriodEnd(subscriptionID string) (*Subscription, error) {
	form := url.Values{}
	form.Set("cancel_at_period_end", "true")

	var sub Subscription
	if err := c.postForm("/subscriptions/"+subscriptionID, form, &sub); err != nil {
		return nil, err
	}
	return &sub, nil
}

func (c *Client) ParseEvent(payload []byte, signatureHeader string) (*Event, error) {
	if c.webhookSecret != "" {
		if err := verifySignature(payload, signatureHeader, c.webhookSecret); err != nil {
			return nil, err
		}
	}

	var evt Event
	if err := json.Unmarshal(payload, &evt); err != nil {
		return nil, fmt.Errorf("invalid stripe event payload: %w", err)
	}
	return &evt, nil
}

func (c *Client) CheckoutSessionFromEvent(evt *Event) (userID, subscriptionID string, err error) {
	var wrapper eventData
	if err := json.Unmarshal(evt.Data, &wrapper); err != nil {
		return "", "", err
	}
	var obj checkoutSessionObject
	if err := json.Unmarshal(wrapper.Object, &obj); err != nil {
		return "", "", err
	}
	return obj.ClientReferenceID, obj.Subscription, nil
}

func (c *Client) SubscriptionFromEvent(evt *Event) (*Subscription, error) {
	var wrapper eventData
	if err := json.Unmarshal(evt.Data, &wrapper); err != nil {
		return nil, err
	}
	var sub Subscription
	if err := json.Unmarshal(wrapper.Object, &sub); err != nil {
		return nil, err
	}
	return &sub, nil
}

func (c *Client) postForm(path string, form url.Values, out any) error {
	req, err := http.NewRequest(http.MethodPost, apiBase+path, strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	req.SetBasicAuth(c.secretKey, "")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode >= 400 {
		return fmt.Errorf("stripe error (%d): %s", resp.StatusCode, string(body))
	}
	if out != nil {
		if err := json.Unmarshal(body, out); err != nil {
			return fmt.Errorf("decode stripe response: %w", err)
		}
	}
	return nil
}

func (c *Client) get(path string, out any) error {
	req, err := http.NewRequest(http.MethodGet, apiBase+path, nil)
	if err != nil {
		return err
	}
	req.SetBasicAuth(c.secretKey, "")

	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode >= 400 {
		return fmt.Errorf("stripe error (%d): %s", resp.StatusCode, string(body))
	}
	if err := json.Unmarshal(body, out); err != nil {
		return fmt.Errorf("decode stripe response: %w", err)
	}
	return nil
}

func verifySignature(payload []byte, header, secret string) error {
	const prefix = "t="
	const sigPrefix = "v1="

	var timestamp string
	var signatures []string
	for _, part := range strings.Split(header, ",") {
		part = strings.TrimSpace(part)
		switch {
		case strings.HasPrefix(part, prefix):
			timestamp = strings.TrimPrefix(part, prefix)
		case strings.HasPrefix(part, sigPrefix):
			signatures = append(signatures, strings.TrimPrefix(part, sigPrefix))
		}
	}
	if timestamp == "" || len(signatures) == 0 {
		return fmt.Errorf("invalid stripe signature header")
	}

	ts, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid stripe timestamp")
	}
	if time.Since(time.Unix(ts, 0)) > 5*time.Minute {
		return fmt.Errorf("stripe webhook timestamp too old")
	}

	signed := []byte(timestamp + "." + string(payload))
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(signed)
	expected := hex.EncodeToString(mac.Sum(nil))

	for _, sig := range signatures {
		if hmac.Equal([]byte(sig), []byte(expected)) {
			return nil
		}
	}
	return fmt.Errorf("stripe signature mismatch")
}
