// Everything the app remembers — on this phone only: the bag, the orders you
// placed, the name and photo you chose, and how the room sees you.
// No account, no points, no customer record anywhere but here. Profile has one
// button that clears all of it.

import { STORAGE, ORDER } from "./config.js";
import { byId, OPTION_GROUPS } from "./data.js";
import { uid } from "./util.js";

const K = { bag: STORAGE + "bag", orders: STORAGE + "orders", profile: STORAGE + "profile", seq: STORAGE + "seq" };

const read = (k, fallback) => {
  try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
};
const write = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
  emit();
};

const subs = new Set();
export const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
function emit() { subs.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } }); }
addEventListener("storage", (e) => { if (!e.key || e.key.startsWith(STORAGE)) emit(); });

/* --------------------------------------------------------- options, prices */
export function defaults(item) {
  const o = {};
  for (const g of item?.options || []) o[g] = OPTION_GROUPS[g].choices[0].id;
  return o;
}

export function unitPrice(item, opts = {}) {
  let p = item.price;
  for (const g of item.options || []) {
    const c = OPTION_GROUPS[g].choices.find((x) => x.id === opts[g]);
    if (c?.add) p += c.add;
  }
  return p;
}

/** Only the choices that differ from how the drink comes: "Large · Oat". */
export function optsLabel(item, opts = {}) {
  return (item?.options || []).map((g) => {
    const grp = OPTION_GROUPS[g];
    const c = grp.choices.find((x) => x.id === opts[g]);
    return c && c.id !== grp.choices[0].id ? c.label : null;
  }).filter(Boolean).join(" · ");
}

const keyOf = (id, opts) => id + "|" + Object.keys(opts).sort().map((k) => `${k}=${opts[k]}`).join("&");

/* -------------------------------------------------------------------- bag */
export const bag = () => read(K.bag, []).filter((l) => byId(l.id) && l.qty > 0);
export const bagCount = () => bag().reduce((n, l) => n + l.qty, 0);
export const lineUnit = (l) => unitPrice(byId(l.id), l.opts);
export const lineTotal = (l) => lineUnit(l) * l.qty;
export const bagTotal = () => bag().reduce((s, l) => s + lineTotal(l), 0);
export const qtyOf = (id) => bag().filter((l) => l.id === id).reduce((n, l) => n + l.qty, 0);

export function addLine(id, qty = 1, opts = null) {
  const item = byId(id);
  if (!item) return null;
  const o = { ...defaults(item), ...(opts || {}) };
  const key = keyOf(id, o);
  const lines = bag();
  const hit = lines.find((l) => l.key === key);
  if (hit) hit.qty = Math.min(20, hit.qty + qty);
  else lines.push({ key, id, qty: Math.min(20, qty), opts: o });
  write(K.bag, lines);
  return key;
}

export function setQty(key, qty) {
  let lines = bag();
  const l = lines.find((x) => x.key === key);
  if (!l) return;
  if (qty <= 0) lines = lines.filter((x) => x.key !== key);
  else l.qty = Math.min(20, qty);
  write(K.bag, lines);
}

/** Change a line's choices. If that makes it identical to another line, they merge. */
export function setOpts(key, opts) {
  const lines = bag();
  const l = lines.find((x) => x.key === key);
  if (!l) return key;
  const next = keyOf(l.id, opts);
  const twin = lines.find((x) => x.key === next && x !== l);
  if (twin) { twin.qty = Math.min(20, twin.qty + l.qty); lines.splice(lines.indexOf(l), 1); }
  else { l.opts = { ...opts }; l.key = next; }
  write(K.bag, lines);
  return next;
}

export function removeLine(key) {
  const lines = bag();
  const i = lines.findIndex((x) => x.key === key);
  if (i < 0) return null;
  const [gone] = lines.splice(i, 1);
  write(K.bag, lines);
  return { line: gone, index: i };
}
export function restoreLine({ line, index }) {
  const lines = bag();
  lines.splice(Math.min(index, lines.length), 0, line);
  write(K.bag, lines);
}
export const clearBag = () => write(K.bag, []);

/* ----------------------------------------------------------------- orders */
export const orders = () => read(K.orders, []);
export const orderById = (id) => orders().find((o) => o.id === id) || null;

export function placeOrder({ mode = "table", table = "", note = "", name = "" } = {}) {
  const lines = bag();
  if (!lines.length) return null;
  // a counter number, like the one on the pass: it starts somewhere ordinary and counts up
  let seq = read(K.seq, 0);
  seq = seq ? seq + 1 : 100 + Math.floor(Math.random() * 180);
  if (seq > 999) seq = 101;
  const now = Date.now();
  const o = {
    id: uid(), code: String(seq), at: now, ready: now + ORDER.prepMinutes * 60000,
    mode, table: mode === "table" ? String(table || "").trim() : "", note: note.trim(), name: name.trim(),
    lines: lines.map((l) => {
      const it = byId(l.id);
      return { id: l.id, name: it.name, qty: l.qty, opts: l.opts, label: optsLabel(it, l.opts), unit: unitPrice(it, l.opts) };
    }),
    total: bagTotal(),
  };
  try { localStorage.setItem(K.seq, JSON.stringify(seq)); } catch {}
  try { localStorage.setItem(K.orders, JSON.stringify([o, ...orders()].slice(0, 30))); } catch {}
  write(K.bag, []);
  return o;
}

/** Put a past order back in the bag. Returns how many things went in. */
export function reorder(id) {
  const o = orderById(id);
  if (!o) return 0;
  let n = 0;
  for (const l of o.lines) if (byId(l.id)) { addLine(l.id, l.qty, l.opts); n += l.qty; }
  return n;
}

/* ---------------------------------------------------------------- profile */
const PROFILE = { name: "", photo: "", visibility: "name" };
export const profile = () => ({ ...PROFILE, ...read(K.profile, {}) });
export const setProfile = (patch) => write(K.profile, { ...profile(), ...patch });

/** Everything this app ever wrote on this phone, gone. */
export function clearAll() {
  try { Object.keys(localStorage).filter((k) => k.startsWith(STORAGE)).forEach((k) => localStorage.removeItem(k)); } catch {}
  emit();
}
