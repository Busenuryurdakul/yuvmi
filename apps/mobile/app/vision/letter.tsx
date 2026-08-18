import { useState, useEffect } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, ScrollView, Animated } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { SubpageBar } from "@/components/ui/SubpageBar";
import { Eyebrow, Glass } from "@/components/ui/Glass";
import { useMode } from "@/context/ModeContext";
import { spendPearls } from "@/lib/api/yuvmi";
import { alert } from "@/lib/alert";
import { theme } from "@/theme";

type Letter = {
  id: string;
  title: string;
  body: string;
  seal: { emoji: string; label: string; color: string };
  date: string; // Sealing date
  targetDate: string; // Opening date
  status: "playable" | "locked" | "opened";
  daysLeft?: number;
  totalDays?: number;
  mood: string;
};

const SEALS = [
  { emoji: "🦀", label: "Yengeç mührü", color: "rgba(239,68,68,0.12)" },
  { emoji: "🪸", label: "Mercan mührü", color: "rgba(59,130,246,0.12)" },
  { emoji: "⚓️", label: "Çapa mührü", color: "rgba(34,197,94,0.12)" },
  { emoji: "🐚", label: "Deniz kabuğu mührü", color: "rgba(234,179,8,0.12)" },
];

const INITIAL_LETTERS: Letter[] = [
  {
    id: "l1",
    title: "Kursu bitirdiğim gün",
    body: "Sevgili ben,\n\nBunu yazarken kursun ikinci modülünde tıkanmış durumdasın ve üç gündür hiçbir şey yapmadın. Yine de yazıyorum, çünkü bir gün bunu okuyacağını biliyorum.\n\nEğer bunu okuyorsan: demek ki devam etmişsin. Hatırla, en zor kısmı başlamak değildi — geri dönmekti.",
    seal: SEALS[0],
    date: "2 Haziran 2026",
    targetDate: "2 Temmuz 2026",
    status: "playable",
    daysLeft: 0,
    totalDays: 30,
    mood: "Ağır",
  },
  {
    id: "l2",
    title: "Bir yıl sonraki bana",
    body: "Sevgili ben,\n\nBugün attığın tohumların ve biriktirdiğin incilerin meyvesini topluyor olmalısın. Geriye dönüp baktığında bu küçük adımların ne kadar değerli olduğunu gör.",
    seal: SEALS[1],
    date: "13 Ağustos 2026",
    targetDate: "13 Ağustos 2027",
    status: "locked",
    daysLeft: 365,
    totalDays: 365,
    mood: "İyi",
  },
  {
    id: "l3",
    title: "Başlarken",
    body: "Sevgili ben,\n\nYuvmi'ye bugün başladın. İlk niyetlerini yazdın. Bakalım zamanla neler değişecek, mektup açıldığında göreceğiz.",
    seal: SEALS[3],
    date: "2 Ağustos 2026",
    targetDate: "2 Eylül 2026",
    status: "opened",
    daysLeft: 0,
    totalDays: 30,
    mood: "İdare",
  },
];

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Adjust so Monday is 0 and Sunday is 6
};

const MONTHS_TR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

const DAYS_TR = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];

