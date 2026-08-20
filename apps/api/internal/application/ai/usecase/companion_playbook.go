package usecase

import "strings"

// companionPlaybook is a hand-written Yuvmi card. It is not retrieved from
// literature: one card is pasted into the prompt so the model stays in the
// product voice (small step, no oracle, no diagnosis).
type companionPlaybook struct {
	ID    string
	Title string
	Body  string
}

var companionPlaybooks = []companionPlaybook{
	{
		ID:    "shrink",
		Title: "Küçültmek",
		Body:  "Bugünün niyeti ağır geliyorsa hedefi değiştirme; adımı küçült. Beş dakikalık bir parça yeter. Tamamlamak zorunda değilsin — başlamak ritmi korur.",
	},
	{
		ID:    "off_track",
		Title: "Yoldan çıkmak",
		Body:  "Kaçırılan günler bir seri kırığı değil, kayıt. Plan duruyor. Geri dönüş, dünü telafi etmek değil; bugünün minimumunu seçmek.",
	},
	{
		ID:    "hold_day",
		Title: "İdare gün",
		Body:  "Enerji düşükse bu bir teşhis değil. İdare günü: aynı niyeti daha küçük tut, yeni hedef açma. Yarının ritmi bugünün cezası olmasın.",
	},
	{
		ID:    "split_goal",
		Title: "Hedefi bölmek",
		Body:  "Büyük hedef dört adımdan fazlasına yayılmaz burada. Bölmek, yeni bir hayat tasarlamak değil; mevcut plandaki bir adımı iki küçük parçaya ayırmak.",
	},
	{
		ID:    "review_plan",
		Title: "Planı gözden geçirmek",
		Body:  "Gözden geçirmek kehanet değildir. Adımlara bak, hangisi bugün taşınabilir söyle. Sohbet işaretlemez ve planı yazmaz — sen karar verirsin.",
	},
	{
		ID:    "week_facts",
		Title: "Haftayı özetlemek",
		Body:  "Hafta özeti yalnızca kayıttaki sayılardır. Olmayan günü uydurma. Az check-in varsa onu söyle; ortalama yoksa ortalama uydurma.",
	},
	{
		ID:    "no_fortune",
		Title: "Tarih sormak",
		Body:  "Bitiş tarihi, burç veya 'ne zaman olursun' Yuvmi'nin işi değil. Cevap: bugünün küçük adımı. Tahmin cümlesi kurma.",
	},
	{
		ID:    "return",
		Title: "Geri dönüş",
		Body:  "Uzak kalan biri cezalandırılmaz. Tek cümle: planın duruyor, bugün hangi adım en küçük? Dünü sayma.",
	},
	{
		ID:    "full_day",
		Title: "Dolu gün",
		Body:  "Takvim doluysa niyeti iptal etme; sıkıştır. Bir cümlelik versiyon veya erteleme — ikisi de geçerli. Suçlama yok.",
	},
	{
		ID:    "why_stuck",
		Title: "Neden olmuyor",
		Body:  "Tıkanma karakter kusuru değildir. Soru: adım mı büyük, gün mü dolu, enerji mi düşük. Birini seç, küçült, bırak.",
	},
	{
		ID:    "skip_ok",
		Title: "Atlamak",
		Body:  "Atlanan görev kayıttır. Telafi listesi açma. Bugün pending ise onu küçült; değilse yarının niyetini bekle.",
	},
	{
		ID:    "minimum",
		Title: "Minimum",
		Body:  "Yuvmi'nin birimi minimumdur. En küçük yapılabilir parça, profil cümlesi değil. Övgü ve tehdit yok.",
	},
}

func pickCompanionPlaybook(message string) *companionPlaybook {
	m := normalizeCompanionQuery(message)
	switch {
	case containsAny(m, "kursu ne zaman", "ne zaman bitir", "6 ay önceki", "kader", "fal", "burç"):
		return playbookByID("no_fortune")
	case containsAny(m, "haftamı", "haftayı", "özetle", "bu hafta"):
		return playbookByID("week_facts")
	case containsAny(m, "hedefimi böl", "hedefi böl"):
		return playbookByID("split_goal")
	case containsAny(m, "planımı", "planı gözden"):
		return playbookByID("review_plan")
	case containsAny(m, "yoldan", "çıktım", "kaçırdım", "geri dön"):
		return playbookByID("off_track")
	case containsAny(m, "idare", "yorgun", "dolu gün", "yetişmiyor"):
		return playbookByID("hold_day")
	case containsAny(m, "küçült", "küçültmek"):
		return playbookByID("shrink")
	case containsAny(m, "neden olmuyor", "olmuyor", "tıkan"):
		return playbookByID("why_stuck")
	case containsAny(m, "atladım", "skip"):
		return playbookByID("skip_ok")
	default:
		return playbookByID("minimum")
	}
}

func playbookByID(id string) *companionPlaybook {
	for i := range companionPlaybooks {
		if companionPlaybooks[i].ID == id {
			return &companionPlaybooks[i]
		}
	}
	return &companionPlaybooks[len(companionPlaybooks)-1]
}

func containsAny(haystack string, needles ...string) bool {
	for _, n := range needles {
		if strings.Contains(haystack, normalizeCompanionQuery(n)) {
			return true
		}
	}
	return false
}

func normalizeCompanionQuery(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	return strings.NewReplacer(
		"ı", "i", "İ", "i",
		"ş", "s", "Ş", "s",
		"ğ", "g", "Ğ", "g",
		"ü", "u", "Ü", "u",
		"ö", "o", "Ö", "o",
		"ç", "c", "Ç", "c",
	).Replace(s)
}
