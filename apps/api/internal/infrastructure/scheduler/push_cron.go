package scheduler

import (
	"context"
	"log/slog"
	"time"

	yuvmiUC "github.com/masterfabric-go/masterfabric/internal/application/yuvmi/usecase"
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	pgProfile "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/profile"
)

// PushCron sends scheduled daily and weekly push reminders.
type PushCron struct {
	svc      *yuvmiUC.Service
	notifs   *pgProfile.NotificationRepo
	cfg      config.CronConfig
	log      *slog.Logger
	stop     chan struct{}
}

func NewPushCron(svc *yuvmiUC.Service, notifs *pgProfile.NotificationRepo, cfg config.CronConfig, log *slog.Logger) *PushCron {
	return &PushCron{svc: svc, notifs: notifs, cfg: cfg, log: log, stop: make(chan struct{})}
}

func (c *PushCron) Start(ctx context.Context) {
	if !c.cfg.Enabled {
		c.log.Info("push cron disabled")
		return
	}
	interval := time.Duration(c.cfg.PushIntervalMin) * time.Minute
	if interval <= 0 {
		interval = 15 * time.Minute
	}
	c.log.Info("push cron started", "interval_min", c.cfg.PushIntervalMin)

	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		c.runOnce(ctx)
		for {
			select {
			case <-ticker.C:
				c.runOnce(ctx)
			case <-c.stop:
				return
			case <-ctx.Done():
				return
			}
		}
	}()
}

func (c *PushCron) Stop() {
	close(c.stop)
}

func (c *PushCron) runOnce(ctx context.Context) {
	if err := c.svc.ExpireSubscriptions(ctx); err != nil {
		c.log.Warn("subscription expiry check failed", "error", err)
	}

	targets, err := c.notifs.ListPushTargets(ctx)
	if err != nil {
		c.log.Warn("push cron: list targets failed", "error", err)
		return
	}

	for _, t := range targets {
		loc := loadLocation(t.Timezone)
		now := time.Now().In(loc)
		today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)

		if now.Hour() == c.cfg.DailyReminderHour {
			c.maybeDailyReminder(ctx, t, today, loc)
		}

		if int(now.Weekday()) == c.cfg.WeeklyReminderDay && now.Hour() == c.cfg.DailyReminderHour {
			c.maybeWeeklyReminder(ctx, t, today)
		}
	}
}

func (c *PushCron) maybeDailyReminder(ctx context.Context, t pgProfile.PushTarget, today time.Time, loc *time.Location) {
	recorded, err := c.notifs.TryRecordDispatch(ctx, t.UserID, "daily_reminder", today.UTC())
	if err != nil || !recorded {
		return
	}

	hasCheckin, _ := c.notifs.HasCheckinOnDate(ctx, t.UserID, today.UTC())
	hasTask, _ := c.notifs.HasCompletedTaskOnDate(ctx, t.UserID, today.UTC())
	if hasCheckin && hasTask {
		return
	}

	msg := "Bugünkü check-in ve görevin seni bekliyor."
	if hasCheckin && !hasTask {
		msg = "Günlük görevini tamamlamayı unutma."
	} else if !hasCheckin && hasTask {
		msg = "Bugünkü check-in'ini yapmayı unutma."
	}

	_ = c.svc.SendScheduledPush(ctx, t.UserID, "Günaydın ☀️", msg, "daily_reminder")
}

func (c *PushCron) maybeWeeklyReminder(ctx context.Context, t pgProfile.PushTarget, today time.Time) {
	recorded, err := c.notifs.TryRecordDispatch(ctx, t.UserID, "weekly_reminder", today.UTC())
	if err != nil || !recorded {
		return
	}

	review, err := c.svc.GetOrCreateCurrentWeeklyReview(ctx, t.UserID)
	if err != nil {
		_ = c.svc.SendScheduledPush(ctx, t.UserID, "Haftalık yolculuk",
			"Bu hafta hedeflerine yaklaşmak için check-in ve görevlerini tamamla.", "weekly_reminder")
		return
	}

	// GetOrCreate notifies on first creation; remind again only for older pending reviews.
	if review.Status != "applied" && time.Since(review.CreatedAt) > time.Hour {
		_ = c.svc.SendScheduledPush(ctx, t.UserID, "Haftalık gözden geçirme",
			"Bu haftanın yansımasını birlikte yapalım.", "weekly_reminder")
	}
}

func loadLocation(tz string) *time.Location {
	if tz == "" {
		tz = "Europe/Istanbul"
	}
	loc, err := time.LoadLocation(tz)
	if err != nil {
		return time.UTC
	}
	return loc
}