const formatTurkishDate = (date: Date) => {
  const day = date.getDate();
  const month = MONTHS_TR[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

export default function LetterScreen() {
  const { prefs, patchPrefs } = useMode();
  const tohum = prefs?.tohum ?? 48; // İnci balance
  const [view, setView] = useState<"list" | "write" | "read">("list");
  const [letters, setLetters] = useState<Letter[]>(INITIAL_LETTERS);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [listTab, setListTab] = useState<"locked" | "opened">("locked");

  // Write variables
  const [writeTitle, setWriteTitle] = useState("");
  const [writeBody, setWriteBody] = useState("");
  const [writeOpenIn, setWriteOpenIn] = useState("1 yıl sonra");
  const [writeSeal, setWriteSeal] = useState(SEALS[0]);

  // Sealing date variables
  const [openDateMode, setOpenDateMode] = useState<"preset" | "days" | "custom">("preset");
  const [daysInput, setDaysInput] = useState("30");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Calendar navigation states
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  // Sealing animation states
  const [isSealing, setIsSealing] = useState(false);
  const [sealAnim] = useState(() => new Animated.Value(0)); // 0 to 1
  const [bottleWobble] = useState(() => new Animated.Value(1)); // bottle scale

  function handleOpenLetter(letter: Letter) {
    if (letter.status === "locked") {
      alert(
        "Mektup Mühürlü",
        `Bu mektubun açılmasına daha ${letter.daysLeft} gün var. Erken açmak için 5 İnci harcamak ister misin?`,
        [
          { text: "Vazgeç", style: "cancel" },
          {
            text: "Erken Aç (5 İnci)",
            onPress: async () => {
              if (tohum < 5) {
                alert("Yetersiz İnci 🫧", "Erken açmak için 5 İnci gerekir.");
                return;
              }
              // Server-side spend — a local deduction gets overwritten by the
              // next balance refetch, so the mektup would open "for free".
              try {
                const res = await spendPearls("mektup:erken-ac", 5);
                await patchPrefs({ tohum: res.balance });
                if (!res.spent) {
                  alert("Yetersiz İnci 🫧", "Erken açmak için 5 İnci gerekir.");
                  return;
                }
              } catch {
                alert("Açılamadı", "Bağlantı kurulamadı. Biraz sonra tekrar dene.");
                return;
              }
              const updated = letters.map((l) => (l.id === letter.id ? { ...l, status: "opened" as const } : l));
              setLetters(updated);
              setSelectedLetter({ ...letter, status: "opened" });
              setView("read");
            },
          },
        ]
      );
    } else {
      if (letter.status === "playable") {
        // First time opening, grant +2 İnci!
        void patchPrefs({ tohum: tohum + 2 });
        const updated = letters.map((l) => (l.id === letter.id ? { ...l, status: "opened" as const } : l));
        setLetters(updated);
        setSelectedLetter({ ...letter, status: "opened" });
      } else {
        setSelectedLetter(letter);
      }
      setView("read");
    }
  }

  function handleSaveLetter() {
    if (!writeTitle.trim() || !writeBody.trim()) {
      alert("Eksik", "Lütfen mektup başlığını ve içeriğini doldurun.");
      return;
    }

    let target = new Date();
    let daysTotal = 30;

    if (openDateMode === "preset") {
      if (writeOpenIn === "3 ay sonra") daysTotal = 90;
      else if (writeOpenIn === "6 ay sonra") daysTotal = 180;
      else daysTotal = 365;
      target.setDate(target.getDate() + daysTotal);
    } else if (openDateMode === "days") {
      const parsed = parseInt(daysInput, 10);
      if (isNaN(parsed) || parsed <= 0) {
        alert("Hata", "Lütfen geçerli bir gün sayısı girin.");
        return;
      }
      daysTotal = parsed;
      target.setDate(target.getDate() + daysTotal);
    } else {
      if (!selectedDate) {
        alert("Eksik", "Lütfen takvimden bir tarih seçin.");
        return;
      }
      target = new Date(selectedDate);
      const diffTime = target.getTime() - new Date().getTime();
      daysTotal = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    target.setHours(23, 59, 59, 999);

    const newLetter: Letter = {
      id: `${Date.now()}`,
      title: writeTitle.trim(),
      body: writeBody.trim(),
      seal: writeSeal,
      date: formatTurkishDate(new Date()),
      targetDate: formatTurkishDate(target),
      status: "locked",
      daysLeft: daysTotal,
      totalDays: daysTotal,
      mood: "İyi",
    };

    setLetters([newLetter, ...letters]);

    // Start animated bottle sealing overlay
    setIsSealing(true);
    sealAnim.setValue(0);
    bottleWobble.setValue(1);

    Animated.sequence([
      Animated.timing(sealAnim, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: true,
      }),
      Animated.spring(bottleWobble, {
        toValue: 1.25,
        friction: 4,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.spring(bottleWobble, {
        toValue: 1.0,
        friction: 4,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsSealing(false);
      setView("list");
      setWriteTitle("");
      setWriteBody("");
      // Reset variables
      setOpenDateMode("preset");
      setWriteOpenIn("1 yıl sonra");
      setDaysInput("30");
      setSelectedDate(null);
    });
  }

  function renderCustomCalendar() {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const now = new Date();
    
    // Disable previous month button if we are in the current month
    const isPrevDisabled = currentYear < now.getFullYear() || (currentYear === now.getFullYear() && currentMonth <= now.getMonth());

    const cells: { day: number | null; key: string }[] = [];
    // Pad first day
    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: null, key: `empty-${i}` });
    }
    // Days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, key: `day-${d}` });
    }

    function prevMonth() {
      if (isPrevDisabled) return;
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(prev => prev - 1);
      } else {
        setCurrentMonth(prev => prev - 1);
      }
    }

    function nextMonth() {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(prev => prev + 1);
      } else {
        setCurrentMonth(prev => prev + 1);
      }
    }

    return (
      <View style={styles.calendarContainer}>
        {/* Calendar Header with arrows */}
        <View style={styles.calendarHeader}>
          <Pressable onPress={prevMonth} disabled={isPrevDisabled} style={[styles.calArrowBtn, isPrevDisabled && styles.calArrowBtnDisabled]}>
            <Text style={[styles.calArrowText, isPrevDisabled && styles.calArrowTextDisabled]}>◀</Text>
          </Pressable>
          <Text style={styles.calendarMonthTitle}>
            {MONTHS_TR[currentMonth]} {currentYear}
          </Text>
          <Pressable onPress={nextMonth} style={styles.calArrowBtn}>
            <Text style={styles.calArrowText}>▶</Text>
          </Pressable>
        </View>

        {/* Days of Week */}
        <View style={styles.calendarWeekdays}>
          {DAYS_TR.map((d) => (
            <Text key={d} style={styles.calendarWeekdayText}>{d}</Text>
          ))}
        </View>

        {/* Days Grid */}
        <View style={styles.calendarGrid}>
          {cells.map((c) => {
            if (c.day === null) {
              return <View key={c.key} style={styles.calendarCellEmpty} />;
            }
            
            const cellDate = new Date(currentYear, currentMonth, c.day);
            const today = new Date();
            today.setHours(0,0,0,0);
            const isPast = cellDate < today;
            
            const isSelected = selectedDate && 
              selectedDate.getDate() === c.day && 
              selectedDate.getMonth() === currentMonth && 
              selectedDate.getFullYear() === currentYear;

            return (
              <Pressable
                key={c.key}
                disabled={isPast}
                style={[
                  styles.calendarCell,
                  isSelected && styles.calendarCellActive,
                  isPast && styles.calendarCellDisabled
                ]}
                onPress={() => setSelectedDate(cellDate)}
              >
                <Text style={[
                  styles.calendarCellText,
                  isSelected && styles.calendarCellTextActive,
                  isPast && styles.calendarCellTextDisabled
                ]}>
                  {c.day}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  const lockedLetters = letters.filter(l => l.status === "locked" || l.status === "playable");
  const openedLetters = letters.filter(l => l.status === "opened");

  return (
    <Screen scroll={false}>
      {view === "list" && (
        <View style={styles.flex}>
          <SubpageBar
            title="Mektup kutusu"
            right={
              <Pressable style={styles.balance} onPress={() => router.push("/atolye/shop")}>
                <Text style={styles.balanceText}>🫧 {tohum}</Text>
              </Pressable>
            }
          />
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.sub}>
              Kendine yazdığın mektuplar burada mühürlü bekler. Açılış tarihi gelince Yuvmi seni haberdar eder ve o günden bugüne neyin değiştiğini yanına koyar.
            </Text>

            {/* Write New Letter button is placed on top of letters */}
            <Pressable onPress={() => setView("write")} style={styles.dashedAdd}>
              <Text style={styles.dashedAddText}>+ Yeni mektup yaz</Text>
            </Pressable>
            <Text style={styles.limitHint}>
              Ücretsiz planda aynı anda 1 mühürlü mektup tutabilirsin (şu an {letters.filter(l => l.status === "locked").length}). Yuvmi+ ile sınırsız.
            </Text>

            {/* Archive / List tabs */}
            <View style={styles.tabsContainer}>
              <Pressable
                style={[styles.listTabBtn, listTab === "locked" && styles.listTabBtnActive]}
                onPress={() => setListTab("locked")}
              >
                <Text style={[styles.listTabBtnText, listTab === "locked" && styles.listTabBtnTextActive]}>
                  Mühürlüler ({lockedLetters.length})
                </Text>
              </Pressable>
              <Pressable
                style={[styles.listTabBtn, listTab === "opened" && styles.listTabBtnActive]}
                onPress={() => setListTab("opened")}
              >
                <Text style={[styles.listTabBtnText, listTab === "opened" && styles.listTabBtnTextActive]}>
                  Açılanlar ({openedLetters.length})
                </Text>
              </Pressable>
            </View>

            {/* Archive list cards */}
            {listTab === "locked" ? (
              lockedLetters.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Mühürlü mektubunuz bulunmuyor. Geleceğe ilk adımı atmak için yukarıdaki butondan yeni bir mektup yazın! ✉️</Text>
                </View>
              ) : (
                lockedLetters.map((l) => {
                  const total = l.totalDays || 30;
                  const leftDays = l.daysLeft ?? 0;
                  const progress = Math.max(0, Math.min(1, (total - leftDays) / total));

                  return (
                    <Glass key={l.id} style={styles.letterCard}>
                      <View style={[styles.sealCircle, { backgroundColor: l.seal.color }]}>
                        <Text style={styles.sealEmoji}>{l.seal.emoji}</Text>
                      </View>
                      <View style={styles.letterDetails}>
                        <Text style={styles.letterTitle}>{l.title}</Text>
                        <Text style={styles.letterMeta}>
                          {l.status === "playable" ? "bugün açılabilir 🥳" : `${l.targetDate} · ${leftDays} gün kaldı`}
                        </Text>
                        
                        {/* Progress Bar for Locked letters */}
                        {l.status === "locked" && (
                          <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                          </View>
                        )}
                      </View>
                      <Pressable
                        style={[styles.actionBtn, l.status === "playable" && styles.actionBtnActive]}
                        onPress={() => handleOpenLetter(l)}
                      >
                        <Text style={[styles.actionBtnText, l.status === "playable" && styles.actionBtnTextActive]}>
                          {l.status === "playable" ? "Aç" : "🔑 Erken aç"}
                        </Text>
                      </Pressable>
                    </Glass>
                  );
                })
              )
            ) : (
              openedLetters.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Henüz açılmış mektubunuz bulunmuyor. Zamanı gelen mühürlü mektuplarınız burada listelenecektir. 🐚</Text>
                </View>
              ) : (
                openedLetters.map((l) => (
                  <Glass key={l.id} style={styles.letterCard}>
                    <View style={[styles.sealCircle, { backgroundColor: l.seal.color }]}>
                      <Text style={styles.sealEmoji}>{l.seal.emoji}</Text>
                    </View>
                    <View style={styles.letterDetails}>
                      <Text style={styles.letterTitle}>{l.title}</Text>
                      <Text style={styles.letterMeta}>
                        açıldı · {l.targetDate}
                      </Text>
                    </View>
                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => handleOpenLetter(l)}
                    >
                      <Text style={styles.actionBtnText}>Oku</Text>
                    </Pressable>
                  </Glass>
                ))
              )
            )}

            <View style={{ height: 16 }} />

            <Glass style={styles.sealCollection}>
              <Eyebrow style={styles.lbl}>MÜHÜR KOLEKSİYONUN</Eyebrow>
              <View style={styles.pills}>
                {SEALS.map((s) => (
                  <View key={s.label} style={styles.pill}>
                    <Text style={styles.pillText}>
                      {s.emoji} {s.label}
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={styles.hint}>
                Yeni mühürleri Kıyıya Vuranlar dükkânından alırsın. Mühür sadece görünüştür — mektubun içeriğini etkilemez.
              </Text>
            </Glass>
          </ScrollView>
        </View>
      )}

      {view === "write" && (
        <View style={styles.flex}>
          <SubpageBar title="Gelecekteki Ben'e mektup" />
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.sub}>Bugünkü hâlinden geleceğe yaz. Seçtiğin tarihte sana geri açılır.</Text>
            
            <Glass style={styles.statCard}>
              <TextInput
                value={writeTitle}
                onChangeText={setWriteTitle}
                placeholder="Mektubun başlığı (örn: Kursu bitirdiğim gün)"
                placeholderTextColor={theme.color.ink40}
                style={styles.titleInput}
              />
              <TextInput
                value={writeBody}
                onChangeText={setWriteBody}
                multiline
                placeholder={"Sevgili ben,\n\nBunu yazarken..."}
                placeholderTextColor={theme.color.ink40}
                style={styles.bodyInput}
              />
            </Glass>

            <View style={styles.field}>
              <Eyebrow style={styles.lbl}>AÇILIŞ ZAMANINI BELİRLE</Eyebrow>
              
              {/* Selector Mode Button Row */}
              <View style={styles.dateModeRow}>
                <Pressable
                  style={[styles.dateModeBtn, openDateMode === "preset" && styles.dateModeBtnOn]}
                  onPress={() => setOpenDateMode("preset")}
                >
                  <Text style={[styles.dateModeBtnText, openDateMode === "preset" && styles.dateModeBtnTextOn]}>
                    Şablonlar
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.dateModeBtn, openDateMode === "days" && styles.dateModeBtnOn]}
                  onPress={() => setOpenDateMode("days")}
                >
                  <Text style={[styles.dateModeBtnText, openDateMode === "days" && styles.dateModeBtnTextOn]}>
                    Gün Sayısı
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.dateModeBtn, openDateMode === "custom" && styles.dateModeBtnOn]}
                  onPress={() => setOpenDateMode("custom")}
                >
                  <Text style={[styles.dateModeBtnText, openDateMode === "custom" && styles.dateModeBtnTextOn]}>
                    Özel Tarih
                  </Text>
                </Pressable>
              </View>

              {/* Render based on mode */}
              {openDateMode === "preset" && (
                <View style={styles.optionRow}>
                  {["3 ay sonra", "6 ay sonra", "1 yıl sonra"].map((opt) => (
                    <Pressable
                      key={opt}
                      style={[styles.optBtn, writeOpenIn === opt && styles.optBtnOn]}
                      onPress={() => setWriteOpenIn(opt)}
                    >
                      <Text style={[styles.optBtnText, writeOpenIn === opt && styles.optBtnTextOn]}>{opt}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {openDateMode === "days" && (
                <View style={styles.daysInputContainer}>
                  <TextInput
                    value={daysInput}
                    onChangeText={(val) => {
                      const cleaned = val.replace(/[^0-9]/g, "");
                      setDaysInput(cleaned);
                    }}
                    keyboardType="numeric"
                    style={styles.daysInput}
                    placeholder="Kaç gün sonra açılsın? (Örn: 45)"
                    placeholderTextColor={theme.color.ink40}
                  />
                  {daysInput !== "" && (
                    <Text style={styles.daysPreviewText}>
                      📅 Mektup Açılış Tarihi: {(() => {
                        const days = parseInt(daysInput, 10);
                        if (isNaN(days) || days <= 0) return "Geçersiz gün";
                        const target = new Date();
                        target.setDate(target.getDate() + days);
                        return formatTurkishDate(target);
                      })()}
                    </Text>
                  )}
                </View>
              )}

              {openDateMode === "custom" && (
                <View style={styles.calendarWrapper}>
                  {renderCustomCalendar()}
                  {selectedDate && (
                    <Text style={styles.daysPreviewText}>
                      📅 Seçilen Açılış Tarihi: {formatTurkishDate(selectedDate)} ({(() => {
                        const diffTime = selectedDate.getTime() - new Date().getTime();
                        const days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                        return `${days} gün kaldı`;
                      })()})
                    </Text>
                  )}
                </View>
              )}
            </View>

            <View style={styles.field}>
              <Eyebrow style={styles.lbl}>MÜHÜR SEÇİMİ</Eyebrow>
              <View style={styles.optionRow}>
                {SEALS.map((s) => (
                  <Pressable
                    key={s.label}
                    style={[styles.optBtn, writeSeal.label === s.label && styles.optBtnOn]}
                    onPress={() => setWriteSeal(s)}
                  >
                    <Text style={[styles.optBtnText, writeSeal.label === s.label && styles.optBtnTextOn]}>
                      {s.emoji} {s.label.split(" ")[0]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable style={styles.sealBtn} onPress={handleSaveLetter}>
              <Text style={styles.sealBtnText}>Mektubu Mühürle</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => setView("list")}>
              <Text style={styles.cancelBtnText}>Vazgeç</Text>
            </Pressable>
          </ScrollView>
        </View>
      )}

      {view === "read" && selectedLetter && (
        <View style={styles.flex}>
          <SubpageBar title={selectedLetter.title} />
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.metaSub}>
              {selectedLetter.date} tarihinde yazıldı · o günkü ruh hâlin: {selectedLetter.mood}
            </Text>

            <Glass style={styles.letterContentCard}>
              <Text style={styles.letterContentBody}>{selectedLetter.body}</Text>
            </Glass>

            <Glass style={styles.comparisonCard}>
              <Eyebrow style={styles.lbl}>O GÜNDEN BUGÜNE</Eyebrow>
              <Text style={styles.comparisonBody}>
                Bu mektubu yazdığın gün ruh hâlin &quot;{selectedLetter.mood}&quot; idi. O günden bugüne: 42 gün geçti, 2 kez yoldan çıkıp 2 kez planına geri döndün.
              </Text>
            </Glass>

            <Glass style={styles.cardGift}>
              <Eyebrow style={styles.lbl}>BU MEKTUPTAN BİR KART ÇIKTI</Eyebrow>
              <View style={styles.giftBox}>
                <View style={[styles.sealCircle, { backgroundColor: selectedLetter.seal.color, marginRight: 10 }]}>
                  <Text style={styles.sealEmoji}>{selectedLetter.seal.emoji}</Text>
                </View>
                <View>
                  <Text style={styles.giftTitle}>Yeni Mühür Unlocked!</Text>
                  <Text style={styles.giftSub}>{selectedLetter.seal.label} koleksiyonuna eklendi.</Text>
                </View>
              </View>
            </Glass>

            <View style={styles.toast}>
              <Text style={styles.toastText}>+2 İnci 🫧 · mektup açıldı</Text>
            </View>

            <Pressable style={styles.sealBtn} onPress={() => setView("list")}>
              <Text style={styles.sealBtnText}>Kutuya Geri Dön</Text>
            </Pressable>
          </ScrollView>
        </View>
      )}

      {/* Full-screen Sealing Animation overlay */}
      {isSealing && (
        <View style={styles.animOverlay}>
          <View style={styles.animGlassContainer}>
            <Text style={styles.animTitle}>Mektubunuz Mühürleniyor... 🫧</Text>
            <Text style={styles.animSubtitle}>Geleceğe doğru güvenli bir yolculuğa çıkıyor.</Text>
            
            {/* The space where the animation happens */}
            <View style={styles.animSpace}>
              {/* Bottle at the bottom of space */}
              <Animated.View style={[styles.animBottleContainer, { transform: [{ scale: bottleWobble }] }]}>
                <Text style={styles.animBottle}>🍾</Text>
                <View style={styles.bottleGlow} />
              </Animated.View>

              {/* Letter flying from top of space to bottom */}
              <Animated.View style={[
                styles.animLetterContainer,
                {
                  transform: [
                    {
                      translateY: sealAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-180, 55], // moves down towards the bottle opening
                      })
                    },
                    {
                      translateX: sealAnim.interpolate({
                        inputRange: [0, 0.25, 0.5, 0.75, 1],
                        outputRange: [0, -15, 15, -10, 0], // slaloms down
                      })
                    },
                    {
                      scale: sealAnim.interpolate({
                        inputRange: [0, 0.8, 1],
                        outputRange: [1.2, 0.8, 0.15], // shrinks to fit in bottle opening
                      })
                    },
                    {
                      rotate: sealAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0deg", "720deg"], // spins twice
                      })
                    }
                  ],
                  opacity: sealAnim.interpolate({
                    inputRange: [0, 0.8, 1],
                    outputRange: [1, 1, 0], // fades out just as it enters
                  })
                }
              ]}>
                <View style={[styles.animLetter, { backgroundColor: writeSeal.color }]}>
                  <Text style={styles.animLetterEmoji}>✉️</Text>
                  <View style={styles.animLetterSeal}>
                    <Text style={styles.animLetterSealEmoji}>{writeSeal.emoji}</Text>
                  </View>
                </View>
              </Animated.View>
            </View>
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    paddingBottom: 40,
  },
  balance: {
    backgroundColor: "rgba(37,99,235,0.12)",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  balanceText: {
    fontFamily: theme.font.sansSemibold,
    fontWeight: theme.font.weight.semibold,
    fontSize: 12.5,
    color: theme.color.blueDeep,
  },
  sub: {
    fontFamily: theme.font.sans,
    fontSize: 13.5,
    color: theme.color.ink70,
    lineHeight: 20,
    marginBottom: 16,
  },
  metaSub: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    color: theme.color.ink40,
    marginBottom: 14,
  },
  letterCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginBottom: 8,
  },
  sealCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  sealEmoji: {
    fontSize: 20,
  },
  letterDetails: {
    flex: 1,
    marginLeft: 12,
  },
  letterTitle: {
    fontFamily: theme.font.sansBold,
    fontWeight: theme.font.weight.bold,
    fontSize: 14.5,
    color: theme.color.ink,
  },
  letterMeta: {
    fontFamily: theme.font.mono,
    fontSize: 11,
    color: theme.color.ink40,
    marginTop: 2,
  },
  actionBtn: {
    backgroundColor: "rgba(11,18,32,0.06)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  actionBtnActive: {
    backgroundColor: theme.color.blue,
  },
  actionBtnText: {
    fontFamily: theme.font.sansSemibold,
    fontSize: 12,
    color: theme.color.ink70,
  },
  actionBtnTextActive: {
    color: "#fff",
  },
  dashedAdd: {
    marginTop: 4,
    backgroundColor: "rgba(255,255,255,0.4)",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.color.blueLight,
    borderRadius: 14,
    padding: 13,
    alignItems: "center",
  },
  dashedAddText: {
    fontFamily: theme.font.sansSemibold,
    fontSize: 13.5,
    fontWeight: theme.font.weight.semibold,
    color: theme.color.blueDeep,
  },
  limitHint: {
    marginTop: 10,
    fontFamily: theme.font.sans,
    fontSize: 11.5,
    color: theme.color.ink40,
    textAlign: "center",
    marginBottom: 16,
  },
  sealCollection: {
    padding: 14,
  },
  lbl: {
    marginBottom: 8,
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  pill: {
    backgroundColor: "rgba(37,99,235,0.1)",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  pillText: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    color: theme.color.blueDeep,
  },
  hint: {
    fontFamily: theme.font.sans,
    fontSize: 11.5,
    color: theme.color.ink40,
    lineHeight: 16,
  },
  statCard: {
    padding: 16,
    marginBottom: 12,
  },
  titleInput: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(11,18,32,0.09)",
    paddingVertical: 8,
    fontFamily: theme.font.sansBold,
    fontSize: 15,
    color: theme.color.ink,
    marginBottom: 12,
  },
  bodyInput: {
    minHeight: 180,
    fontFamily: theme.font.sans,
    fontSize: 14,
    color: theme.color.ink,
    textAlignVertical: "top",
    lineHeight: 20,
  },
  field: {
    marginBottom: 14,
  },
  optionRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  optBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.color.ink15,
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  optBtnOn: {
    backgroundColor: theme.color.blue,
    borderColor: theme.color.blue,
  },
  optBtnText: {
    fontFamily: theme.font.sansSemibold,
    fontSize: 12,
    color: theme.color.ink70,
  },
  optBtnTextOn: {
    color: "#fff",
  },
  sealBtn: {
    backgroundColor: theme.color.blue,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 10,
  },
  sealBtnText: {
    color: "#fff",
    fontFamily: theme.font.sansSemibold,
    fontSize: 14,
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 10,
    marginTop: 6,
  },
  cancelBtnText: {
    fontFamily: theme.font.sansSemibold,
    fontSize: 13,
    color: theme.color.ink40,
  },
  letterContentCard: {
    padding: 18,
    marginBottom: 12,
  },
  letterContentBody: {
    fontFamily: theme.font.sans,
    fontSize: 14.5,
    color: theme.color.ink,
    lineHeight: 22,
  },
  comparisonCard: {
    padding: 14,
    marginBottom: 12,
  },
  comparisonBody: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    color: theme.color.ink70,
    lineHeight: 19,
  },
  cardGift: {
    padding: 14,
    marginBottom: 12,
  },
  giftBox: {
    flexDirection: "row",
    alignItems: "center",
  },
  giftTitle: {
    fontFamily: theme.font.sansBold,
    fontSize: 13.5,
    color: theme.color.ink,
  },
  giftSub: {
    fontFamily: theme.font.sans,
    fontSize: 12,
    color: theme.color.ink40,
    marginTop: 2,
  },
  toast: {
    backgroundColor: "rgba(11,18,32,0.85)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: "center",
    marginBottom: 10,
  },
  toastText: {
    color: "#fff",
    fontFamily: theme.font.mono,
    fontSize: 12,
  },
  
  // Custom Styles Added
  tabsContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  listTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    borderWidth: 1,
    borderColor: theme.color.ink15,
  },
  listTabBtnActive: {
    backgroundColor: theme.color.blue,
    borderColor: theme.color.blue,
  },
  listTabBtnText: {
    fontFamily: theme.font.sansSemibold,
    fontSize: 12.5,
    color: theme.color.ink70,
  },
  listTabBtnTextActive: {
    color: "#fff",
  },
  progressBarBg: {
    height: 4,
    backgroundColor: "rgba(11, 18, 32, 0.08)",
    borderRadius: 2,
    marginTop: 8,
    width: "80%",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: theme.color.blue,
    borderRadius: 2,
  },
  emptyContainer: {
    padding: 24,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(11, 18, 32, 0.05)",
    marginBottom: 16,
  },
  emptyText: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    color: theme.color.ink50,
    textAlign: "center",
    lineHeight: 18,
  },
  dateModeRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  dateModeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "rgba(11, 18, 32, 0.04)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  dateModeBtnOn: {
    backgroundColor: "rgba(37, 99, 235, 0.08)",
    borderColor: "rgba(37, 99, 235, 0.2)",
  },
  dateModeBtnText: {
    fontFamily: theme.font.sansSemibold,
    fontSize: 11.5,
    color: theme.color.ink70,
  },
  dateModeBtnTextOn: {
    color: theme.color.blueDeep,
  },
  daysInputContainer: {
    marginTop: 4,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.color.ink15,
  },
  daysInput: {
    fontFamily: theme.font.sansSemibold,
    fontSize: 14,
    color: theme.color.ink,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(11,18,32,0.08)",
    paddingVertical: 6,
  },
  daysPreviewText: {
    fontFamily: theme.font.sansSemibold,
    fontSize: 12,
    color: theme.color.blueDeep,
    marginTop: 8,
  },
  calendarWrapper: {
    marginTop: 4,
    backgroundColor: "rgba(255, 255, 255, 0.45)",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.color.ink15,
  },
  calendarContainer: {
    width: "100%",
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  calArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(11, 18, 32, 0.04)",
    justifyContent: "center",
    alignItems: "center",
  },
  calArrowBtnDisabled: {
    opacity: 0.3,
  },
  calArrowText: {
    fontSize: 11,
    color: theme.color.ink70,
  },
  calArrowTextDisabled: {
    color: theme.color.ink30,
  },
  calendarMonthTitle: {
    fontFamily: theme.font.sansBold,
    fontSize: 13.5,
    color: theme.color.ink,
  },
  calendarWeekdays: {
    flexDirection: "row",
    marginBottom: 6,
  },
  calendarWeekdayText: {
    flex: 1,
    textAlign: "center",
    fontFamily: theme.font.sansSemibold,
    fontSize: 11,
    color: theme.color.ink40,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 4,
  },
  calendarCell: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  calendarCellEmpty: {
    width: "14.28%",
    aspectRatio: 1,
  },
  calendarCellActive: {
    backgroundColor: theme.color.blue,
  },
  calendarCellDisabled: {
    opacity: 0.25,
  },
  calendarCellText: {
    fontFamily: theme.font.mono,
    fontSize: 12,
    color: theme.color.ink,
  },
  calendarCellTextActive: {
    color: "#fff",
    fontFamily: theme.font.sansBold,
    fontWeight: theme.font.weight.bold,
  },
  calendarCellTextDisabled: {
    color: theme.color.ink40,
  },

  // Animation Specific Styles
  animOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(11, 23, 44, 0.9)",
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  animGlassContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  animTitle: {
    fontFamily: theme.font.sansBold,
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
    marginBottom: 6,
  },
  animSubtitle: {
    fontFamily: theme.font.sans,
    fontSize: 12.5,
    color: "rgba(255, 255, 255, 0.55)",
    textAlign: "center",
    marginBottom: 24,
  },
  animSpace: {
    height: 280,
    width: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  animBottleContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 100,
    width: 100,
    marginBottom: 10,
  },
  animBottle: {
    fontSize: 70,
    zIndex: 2,
  },
  bottleGlow: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    zIndex: 1,
    bottom: 10,
  },
  animLetterContainer: {
    position: "absolute",
    top: "50%",
    marginTop: -30,
    zIndex: 5,
  },
  animLetter: {
    width: 70,
    height: 52,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.35)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  animLetterEmoji: {
    fontSize: 28,
  },
  animLetterSeal: {
    position: "absolute",
    bottom: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
  },
  animLetterSealEmoji: {
    fontSize: 12,
  },
});
