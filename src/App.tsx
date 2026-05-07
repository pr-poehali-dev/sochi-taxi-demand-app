import { useState } from "react";
import Icon from "@/components/ui/icon";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "map" | "notifications" | "flights" | "stats" | "profile";
type DemandLevel = "high" | "mid" | "low" | "airport";

interface Zone {
  id: string;
  name: string;
  demand: DemandLevel;
  coef: number;
  waitMin: number;
  distKm: number;
  orders: number;
  profit: number;
}

interface Flight {
  id: string;
  number: string;
  origin: string;
  time: string;
  status: "arriving" | "arrived" | "delayed" | "departing";
  passengers: number;
  terminal: string;
}

interface Notification {
  id: string;
  type: "high_demand" | "airport" | "promo" | "system";
  title: string;
  body: string;
  time: string;
  read: boolean;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const ZONES: Zone[] = [
  { id: "1", name: "Аэропорт Сочи", demand: "airport", coef: 2.4, waitMin: 2, distKm: 0, orders: 47, profit: 890 },
  { id: "2", name: "Центр / Навагинская", demand: "high", coef: 1.9, waitMin: 3, distKm: 8, orders: 31, profit: 620 },
  { id: "3", name: "Адлер — набережная", demand: "high", coef: 1.7, waitMin: 4, distKm: 4, orders: 28, profit: 540 },
  { id: "4", name: "Роза Хутор", demand: "mid", coef: 1.4, waitMin: 7, distKm: 42, orders: 14, profit: 380 },
  { id: "5", name: "Хоста / Кудепста", demand: "mid", coef: 1.2, waitMin: 9, distKm: 12, orders: 9, profit: 210 },
  { id: "6", name: "Лазаревское", demand: "low", coef: 1.0, waitMin: 18, distKm: 65, orders: 4, profit: 95 },
];

const FLIGHTS: Flight[] = [
  { id: "1", number: "SU 1432", origin: "Москва (SVO)", time: "14:05", status: "arriving", passengers: 180, terminal: "A" },
  { id: "2", number: "U6 225", origin: "Екатеринбург", time: "14:20", status: "arriving", passengers: 150, terminal: "A" },
  { id: "3", number: "DP 403", origin: "СПб (LED)", time: "13:50", status: "arrived", passengers: 160, terminal: "A" },
  { id: "4", number: "SU 1538", origin: "Москва (SVO)", time: "15:10", status: "departing", passengers: 175, terminal: "B" },
  { id: "5", number: "FV 5921", origin: "Казань", time: "14:55", status: "delayed", passengers: 120, terminal: "A" },
  { id: "6", number: "DP 541", origin: "Новосибирск", time: "15:40", status: "arriving", passengers: 140, terminal: "A" },
];

const NOTIFICATIONS_INIT: Notification[] = [
  { id: "1", type: "high_demand", title: "Высокий спрос!", body: "Зона Аэропорт — коэф. 2.4×. 47 заказов ждут.", time: "2 мин назад", read: false },
  { id: "2", type: "airport", title: "Прилёт SU 1432", body: "Через 15 мин приземляется борт из Москвы, 180 пасс.", time: "8 мин назад", read: false },
  { id: "3", type: "high_demand", title: "Спрос растёт — Центр", body: "Навагинская: коэф. вырос до 1.9×. 31 заказ.", time: "22 мин назад", read: true },
  { id: "4", type: "promo", title: "Бонус за 10 поездок", body: "+500 ₽ за выполнение 10 заказов до 20:00.", time: "1 ч назад", read: true },
  { id: "5", type: "airport", title: "Прилёт DP 403 завершён", body: "Рейс из СПб приземлился. 160 пассажиров ищут такси.", time: "40 мин назад", read: true },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const demandLabel: Record<DemandLevel, string> = {
  high: "Высокий",
  mid: "Средний",
  low: "Низкий",
  airport: "Аэропорт",
};

const demandClass: Record<DemandLevel, string> = {
  high: "zone-high text-zone-high",
  mid: "zone-mid text-zone-mid",
  low: "zone-low text-zone-low",
  airport: "zone-airport text-zone-airport",
};

const demandDot: Record<DemandLevel, string> = {
  high: "bg-red-500",
  mid: "bg-yellow-400",
  low: "bg-green-500",
  airport: "bg-blue-500",
};

const flightStatusLabel: Record<Flight["status"], string> = {
  arriving: "Прилёт",
  arrived: "Прибыл",
  delayed: "Задержан",
  departing: "Вылет",
};

const flightStatusColor: Record<Flight["status"], string> = {
  arriving: "text-blue-400",
  arrived: "text-green-400",
  delayed: "text-red-400",
  departing: "text-yellow-400",
};

const notifIcon: Record<Notification["type"], string> = {
  high_demand: "Zap",
  airport: "Plane",
  promo: "Gift",
  system: "Info",
};

const notifColor: Record<Notification["type"], string> = {
  high_demand: "text-red-400",
  airport: "text-blue-400",
  promo: "text-yellow-400",
  system: "text-muted-foreground",
};

// ─── Stat mini-card ───────────────────────────────────────────────────────────
function Stat({ label, value, icon, highlight }: { label: string; value: string; icon: string; highlight?: boolean }) {
  return (
    <div className="bg-background/40 rounded-xl p-2.5">
      <div className="flex items-center gap-1 mb-1">
        <Icon name={icon} size={11} className="text-muted-foreground" fallback="Circle" />
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <p className={`text-sm font-bold font-mono ${highlight ? "text-primary" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

// ─── MAP TAB ─────────────────────────────────────────────────────────────────
function MapTab() {
  const [filter, setFilter] = useState<"all" | DemandLevel>("all");
  const [sortBy, setSortBy] = useState<"profit" | "coef" | "wait">("profit");

  const sorted = [...ZONES]
    .filter((z) => filter === "all" || z.demand === filter)
    .sort((a, b) => {
      if (sortBy === "profit") return b.profit - a.profit;
      if (sortBy === "coef") return b.coef - a.coef;
      return a.waitMin - b.waitMin;
    });

  return (
    <div className="flex flex-col gap-4 p-4 animate-fade-in">
      {/* Live coef banner */}
      <div className="rounded-2xl bg-primary/10 border border-primary/30 p-4 flex items-center justify-between glow-orange">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Лучший коэф. прямо сейчас</p>
          <p className="text-3xl font-black text-primary font-mono">×2.4</p>
          <p className="text-xs text-muted-foreground mt-0.5">Аэропорт Сочи • 47 заказов</p>
        </div>
        <button className="bg-primary text-primary-foreground font-bold rounded-xl px-5 py-3 text-sm active:scale-95 transition-transform">
          Еду туда
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["all", "airport", "high", "mid", "low"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold border transition-all ${
              filter === f
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-muted-foreground border-border"
            }`}
          >
            {f === "all" ? "Все зоны" : demandLabel[f as DemandLevel]}
          </button>
        ))}
        <div className="w-px bg-border shrink-0 mx-1" />
        {(["profit", "coef", "wait"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold border transition-all ${
              sortBy === s
                ? "bg-secondary text-foreground border-primary/50"
                : "bg-secondary text-muted-foreground border-border"
            }`}
          >
            {s === "profit" ? "По прибыли" : s === "coef" ? "По коэф." : "По ожид."}
          </button>
        ))}
      </div>

      {/* Zone cards */}
      <div className="flex flex-col gap-3">
        {sorted.map((zone, i) => (
          <div
            key={zone.id}
            className={`animate-fade-in rounded-2xl border p-4 ${demandClass[zone.demand]}`}
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${demandDot[zone.demand]}`} />
                <span className="font-bold text-sm text-foreground">{zone.name}</span>
              </div>
              <span className="text-2xl font-black font-mono text-foreground">×{zone.coef}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Ожидание" value={`${zone.waitMin} мин`} icon="Clock" />
              <Stat label="Заказы" value={String(zone.orders)} icon="ShoppingBag" />
              <Stat label="~Выручка" value={`${zone.profit} ₽`} icon="Banknote" highlight />
            </div>
            {zone.distKm > 0 && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Icon name="Navigation" size={11} fallback="Circle" />
                {zone.distKm} км от аэропорта
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── NOTIFICATIONS TAB ───────────────────────────────────────────────────────
function NotificationsTab() {
  const [notifications, setNotifications] = useState(NOTIFICATIONS_INIT);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAll = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  return (
    <div className="flex flex-col gap-4 p-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground">Входящие</span>
          {unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full px-2 py-0.5">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAll} className="text-xs text-primary font-semibold">
            Прочитать все
          </button>
        )}
      </div>

      {/* Quick toggles */}
      <div className="bg-secondary rounded-2xl p-4 flex gap-3">
        {[
          { label: "Спрос", icon: "Zap", active: true },
          { label: "Рейсы", icon: "Plane", active: true },
          { label: "Акции", icon: "Gift", active: false },
        ].map((item) => (
          <button
            key={item.label}
            className={`flex-1 flex flex-col items-center gap-1.5 rounded-xl py-3 border text-xs font-semibold transition-all ${
              item.active
                ? "bg-primary/10 border-primary/40 text-primary"
                : "bg-background/30 border-border text-muted-foreground"
            }`}
          >
            <Icon name={item.icon} size={18} fallback="Circle" />
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {notifications.map((n, i) => (
          <div
            key={n.id}
            onClick={() => setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x))}
            className={`animate-fade-in rounded-2xl border p-4 cursor-pointer active:scale-[0.99] transition-transform ${
              n.read ? "bg-card border-border opacity-60" : "bg-secondary border-primary/20"
            }`}
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl bg-background flex items-center justify-center shrink-0 ${notifColor[n.type]}`}>
                <Icon name={notifIcon[n.type]} size={18} fallback="Circle" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className="font-semibold text-sm text-foreground truncate">{n.title}</p>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground leading-snug">{n.body}</p>
                <p className="text-[10px] text-muted-foreground mt-1.5">{n.time}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FLIGHTS TAB ─────────────────────────────────────────────────────────────
function FlightsTab() {
  const [view, setView] = useState<"arrivals" | "departures">("arrivals");
  const arrivals = FLIGHTS.filter((f) => f.status !== "departing");
  const departures = FLIGHTS.filter((f) => f.status === "departing" || f.status === "delayed");
  const list = view === "arrivals" ? arrivals : departures;
  const nextFlight = arrivals.find((f) => f.status === "arriving");

  return (
    <div className="flex flex-col gap-4 p-4 animate-fade-in">
      {nextFlight && (
        <div className="rounded-2xl bg-blue-500/10 border border-blue-500/30 p-4">
          <p className="text-xs text-blue-400 font-semibold mb-1 flex items-center gap-1">
            <Icon name="Clock" size={12} fallback="Circle" />
            Ближайший прилёт
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-black text-xl text-foreground">{nextFlight.number}</p>
              <p className="text-sm text-muted-foreground">{nextFlight.origin}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-2xl font-bold text-blue-400">{nextFlight.time}</p>
              <p className="text-xs text-muted-foreground">{nextFlight.passengers} пасс. • Терм. {nextFlight.terminal}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex bg-secondary rounded-2xl p-1 gap-1">
        {(["arrivals", "departures"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <Icon name={v === "arrivals" ? "PlaneLanding" : "PlaneTakeoff"} size={16} fallback="Plane" />
            {v === "arrivals" ? "Прилёты" : "Вылеты"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {list.map((flight, i) => (
          <div
            key={flight.id}
            className="animate-fade-in bg-card border border-border rounded-2xl p-4"
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-bold text-foreground">{flight.number}</p>
                <p className="text-xs text-muted-foreground">{flight.origin}</p>
              </div>
              <div className="text-right">
                <p className={`text-xs font-semibold ${flightStatusColor[flight.status]}`}>
                  {flightStatusLabel[flight.status]}
                </p>
                <p className="font-mono font-bold text-foreground">{flight.time}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Icon name="Users" size={11} fallback="Circle" />
                {flight.passengers} пасс.
              </span>
              <span className="flex items-center gap-1">
                <Icon name="Building2" size={11} fallback="Circle" />
                Терминал {flight.terminal}
              </span>
              {flight.status === "arriving" && (
                <span className="ml-auto text-blue-400 font-semibold">~10 мин</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── STATS TAB ───────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, small, accent }: {
  label: string; value: string; icon: string; small?: boolean; accent?: boolean
}) {
  return (
    <div className={`bg-secondary border border-border rounded-2xl p-4 ${accent ? "border-primary/30 bg-primary/5" : ""}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon name={icon} size={13} className={accent ? "text-primary" : "text-muted-foreground"} fallback="Circle" />
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <p className={`font-bold font-mono ${small ? "text-sm" : "text-xl"} ${accent ? "text-primary" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

function StatsTab() {
  const [period, setPeriod] = useState<"today" | "week" | "month">("today");

  const data = {
    today: { earned: 4820, trips: 11, hours: 6.5, avg: 438, topZone: "Аэропорт Сочи" },
    week: { earned: 31500, trips: 74, hours: 42, avg: 426, topZone: "Аэропорт Сочи" },
    month: { earned: 128000, trips: 298, hours: 168, avg: 430, topZone: "Центр / Навагинская" },
  };

  const d = data[period];

  const zoneRating = [
    { name: "Аэропорт Сочи", profit: 28400, pct: 100 },
    { name: "Центр / Навагинская", profit: 21200, pct: 74 },
    { name: "Адлер — набережная", profit: 16800, pct: 59 },
    { name: "Роза Хутор", profit: 9800, pct: 34 },
    { name: "Хоста / Кудепста", profit: 5200, pct: 18 },
  ];

  return (
    <div className="flex flex-col gap-4 p-4 animate-fade-in">
      <div className="flex bg-secondary rounded-2xl p-1 gap-1">
        {(["today", "week", "month"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {p === "today" ? "Сегодня" : p === "week" ? "Неделя" : "Месяц"}
          </button>
        ))}
      </div>

      <div className="bg-primary/10 border border-primary/30 rounded-2xl p-5 text-center glow-orange">
        <p className="text-xs text-muted-foreground mb-1">Заработано</p>
        <p className="text-4xl font-black text-primary font-mono">{d.earned.toLocaleString("ru")} ₽</p>
        <p className="text-sm text-muted-foreground mt-1">{d.trips} поездок • {d.hours} часов</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Средний чек" value={`${d.avg} ₽`} icon="Receipt" />
        <KpiCard label="Лучшая зона" value={d.topZone} icon="MapPin" small />
        <KpiCard label="Поездок в час" value={(d.trips / d.hours).toFixed(1)} icon="TrendingUp" />
        <KpiCard label="Прогноз (день)" value="5 200 ₽" icon="BarChart2" accent />
      </div>

      <div className="bg-card border border-border rounded-2xl p-4">
        <p className="font-bold text-sm text-foreground mb-3 flex items-center gap-2">
          <Icon name="Trophy" size={15} className="text-primary" fallback="Star" />
          Рейтинг зон по прибыли
        </p>
        <div className="flex flex-col gap-3">
          {zoneRating.map((z, i) => (
            <div key={z.name} className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground flex items-center gap-1.5">
                  <span className="font-mono text-muted-foreground w-4">{i + 1}.</span>
                  {z.name}
                </span>
                <span className="text-xs font-bold font-mono text-primary">{z.profit.toLocaleString("ru")} ₽</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${z.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4">
        <p className="font-bold text-sm text-foreground mb-3 flex items-center gap-2">
          <Icon name="Activity" size={15} className="text-blue-400" fallback="BarChart2" />
          Прогноз спроса на вечер
        </p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { h: "18:00", level: 65 },
            { h: "19:00", level: 82 },
            { h: "20:00", level: 95 },
            { h: "21:00", level: 88 },
          ].map((item) => (
            <div key={item.h} className="flex flex-col items-center gap-2">
              <div className="w-full h-20 bg-secondary rounded-xl overflow-hidden flex items-end">
                <div className="w-full bg-primary/60 rounded-b-xl" style={{ height: `${item.level}%` }} />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">{item.h}</span>
              <span className="text-xs font-bold text-primary">{item.level}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PROFILE TAB ─────────────────────────────────────────────────────────────
function ProfileTab() {
  const [notifSettings, setNotifSettings] = useState({
    highDemand: true,
    flights: true,
    promo: false,
    forecast: true,
  });

  const toggle = (key: keyof typeof notifSettings) =>
    setNotifSettings((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="flex flex-col gap-4 p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 border-2 border-primary/40 flex items-center justify-center">
            <Icon name="User" size={32} className="text-primary" />
          </div>
          <div>
            <p className="font-black text-lg text-foreground">Алексей Петров</p>
            <p className="text-sm text-muted-foreground">Водитель • Сочи</p>
            <div className="flex items-center gap-1 mt-1">
              {[1,2,3,4,5].map((s) => (
                <Icon key={s} name="Star" size={12} className={s <= 4 ? "text-yellow-400" : "text-muted-foreground"} />
              ))}
              <span className="text-xs text-muted-foreground ml-1">4.9</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-border pt-4">
          <div className="text-center">
            <p className="font-black text-xl text-primary font-mono">298</p>
            <p className="text-[10px] text-muted-foreground">Поездок</p>
          </div>
          <div className="text-center border-x border-border">
            <p className="font-black text-xl text-foreground font-mono">1.8</p>
            <p className="text-[10px] text-muted-foreground">Лет в сервисе</p>
          </div>
          <div className="text-center">
            <p className="font-black text-xl text-green-400 font-mono">98%</p>
            <p className="text-[10px] text-muted-foreground">Принятых</p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4">
        <p className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
          <Icon name="Car" size={15} className="text-primary" />
          Автомобиль
        </p>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-foreground">Kia Rio</p>
            <p className="text-xs text-muted-foreground">А 345 КВ 123 • Серебристый</p>
          </div>
          <button className="text-xs text-primary border border-primary/30 rounded-xl px-3 py-2 font-semibold">
            Изменить
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4">
        <p className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
          <Icon name="Bell" size={15} className="text-primary" />
          Настройка уведомлений
        </p>
        <div className="flex flex-col gap-3">
          {[
            { key: "highDemand" as const, label: "Высокий спрос", desc: "Когда коэф. > 1.5×", icon: "Zap" },
            { key: "flights" as const, label: "Рейсы", desc: "Прилёты из крупных городов", icon: "Plane" },
            { key: "forecast" as const, label: "Прогноз", desc: "Ежечасный прогноз спроса", icon: "BarChart2" },
            { key: "promo" as const, label: "Акции и бонусы", desc: "Промо-предложения", icon: "Gift" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center">
                  <Icon name={item.icon} size={15} className="text-muted-foreground" fallback="Circle" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                </div>
              </div>
              <button
                onClick={() => toggle(item.key)}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0 ${
                  notifSettings[item.key] ? "bg-primary" : "bg-secondary border border-border"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                    notifSettings[item.key] ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button className="bg-secondary border border-border rounded-2xl p-4 flex items-center justify-between w-full active:scale-[0.99] transition-transform">
        <div className="flex items-center gap-3">
          <Icon name="Headphones" size={18} className="text-muted-foreground" />
          <span className="font-semibold text-sm text-foreground">Поддержка</span>
        </div>
        <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
      </button>

      <button className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 flex items-center justify-center gap-2 text-destructive font-semibold text-sm active:scale-[0.99] transition-transform">
        <Icon name="LogOut" size={16} />
        Выйти из аккаунта
      </button>
    </div>
  );
}

// ─── NAV BAR ─────────────────────────────────────────────────────────────────
const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: "map", label: "Карта", icon: "MapPin" },
  { id: "notifications", label: "Центр", icon: "Bell" },
  { id: "flights", label: "Рейсы", icon: "Plane" },
  { id: "stats", label: "Доходы", icon: "BarChart2" },
  { id: "profile", label: "Профиль", icon: "User" },
];

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState<Tab>("map");
  const unread = NOTIFICATIONS_INIT.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative">
      {/* Header */}
      <header className="glass sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Icon name="Car" size={16} className="text-primary-foreground" />
          </div>
          <span className="font-bold text-base text-foreground">ДрайвПро</span>
        </div>
        <span className="text-sm font-semibold text-muted-foreground">
          {NAV.find((n) => n.id === tab)?.label}
        </span>
        <div className="flex items-center gap-1 text-xs font-mono text-green-400">
          <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Онлайн
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        {tab === "map" && <MapTab />}
        {tab === "notifications" && <NotificationsTab />}
        {tab === "flights" && <FlightsTab />}
        {tab === "stats" && <StatsTab />}
        {tab === "profile" && <ProfileTab />}
      </main>

      {/* Bottom nav */}
      <nav className="glass fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md border-t border-border px-2 py-2 z-20">
        <div className="flex items-center justify-around">
          {NAV.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all active:scale-95 ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {item.id === "notifications" && unread > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
                )}
                <Icon name={item.icon} size={22} fallback="Circle" />
                <span className={`text-[10px] font-semibold ${active ? "text-primary" : ""}`}>{item.label}</span>
                {active && <span className="absolute bottom-0 w-1 h-1 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}