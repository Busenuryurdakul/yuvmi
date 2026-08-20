const MONTH_SHORT = [
  "OCA",
  "ŞUB",
  "MAR",
  "NİS",
  "MAY",
  "HAZ",
  "TEM",
  "AĞU",
  "EYL",
  "EKİ",
  "KAS",
  "ARA",
];

const WEEKDAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

export function stampDate(date = new Date()) {
  return `${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`;
}

export function longDate(date = new Date()) {
  return `${WEEKDAYS[date.getDay()]} · ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function shortStamp(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

export function toDateKey(value: string | Date) {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return value.slice(0, 10);
}
