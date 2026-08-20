import { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SubpageScreen } from "@/components/ui/SubpageScreen";
import { Eyebrow, Glass } from "@/components/ui/Glass";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useMode } from "@/context/ModeContext";
import { confirmNotificationDesign } from "@/lib/api/yuvmi";
import { alert } from "@/lib/alert";
import { theme } from "@/theme";

type CustomNotification = {
  id: string;
  text: string;
  time: string;
  repeat: string;
};

const STORAGE_KEYS = {
  SABAH_TIME: "yuvmi_noti_sabah_time",
  AKSAM_TIME: "yuvmi_noti_aksam_time",
  GUNUN_NIYETI: "yuvmi_noti_gunun_niyeti",
  AKSAM_OZET: "yuvmi_noti_aksam_ozet",
  HAFTALIK_DEG: "yuvmi_noti_haftalik_deg",
  GERI_DONUS: "yuvmi_noti_geri_donus",
  MOTIVASYON_ON: "yuvmi_noti_motivasyon_on",
  MOTIVASYON_FREQ: "yuvmi_noti_motivasyon_freq",
  CUSTOM_LIST: "yuvmi_noti_custom_list",
};

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { patchPrefs } = useMode();

  // Times
  const [sabahTime, setSabahTime] = useState("08:00");
  const [aksamTime, setAksamTime] = useState("21:30");

  // Switch types
  const [gununNiyeti, setGununNiyeti] = useState(true);
  const [aksamOzet, setAksamOzet] = useState(true);
  const [haftalikDeg, setHaftalikDeg] = useState(true);
  const [geriDonus, setGeriDonus] = useState(true);
  const [motivasyonOn, setMotivasyonOn] = useState(false);

  // Motivation Frequency
  const [motivasyonFreq, setMotivasyonFreq] = useState("Günde 1");

  // Custom Notifications form
  const [customText, setCustomText] = useState("Su içtin mi? 💧");
  const [customRepeat, setCustomRepeat] = useState("Her gün");
  const [customTime, setCustomTime] = useState("14:00");

  // Custom Notifications list
  const [customList, setCustomList] = useState<CustomNotification[]>([
    {
      id: "1",
      text: "Su içtin mi? 💧",
      time: "14:00",
      repeat: "her gün",
    },
    {
      id: "2",
      text: "Kursa 10 dakika ayır",
      time: "12:30",
      repeat: "hafta içi",
    },
  ]);

  // Load saved preferences
  useEffect(() => {
    void (async () => {
      try {
        const getStr = async (k: string, df: string) => (await AsyncStorage.getItem(k)) ?? df;
        const getBool = async (k: string, df: boolean) => {
          const val = await AsyncStorage.getItem(k);
          return val !== null ? val === "true" : df;
        };

        setSabahTime(await getStr(STORAGE_KEYS.SABAH_TIME, "08:00"));
        setAksamTime(await getStr(STORAGE_KEYS.AKSAM_TIME, "21:30"));
        setGununNiyeti(await getBool(STORAGE_KEYS.GUNUN_NIYETI, true));
        setAksamOzet(await getBool(STORAGE_KEYS.AKSAM_OZET, true));
        setHaftalikDeg(await getBool(STORAGE_KEYS.HAFTALIK_DEG, true));
        setGeriDonus(await getBool(STORAGE_KEYS.GERI_DONUS, true));
        setMotivasyonOn(await getBool(STORAGE_KEYS.MOTIVASYON_ON, false));
        setMotivasyonFreq(await getStr(STORAGE_KEYS.MOTIVASYON_FREQ, "Günde 1"));

        const savedCustom = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_LIST);
        if (savedCustom) {
          setCustomList(JSON.parse(savedCustom) as CustomNotification[]);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  // Save preference helper
  const saveVal = async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  };

  const addCustomNotification = async () => {
    const txt = customText.trim();
    const time = customTime.trim();
    if (!txt) {
      alert("Hata", "Lütfen bir bildirim metni yazın.");
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(time)) {
      alert("Hata", "Lütfen geçerli bir saat girin (Örn: 14:00).");
      return;
    }

    const newItem: CustomNotification = {
      id: String(Date.now()),
      text: txt,
      time,
      repeat: customRepeat.toLowerCase(),
    };

    const nextList = [...customList, newItem];
    setCustomList(nextList);
    setCustomText("");
    await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_LIST, JSON.stringify(nextList));

    if (!user?.token) return;
    try {
      const award = await confirmNotificationDesign();
      await patchPrefs({ tohum: award.balance });
      if (award.awarded) {
        alert("Bildirim tasarlandı 🫧", "+3 İnci kazandın — kendi sözlerinle konuştun.");
      }
    } catch {
      /* pearl award is a bonus, not critical */
    }
  };

  const removeCustomNotification = async (id: string) => {
    const nextList = customList.filter((item) => item.id !== id);
    setCustomList(nextList);
    await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_LIST, JSON.stringify(nextList));
  };

  return (
    <SubpageScreen title="Bildirimler">
      <Text style={styles.sub}>
        Yuvmi sana ne zaman, ne sıklıkta, nasıl seslensin — sen seç.
      </Text>

      {/* SAATLER */}
      <Glass style={styles.card}>
        <Eyebrow style={styles.lbl}>SAATLER</Eyebrow>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Sabah niyeti</Text>
          <View style={styles.timeBox}>
            <TextInput
              style={styles.timeInput}
              value={sabahTime}
              onChangeText={(val) => {
                setSabahTime(val);
                void saveVal(STORAGE_KEYS.SABAH_TIME, val);
              }}
              placeholder="08:00"
              maxLength={5}
              keyboardType="numbers-and-punctuation"
            />
            <Text style={styles.timeIcon}>⏰</Text>
          </View>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Akşam kapanışı</Text>
          <View style={styles.timeBox}>
            <TextInput
              style={styles.timeInput}
              value={aksamTime}
              onChangeText={(val) => {
                setAksamTime(val);
                void saveVal(STORAGE_KEYS.AKSAM_TIME, val);
              }}
              placeholder="21:30"
              maxLength={5}
              keyboardType="numbers-and-punctuation"
            />
            <Text style={styles.timeIcon}>⏰</Text>
          </View>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Haftalık değerlendirme</Text>
          <Text style={styles.disabledText}>Pazar 19:00</Text>
        </View>
      </Glass>

      {/* BİLDİRİM TÜRLERİ */}
      <Glass style={styles.card}>
        <Eyebrow style={styles.lbl}>BİLDİRİM TÜRLERİ</Eyebrow>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Günün niyeti</Text>
          <Switch
            value={gununNiyeti}
            onValueChange={(val) => {
              setGununNiyeti(val);
              void saveVal(STORAGE_KEYS.GUNUN_NIYETI, String(val));
            }}
            trackColor={{ false: "rgba(11, 18, 32, 0.12)", true: theme.color.blue }}
            thumbColor="#ffffff"
            {...{ activeThumbColor: "#ffffff" }}
            ios_backgroundColor="rgba(11, 18, 32, 0.08)"
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Akşam ritim özeti</Text>
          <Switch
            value={aksamOzet}
            onValueChange={(val) => {
              setAksamOzet(val);
              void saveVal(STORAGE_KEYS.AKSAM_OZET, String(val));
            }}
            trackColor={{ false: "rgba(11, 18, 32, 0.12)", true: theme.color.blue }}
            thumbColor="#ffffff"
            {...{ activeThumbColor: "#ffffff" }}
            ios_backgroundColor="rgba(11, 18, 32, 0.08)"
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Haftalık değerlendirme</Text>
          <Switch
            value={haftalikDeg}
            onValueChange={(val) => {
              setHaftalikDeg(val);
              void saveVal(STORAGE_KEYS.HAFTALIK_DEG, String(val));
            }}
            trackColor={{ false: "rgba(11, 18, 32, 0.12)", true: theme.color.blue }}
            thumbColor="#ffffff"
            {...{ activeThumbColor: "#ffffff" }}
            ios_backgroundColor="rgba(11, 18, 32, 0.08)"
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Geri dönüş karşılaması</Text>
          <Switch
            value={geriDonus}
            onValueChange={(val) => {
              setGeriDonus(val);
              void saveVal(STORAGE_KEYS.GERI_DONUS, String(val));
            }}
            trackColor={{ false: "rgba(11, 18, 32, 0.12)", true: theme.color.blue }}
            thumbColor="#ffffff"
            {...{ activeThumbColor: "#ffffff" }}
            ios_backgroundColor="rgba(11, 18, 32, 0.08)"
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Motivasyon cümlesi</Text>
          <Switch
            value={motivasyonOn}
            onValueChange={(val) => {
              setMotivasyonOn(val);
              void saveVal(STORAGE_KEYS.MOTIVASYON_ON, String(val));
            }}
            trackColor={{ false: "rgba(11, 18, 32, 0.12)", true: theme.color.blue }}
            thumbColor="#ffffff"
            {...{ activeThumbColor: "#ffffff" }}
            ios_backgroundColor="rgba(11, 18, 32, 0.08)"
          />
        </View>
      </Glass>

      {/* MOTİVASYON SIKLIĞI */}
      <Glass style={styles.card}>
        <Eyebrow style={styles.lbl}>MOTİVASYON SIKLIĞI</Eyebrow>
        <View style={styles.pills}>
          {["Kapalı", "Günde 1", "Günde 2", "Haftada 3"].map((freq) => {
            const isSelected = motivasyonFreq === freq;
            return (
              <Pressable
                key={freq}
                style={[styles.pill, isSelected && styles.pillSelected]}
                onPress={() => {
                  setMotivasyonFreq(freq);
                  void saveVal(STORAGE_KEYS.MOTIVASYON_FREQ, freq);
                }}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextOn]}>
                  {freq}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>
          Motivasyon cümleleri kendi olumlamalarından seçilir.
        </Text>
      </Glass>

      {/* KENDİ BİLDİRİMİN */}
      <Glass style={styles.card}>
        <Eyebrow style={styles.lbl}>KENDİ BİLDİRİMİN</Eyebrow>

        {/* NE YAZSIN */}
        <Text style={styles.formLabel}>NE YAZSIN</Text>
        <TextInput
          style={styles.input}
          value={customText}
          onChangeText={setCustomText}
          placeholder="Su içtin mi? 💧"
          placeholderTextColor={theme.color.ink40}
        />

        {/* TEKRAR */}
        <Text style={styles.formLabel}>TEKRAR</Text>
        <View style={styles.pills}>
          {["Her gün", "Hafta içi", "Haftada 1"].map((rep) => {
            const isSelected = customRepeat === rep;
            return (
              <Pressable
                key={rep}
                style={[styles.pill, isSelected && styles.pillSelected]}
                onPress={() => setCustomRepeat(rep)}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextOn]}>
                  {rep}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* SAAT */}
        <Text style={[styles.formLabel, { marginTop: 12 }]}>SAAT</Text>
        <View style={[styles.timeBox, { alignSelf: "flex-start", width: 90 }]}>
          <TextInput
            style={styles.timeInput}
            value={customTime}
            onChangeText={setCustomTime}
            placeholder="14:00"
            maxLength={5}
            keyboardType="numbers-and-punctuation"
          />
          <Text style={styles.timeIcon}>⏰</Text>
        </View>

        <Button
          label="Bildirimi ekle"
          onPress={() => void addCustomNotification()}
          style={{ marginTop: 16 }}
        />

        {/* Custom Notifications List */}
        <View style={styles.list}>
          {customList.map((item) => (
            <View key={item.id} style={styles.listItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{item.text}</Text>
                <Text style={styles.itemSubtitle}>
                  {item.time} · {item.repeat}
                </Text>
              </View>
              <Pressable onPress={() => void removeCustomNotification(item.id)}>
                <Text style={styles.itemDel}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </Glass>

      <Text style={styles.bottomNote}>
        Bu önizlemede bildirimler cihazına gerçekten gönderilmez.
      </Text>
    </SubpageScreen>
  );
}

const styles = StyleSheet.create({
  sub: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    color: theme.color.ink70,
    lineHeight: 19,
    marginBottom: 14,
  },
  card: {
    padding: 16,
    marginBottom: 12,
  },
  lbl: {
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(11,18,32,0.06)",
  },
  rowLabel: {
    fontFamily: theme.font.sansSemibold,
    fontSize: 14,
    color: theme.color.ink,
  },
  timeBox: {
    backgroundColor: "rgba(255,255,255,0.65)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.09)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeInput: {
    fontFamily: theme.font.mono,
    fontSize: 13,
    color: theme.color.ink,
    width: 44,
    padding: 0,
  },
  timeIcon: {
    fontSize: 12,
  },
  disabledText: {
    fontFamily: theme.font.mono,
    fontSize: 13,
    color: theme.color.ink40,
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginVertical: 4,
  },
  pill: {
    borderWidth: 1,
    borderColor: theme.color.ink15,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 11,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  pillSelected: {
    backgroundColor: theme.color.blue,
    borderColor: theme.color.blue,
  },
  pillText: {
    fontFamily: theme.font.sans,
    fontSize: 12.5,
    color: theme.color.ink70,
  },
  pillTextOn: {
    color: "#fff",
  },
  hint: {
    marginTop: 10,
    fontFamily: theme.font.sans,
    fontSize: 12,
    color: theme.color.ink40,
    lineHeight: 17,
  },
  formLabel: {
    fontFamily: theme.font.mono,
    fontSize: 10.5,
    color: theme.color.ink50,
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.color.ink15,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: theme.font.sans,
    fontSize: 14,
    color: theme.color.ink,
    marginBottom: 8,
  },
  list: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(11,18,32,0.06)",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(11,18,32,0.06)",
  },
  itemTitle: {
    fontFamily: theme.font.sansSemibold,
    fontSize: 14,
    color: theme.color.ink,
  },
  itemSubtitle: {
    fontFamily: theme.font.mono,
    fontSize: 11.5,
    color: theme.color.ink40,
    marginTop: 2,
  },
  itemDel: {
    fontFamily: theme.font.sansBold,
    fontSize: 22,
    color: "rgba(220,38,38,0.75)",
    paddingHorizontal: 8,
  },
  bottomNote: {
    fontFamily: theme.font.sans,
    fontSize: 11,
    color: theme.color.ink40,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 20,
  },
});
