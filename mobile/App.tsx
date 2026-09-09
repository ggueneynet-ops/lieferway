import * as React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { api, setToken, type Restaurant, type SessionUser } from "./src/api";

type Screen =
  | "login"
  | "home"
  | "menu"
  | "cart"
  | "checkout"
  | "orders"
  | "track";

type CartLine = {
  menuItemId: string;
  name: string;
  priceCents: number;
  quantity: number;
};

const PINK = "#E91E63";
const BG = "#FFFFFF";

function eur(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export default function App() {
  const [screen, setScreen] = React.useState<Screen>("login");
  const [email, setEmail] = React.useState("kunde@lieferway.de");
  const [password, setPassword] = React.useState("lieferway");
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [restaurants, setRestaurants] = React.useState<Restaurant[]>([]);
  const [active, setActive] = React.useState<Restaurant | null>(null);
  const [cart, setCart] = React.useState<{ restaurant: Restaurant; items: CartLine[] } | null>(null);
  const [method, setMethod] = React.useState<"CARD" | "APPLE_PAY" | "GOOGLE_PAY" | "CASH">("CARD");
  const [street, setStreet] = React.useState("Berger Straße 142");
  const [orderId, setOrderId] = React.useState<string | null>(null);
  const [order, setOrder] = React.useState<Record<string, unknown> | null>(null);
  const [orders, setOrders] = React.useState<Array<{ id: string; shortCode: string; status: string; totalCents: number; restaurant: { name: string } }>>([]);

  const food = cart?.items.reduce((s, i) => s + i.priceCents * i.quantity, 0) ?? 0;
  const total = cart ? food + cart.restaurant.deliveryFeeCents : 0;

  async function login() {
    setBusy(true);
    setError("");
    try {
      const data = await api<{ user: SessionUser; token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(data.token);
      setUser(data.user);
      const list = await api<{ restaurants: Restaurant[] }>("/api/restaurants");
      setRestaurants(list.restaurants);
      setScreen("home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function openRestaurant(slug: string) {
    setBusy(true);
    try {
      const data = await api<{ restaurant: Restaurant }>(`/api/restaurants/${slug}`);
      setActive(data.restaurant);
      setScreen("menu");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  function addItem(item: { id: string; name: string; priceCents: number }) {
    if (!active) return;
    setCart((prev) => {
      const base =
        prev && prev.restaurant.id === active.id
          ? prev
          : { restaurant: active, items: [] as CartLine[] };
      const existing = base.items.find((i) => i.menuItemId === item.id);
      const items = existing
        ? base.items.map((i) =>
            i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i,
          )
        : [...base.items, { menuItemId: item.id, name: item.name, priceCents: item.priceCents, quantity: 1 }];
      return { restaurant: active, items };
    });
  }

  async function checkout() {
    if (!cart) return;
    setBusy(true);
    setError("");
    try {
      const pay = await api<{ intent: { id: string } }>("/api/payments/intent", {
        method: "POST",
        body: JSON.stringify({ amountCents: total, method, confirm: true }),
      });
      const data = await api<{ order: { id: string } }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          restaurantId: cart.restaurant.id,
          items: cart.items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
          paymentMethod: method,
          paymentIntentId: pay.intent.id,
          street,
          city: "Frankfurt am Main",
          postalCode: "60316",
        }),
      });
      setCart(null);
      setOrderId(data.order.id);
      const detail = await api<{ order: Record<string, unknown> }>(`/api/orders/${data.order.id}`);
      setOrder(detail.order);
      setScreen("track");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function loadOrders() {
    const data = await api<{ orders: typeof orders }>("/api/orders");
    setOrders(data.orders);
    setScreen("orders");
  }

  React.useEffect(() => {
    if (screen !== "track" || !orderId) return;
    const t = setInterval(async () => {
      const detail = await api<{ order: Record<string, unknown> }>(`/api/orders/${orderId}`);
      setOrder(detail.order);
    }, 4000);
    return () => clearInterval(t);
  }, [screen, orderId]);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.top}>
        <Text style={styles.brand}>Lieferway</Text>
        <Text style={styles.city}>Frankfurt am Main</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {busy && screen !== "login" ? <ActivityIndicator color={PINK} style={{ marginTop: 8 }} /> : null}

      {screen === "login" && (
        <View style={styles.pad}>
          <Text style={styles.h1}>Anmelden</Text>
          <Text style={styles.muted}>Demo: kunde@lieferway.de / lieferway</Text>
          <TextInput style={styles.input} autoCapitalize="none" value={email} onChangeText={setEmail} />
          <TextInput style={styles.input} secureTextEntry value={password} onChangeText={setPassword} />
          <Pressable style={styles.btn} onPress={login} disabled={busy}>
            <Text style={styles.btnText}>{busy ? "…" : "Weiter"}</Text>
          </Pressable>
        </View>
      )}

      {screen === "home" && (
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={styles.h1}>Hallo{user ? `, ${user.name.split(" ")[0]}` : ""}</Text>
          <Text style={styles.muted}>Was möchtest du essen?</Text>
          <Pressable style={styles.link} onPress={loadOrders}>
            <Text style={styles.linkText}>Meine Bestellungen</Text>
          </Pressable>
          {restaurants.map((r) => (
            <Pressable key={r.id} style={styles.card} onPress={() => openRestaurant(r.slug)}>
              <Text style={styles.cardTitle}>{r.name}</Text>
              <Text style={styles.muted}>
                {r.cuisine} · {r.rating.toFixed(1)} · {r.etaMin}–{r.etaMax} Min. · {eur(r.deliveryFeeCents)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {screen === "menu" && active && (
        <ScrollView contentContainerStyle={styles.pad}>
          <Pressable onPress={() => setScreen("home")}>
            <Text style={styles.linkText}>← Restaurants</Text>
          </Pressable>
          <Text style={styles.h1}>{active.name}</Text>
          <Text style={styles.muted}>{active.description}</Text>
          {active.categories?.map((c) => (
            <View key={c.id} style={{ marginTop: 16 }}>
              <Text style={styles.h2}>{c.name}</Text>
              {c.items.map((item) => (
                <Pressable key={item.id} style={styles.row} onPress={() => addItem(item)} disabled={!item.isAvailable}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.muted}>{item.description}</Text>
                  </View>
                  <Text style={styles.price}>{eur(item.priceCents)}</Text>
                </Pressable>
              ))}
            </View>
          ))}
          {cart && cart.items.length > 0 && (
            <Pressable style={styles.btn} onPress={() => setScreen("cart")}>
              <Text style={styles.btnText}>
                Warenkorb · {cart.items.reduce((s, i) => s + i.quantity, 0)} · {eur(food)}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      )}

      {screen === "cart" && cart && (
        <ScrollView contentContainerStyle={styles.pad}>
          <Pressable onPress={() => setScreen("menu")}>
            <Text style={styles.linkText}>← Menü</Text>
          </Pressable>
          <Text style={styles.h1}>Warenkorb</Text>
          {cart.items.map((i) => (
            <View key={i.menuItemId} style={styles.row}>
              <Text>
                {i.quantity}× {i.name}
              </Text>
              <Text>{eur(i.priceCents * i.quantity)}</Text>
            </View>
          ))}
          <Text style={{ marginTop: 12 }}>Lieferung {eur(cart.restaurant.deliveryFeeCents)}</Text>
          <Text style={styles.h2}>Gesamt {eur(total)}</Text>
          <Pressable style={styles.btn} onPress={() => setScreen("checkout")}>
            <Text style={styles.btnText}>Zur Kasse</Text>
          </Pressable>
        </ScrollView>
      )}

      {screen === "checkout" && (
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={styles.h1}>Kasse</Text>
          <TextInput style={styles.input} value={street} onChangeText={setStreet} />
          {(["CARD", "APPLE_PAY", "GOOGLE_PAY", "CASH"] as const).map((m) => (
            <Pressable
              key={m}
              style={[styles.pay, method === m && styles.payOn]}
              onPress={() => setMethod(m)}
            >
              <Text>{m === "CASH" ? "Bar bei Lieferung" : m.replace("_", " ")}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.btn} onPress={checkout} disabled={busy}>
            <Text style={styles.btnText}>{busy ? "Zahlung…" : `Jetzt bezahlen · ${eur(total)}`}</Text>
          </Pressable>
        </ScrollView>
      )}

      {screen === "orders" && (
        <ScrollView contentContainerStyle={styles.pad}>
          <Pressable onPress={() => setScreen("home")}>
            <Text style={styles.linkText}>← Home</Text>
          </Pressable>
          <Text style={styles.h1}>Bestellungen</Text>
          {orders.map((o) => (
            <Pressable
              key={o.id}
              style={styles.card}
              onPress={async () => {
                setOrderId(o.id);
                const detail = await api<{ order: Record<string, unknown> }>(`/api/orders/${o.id}`);
                setOrder(detail.order);
                setScreen("track");
              }}
            >
              <Text style={styles.cardTitle}>{o.restaurant.name}</Text>
              <Text style={styles.muted}>
                {o.shortCode} · {o.status} · {eur(o.totalCents)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {screen === "track" && order && (
        <ScrollView contentContainerStyle={styles.pad}>
          <Pressable onPress={() => setScreen("home")}>
            <Text style={styles.linkText}>← Home</Text>
          </Pressable>
          <Text style={styles.h1}>{String((order.restaurant as { name?: string })?.name ?? "Bestellung")}</Text>
          <Text style={styles.h2}>{String(order.status)}</Text>
          <Text style={styles.muted}>{String(order.shortCode)}</Text>
          <Text style={{ marginTop: 12 }}>Gesamt {eur(Number(order.totalCents ?? 0))}</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG, paddingTop: 54 },
  top: { paddingHorizontal: 20, marginBottom: 8 },
  brand: { fontSize: 22, fontWeight: "700", color: PINK },
  city: { color: "#64748B", fontSize: 13 },
  pad: { paddingHorizontal: 20, paddingBottom: 40 },
  h1: { fontSize: 26, fontWeight: "700", marginBottom: 6, color: "#0F172A" },
  h2: { fontSize: 18, fontWeight: "600", marginTop: 8, color: "#0F172A" },
  muted: { color: "#64748B", marginBottom: 10, fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  btn: { backgroundColor: PINK, borderRadius: 14, padding: 14, marginTop: 16, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
  error: { color: "#DC2626", paddingHorizontal: 20, marginBottom: 6 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#0F172A" },
  row: { flexDirection: "row", gap: 8, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#E5E7EB" },
  price: { fontWeight: "600" },
  link: { marginBottom: 14 },
  linkText: { color: PINK, fontWeight: "600" },
  pay: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#fff", marginBottom: 8 },
  payOn: { borderColor: PINK, backgroundColor: "#FCE4EC" },
});
