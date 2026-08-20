package usecase

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	goalmodel "github.com/masterfabric-go/masterfabric/internal/domain/goal/model"
	profilemodel "github.com/masterfabric-go/masterfabric/internal/domain/profile/model"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

// Narrow readers so companion context can load the user's own records without
// taking the full Yuvmi service graph. Nil sources mean that slice is skipped.
type companionPlanSource interface {
	GetActiveByUserID(ctx context.Context, userID uuid.UUID) (*goalmodel.Plan, error)
}

type companionTaskSource interface {
	GetByDate(ctx context.Context, userID uuid.UUID, date time.Time) (*goalmodel.DailyTask, error)
	ListRecent(ctx context.Context, userID uuid.UUID, since time.Time) ([]*goalmodel.DailyTask, error)
}

type companionCheckinSource interface {
	GetByDate(ctx context.Context, userID uuid.UUID, date time.Time) (*profilemodel.TodayEntry, error)
	ListSince(ctx context.Context, userID uuid.UUID, since time.Time) ([]*profilemodel.TodayEntry, error)
}

const (
	slicePlan  = "plan"
	sliceWeek  = "week"
	sliceToday = "today"
)

type companionPlanView struct {
	Title string
	Steps []companionStepView
}

type companionStepView struct {
	Title       string
	Description string
}

type companionWeekView struct {
	Checkins       int
	AvgMood        float64
	AvgEnergy      float64
	TasksCompleted int
	TasksSkipped   int
	TasksPending   int
	DaysWithTask   int
}

type companionTodayView struct {
	TaskTitle  string
	TaskStatus string
	HasTask    bool
	HasCheckin bool
	Mood       int
	Energy     int
}

func selectCompanionSlices(message string) []string {
	m := normalizeCompanionQuery(message)
	var out []string
	add := func(s string) {
		if len(out) >= 2 {
			return
		}
		for _, x := range out {
			if x == s {
				return
			}
		}
		out = append(out, s)
	}

	if containsAny(m, "haftami", "haftayi", "ozetle", "bu hafta", "7 gun") {
		add(sliceWeek)
	}
	if containsAny(m, "bugun", "kucult", "niyet", "idare", "yoldan", "olmuyor", "atladim") {
		add(sliceToday)
	}
	if containsAny(m, "planimi", "plani", "hedefimi bol", "hedefi bol", "adim") {
		add(slicePlan)
	}

	if len(out) == 0 {
		return []string{slicePlan, sliceWeek}
	}
	if len(out) == 1 && out[0] == sliceWeek {
		add(slicePlan)
	}
	if len(out) == 1 && out[0] == sliceToday {
		add(slicePlan)
	}
	return out
}

func (s *Service) loadCompanionPlan(ctx context.Context, userID uuid.UUID) (*companionPlanView, error) {
	if s.plans == nil {
		return nil, nil
	}
	plan, err := s.plans.GetActiveByUserID(ctx, userID)
	if err != nil {
		if errorsIsNotFound(err) {
			return nil, nil
		}
		return nil, err
	}
	view := &companionPlanView{Title: sanitize(plan.Title, 200)}
	steps := append([]goalmodel.PlanStep(nil), plan.Steps...)
	for i := 0; i < len(steps); i++ {
		for j := i + 1; j < len(steps); j++ {
			if steps[j].SortOrder < steps[i].SortOrder ||
				(steps[j].SortOrder == steps[i].SortOrder && steps[j].DayOffset < steps[i].DayOffset) {
				steps[i], steps[j] = steps[j], steps[i]
			}
		}
	}
	if len(steps) > 4 {
		steps = steps[:4]
	}
	for _, st := range steps {
		view.Steps = append(view.Steps, companionStepView{
			Title:       sanitize(st.Title, 80),
			Description: sanitize(st.Description, 160),
		})
	}
	return view, nil
}

func (s *Service) loadCompanionWeek(ctx context.Context, userID uuid.UUID) (*companionWeekView, error) {
	if s.tasks == nil && s.checkins == nil {
		return nil, nil
	}
	since := companionTodayUTC().AddDate(0, 0, -6)
	view := &companionWeekView{}

	if s.checkins != nil {
		entries, err := s.checkins.ListSince(ctx, userID, since)
		if err != nil {
			return nil, err
		}
		view.Checkins = len(entries)
		var moodSum, energySum float64
		for _, e := range entries {
			moodSum += float64(e.Mood)
			energySum += float64(e.Energy)
		}
		if view.Checkins > 0 {
			view.AvgMood = moodSum / float64(view.Checkins)
			view.AvgEnergy = energySum / float64(view.Checkins)
		}
	}

	if s.tasks != nil {
		tasks, err := s.tasks.ListRecent(ctx, userID, since)
		if err != nil {
			return nil, err
		}
		days := map[string]struct{}{}
		for _, t := range tasks {
			days[t.Date.UTC().Format("2006-01-02")] = struct{}{}
			switch t.Status {
			case goalmodel.TaskCompleted:
				view.TasksCompleted++
			case goalmodel.TaskSkipped:
				view.TasksSkipped++
			default:
				view.TasksPending++
			}
		}
		view.DaysWithTask = len(days)
	}
	return view, nil
}

