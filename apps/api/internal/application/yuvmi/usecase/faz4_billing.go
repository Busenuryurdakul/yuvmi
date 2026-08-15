package usecase

import (
	"context"
	"errors"
	"io"
	"time"

	"github.com/google/uuid"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/application/yuvmi/dto"
	submodel "github.com/masterfabric-go/masterfabric/internal/domain/subscription/model"
	infraStripe "github.com/masterfabric-go/masterfabric/internal/infrastructure/payment/stripe"
)

func (s *Service) CreateSubscriptionCheckout(ctx context.Context, userID uuid.UUID) (*dto.CheckoutSessionResponse, error) {
	if s.stripe == nil || !s.yuvmiCfg.Stripe.Enabled() {
		return nil, domainErr.New(domainErr.ErrNotImplemented, "stripe checkout is not configured", nil)
	}

	session, err := s.stripe.CreateCheckoutSession(
		userID.String(),
		s.yuvmiCfg.Stripe.PriceID,
		s.yuvmiCfg.Stripe.SuccessURL,
		s.yuvmiCfg.Stripe.CancelURL,
	)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to create checkout session", err)
	}

	return &dto.CheckoutSessionResponse{URL: session.URL}, nil
}

func (s *Service) CancelSubscription(ctx context.Context, userID uuid.UUID) (*dto.SubscriptionResponse, error) {
	sub, err := s.ensureSubscription(ctx, userID)
	if err != nil {
		return nil, err
	}
	if sub.Provider == nil || *sub.Provider != submodel.ProviderStripe || sub.ProviderSubscriptionID == nil {
		return nil, domainErr.New(domainErr.ErrBadRequest, "no active stripe subscription to cancel", nil)
	}
	if !sub.IsPremiumActive() {
		return nil, domainErr.New(domainErr.ErrBadRequest, "subscription is not active", nil)
	}

	if s.stripe != nil {
		updated, err := s.stripe.CancelSubscriptionAtPeriodEnd(*sub.ProviderSubscriptionID)
		if err != nil {
			return nil, domainErr.New(domainErr.ErrInternal, "failed to cancel stripe subscription", err)
		}
		periodEnd := time.Unix(updated.CurrentPeriodEnd, 0).UTC()
		sub.Status = submodel.StatusCancelled
		sub.CurrentPeriodEnd = &periodEnd
	} else {
		sub.Status = submodel.StatusCancelled
	}

	if err := s.subscriptions.Upsert(ctx, sub); err != nil {
		return nil, err
	}
	return s.buildSubscriptionResponse(ctx, userID, sub)
}

func (s *Service) HandleStripeWebhook(ctx context.Context, payload []byte, signatureHeader string) error {
	if s.stripe == nil {
		return domainErr.New(domainErr.ErrNotImplemented, "stripe webhook is not configured", nil)
	}

	evt, err := s.stripe.ParseEvent(payload, signatureHeader)
	if err != nil {
		return domainErr.New(domainErr.ErrBadRequest, "invalid stripe webhook", err)
	}

	switch evt.Type {
	case "checkout.session.completed":
		userIDStr, providerSubID, err := s.stripe.CheckoutSessionFromEvent(evt)
		if err != nil || userIDStr == "" || providerSubID == "" {
			return domainErr.New(domainErr.ErrBadRequest, "invalid checkout session event", err)
		}
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			return domainErr.New(domainErr.ErrBadRequest, "invalid checkout user id", err)
		}
		return s.syncStripeSubscription(ctx, userID, providerSubID)

	case "customer.subscription.updated", "customer.subscription.deleted":
		stripeSub, err := s.stripe.SubscriptionFromEvent(evt)
		if err != nil || stripeSub.ID == "" {
			return domainErr.New(domainErr.ErrBadRequest, "invalid subscription event", err)
		}
		existing, err := s.subscriptions.GetByProviderSubscriptionID(ctx, stripeSub.ID)
		if err != nil {
			if errors.Is(err, domainErr.ErrNotFound) {
				return nil
			}
			return err
		}
		return s.applyStripeSubscription(ctx, existing.UserID, stripeSub)

	default:
		return nil
	}
}

func (s *Service) ExpireSubscriptions(ctx context.Context) error {
	now := time.Now().UTC()
	expired, err := s.subscriptions.ListExpiredPremium(ctx, now)
	if err != nil {
		return err
	}
	for _, sub := range expired {
		sub.Tier = submodel.TierFree
		sub.Status = submodel.StatusActive
		sub.Provider = nil
		sub.ProviderSubscriptionID = nil
		sub.CurrentPeriodEnd = nil
		if err := s.subscriptions.Upsert(ctx, sub); err != nil {
			return err
		}
	}
	return nil
}

func (s *Service) syncStripeSubscription(ctx context.Context, userID uuid.UUID, providerSubID string) error {
	stripeSub, err := s.stripe.GetSubscription(providerSubID)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to fetch stripe subscription", err)
	}
	return s.applyStripeSubscription(ctx, userID, stripeSub)
}

func (s *Service) applyStripeSubscription(ctx context.Context, userID uuid.UUID, stripeSub *infraStripe.Subscription) error {
	provider := submodel.ProviderStripe
	periodEnd := time.Unix(stripeSub.CurrentPeriodEnd, 0).UTC()
	sub := &submodel.Subscription{
		UserID:                 userID,
		Provider:               &provider,
		ProviderSubscriptionID: &stripeSub.ID,
		CurrentPeriodEnd:       &periodEnd,
	}

	switch stripeSub.Status {
	case "active", "trialing":
		sub.Tier = submodel.TierPremium
		if stripeSub.CancelAtPeriodEnd {
			sub.Status = submodel.StatusCancelled
		} else {
			sub.Status = submodel.StatusActive
		}
	case "past_due", "unpaid":
		sub.Tier = submodel.TierPremium
		sub.Status = submodel.StatusPastDue
	case "canceled", "incomplete_expired":
		sub.Tier = submodel.TierFree
		sub.Status = submodel.StatusActive
		sub.Provider = nil
		sub.ProviderSubscriptionID = nil
		sub.CurrentPeriodEnd = nil
	default:
		sub.Tier = submodel.TierPremium
		sub.Status = submodel.StatusActive
	}

	return s.subscriptions.Upsert(ctx, sub)
}

func ReadStripeWebhookBody(r io.Reader, maxBytes int64) ([]byte, error) {
	return io.ReadAll(io.LimitReader(r, maxBytes))
}