func (s *Service) loadCompanionToday(ctx context.Context, userID uuid.UUID) (*companionTodayView, error) {
	view := &companionTodayView{}
	today := companionTodayUTC()

	if s.tasks != nil {
		task, err := s.tasks.GetByDate(ctx, userID, today)
		if err != nil && !errorsIsNotFound(err) {
			return nil, err
		}
		if task != nil {
			view.HasTask = true
			view.TaskTitle = sanitize(task.Title, 80)
			view.TaskStatus = taskStatusLabel(task.Status)
		}
	}

	if s.checkins != nil {
		entry, err := s.checkins.GetByDate(ctx, userID, today)
		if err != nil && !errorsIsNotFound(err) {
			return nil, err
		}
		if entry != nil {
			view.HasCheckin = true
			view.Mood = entry.Mood
			view.Energy = entry.Energy
		}
	}

	if !view.HasTask && !view.HasCheckin {
		return nil, nil
	}
	return view, nil
}

func errorsIsNotFound(err error) bool {
	return errors.Is(err, domainErr.ErrNotFound)
}

func companionTodayUTC() time.Time {
	now := time.Now().UTC()
	return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
}

func taskStatusLabel(st goalmodel.TaskStatus) string {
	switch st {
	case goalmodel.TaskCompleted:
		return "tamamlandı"
	case goalmodel.TaskSkipped:
		return "atlandı"
	case goalmodel.TaskInProgress:
		return "devam ediyor"
	default:
		return "bekliyor"
	}
}

func renderCompanionSlices(
	plan *companionPlanView,
	week *companionWeekView,
	today *companionTodayView,
	slices []string,
	playbook *companionPlaybook,
) string {
	var b strings.Builder
	wanted := map[string]bool{}
	for _, s := range slices {
		wanted[s] = true
	}

	if wanted[slicePlan] {
		if plan == nil || len(plan.Steps) == 0 {
			b.WriteString("Aktif plan adımları: kayıt yok. Adım uydurma.\n\n")
		} else {
			b.WriteString("Aktif plan (salt okunur):\n")
			if plan.Title != "" {
				b.WriteString(fmt.Sprintf("- Plan: %s\n", plan.Title))
			}
			for i, st := range plan.Steps {
				line := fmt.Sprintf("- Adım %d: %s", i+1, st.Title)
				if st.Description != "" {
					line += " — " + st.Description
				}
				b.WriteString(line + "\n")
			}
			b.WriteString("\n")
		}
	}

	if wanted[sliceWeek] {
		if week == nil || (week.Checkins == 0 && week.DaysWithTask == 0) {
			b.WriteString("Son 7 gün: kayıt yok. Haftayı uydurma.\n\n")
		} else {
			b.WriteString("Son 7 gün özeti (salt okunur, sayı uydurma):\n")
			b.WriteString(fmt.Sprintf("- Check-in: %d gün\n", week.Checkins))
			if week.Checkins > 0 {
				b.WriteString(fmt.Sprintf("- Ortalama ruh hâli: %.1f/5\n", week.AvgMood))
				b.WriteString(fmt.Sprintf("- Ortalama enerji: %.1f/5\n", week.AvgEnergy))
			}
			b.WriteString(fmt.Sprintf("- Niyet: %d tamamlandı, %d atlandı, %d bekliyor (%d gün kayıtlı)\n\n",
				week.TasksCompleted, week.TasksSkipped, week.TasksPending, week.DaysWithTask))
		}
	}

	if wanted[sliceToday] {
		if today == nil {
			b.WriteString("Bugünün niyeti: kayıt yok. Durum uydurma.\n\n")
		} else {
			b.WriteString("Bugün (salt okunur):\n")
			if today.HasTask {
				b.WriteString(fmt.Sprintf("- Niyet: %s (%s)\n", today.TaskTitle, today.TaskStatus))
			} else {
				b.WriteString("- Niyet: henüz yok\n")
			}
			if today.HasCheckin {
				b.WriteString(fmt.Sprintf("- Ruh hâli %d/5, enerji %d/5\n", today.Mood, today.Energy))
			} else {
				b.WriteString("- Check-in: yok\n")
			}
			b.WriteString("\n")
		}
	}

	if playbook != nil {
		b.WriteString("Yuvmi playbook (tek kart, başka kaynak kullanma):\n")
		b.WriteString(fmt.Sprintf("- %s: %s\n\n", playbook.Title, playbook.Body))
	}
	return b.String()
}
