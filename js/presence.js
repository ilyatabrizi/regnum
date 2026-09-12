// Who is at REGNUM right now.
//
// Checking in is one tap and asks for nothing. It holds for an hour and then lets
// go by itself, so the room never shows someone who left at lunch. Where you sit
// is optional, and how you appear (name, initials, or no one) is set in Profile.
//
// By default the room is this phone plus a demo roster. The roster is a whole
// day of visits drawn from the date — people arrive, stay forty minutes to two
// hours, and leave — so the list changes the way a room does, and two phones
// looking at the preview at the same minute see the same faces.
// Set CHECKIN.endpoint in config.js and the same calls go to a shared room
// instead; no view changes. The contract is in the README.

import { CHECKIN, STORAGE } from "./config.js";
import { profile } from "./store.js";
import { uid, rng, hash32, hueOf, shortName, initials } from "./util.js";

const KEY = STORAGE + "room";      // this phone's own check-in: { id, at, until, zone }
const ME = STORAGE + "me";
const HOLD = CHECKIN.holdMinutes * 60000;
const API = CHECKIN.endpoint.replace(/\/$/, "");

const subs = new Set();
export const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
const emit = () => subs.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });

const channel = "BroadcastChannel" in self ? new BroadcastChannel("regnum-room") : null;
if (channel) channel.onmessage = () => emit();
addEventListener("storage", (e) => { if (e.key === KEY || e.key === STORAGE + "profile") emit(); });

export function myId() {
  let id = null;
  try { id = localStorage.getItem(ME); } catch {}
  if (!id) { id = uid(); try { localStorage.setItem(ME, id); } catch {} }
  return id;
}

const readMine = () => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; } };
function writeMine(v) {
  try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch {}
  channel?.postMessage("x");
  emit();
}

/** How the room sees me, from Profile — recomputed every time, so a rename shows at once. */
export function myFace() {
  const p = profile();
  const name = (p.name || "").trim();
  if (p.visibility === "hidden") return { label: "Someone", ini: "", hue: 8, photo: "", hidden: true };
  if (!name) return { label: "Guest", ini: "", hue: 8, photo: p.photo || "" };
  if (p.visibility === "initials") return { label: initials(name).split("").join(". ") + ".", ini: initials(name), hue: hueOf(name), photo: "" };
  return { label: shortName(name), ini: initials(name), hue: hueOf(name), photo: p.photo || "" };
}

/* ------------------------------------------------------------ demo roster */
// Names you would hear in a Tabriz café, and a surname initial — never a surname.
const NAMES = ["Aylin", "Sahand", "Elnaz", "Yashar", "Sevda", "Arash", "Nazanin", "Aydin", "Leyla", "Ramin",
  "Ulduz", "Babak", "Parisa", "Kian", "Tara", "Sina", "Mahsa", "Nima", "Roya", "Ilgar", "Darya", "Behnam",
  "Setareh", "Farid", "Ayda", "Hamed", "Sara", "Amir", "Negin", "Pouya", "Shirin", "Orkhan"];
const LAST = "ABDEFGHJKMNRSTVZ";
// How busy the room is by hour, 0–1. A place that serves breakfast AND dinner has
// two peaks, not one: it fills from nine, holds through lunch, dips mid-afternoon
// and fills again from eight. A few night owls keep the preview alive at any hour
// it is opened.
const CURVE = [.3, .2, .13, .09, .07, .07, .1, .22, .48, .72, .8, .76, .84, .88, .7, .52, .5, .58, .72, .9, 1, .98, .84, .56];
const PEAK = 0.95; // mean arrivals per five minutes at the busiest hour

const days = new Map();
function visitsOn(dayStart) {
  if (days.has(dayStart)) return days.get(dayStart);
  const r = rng(hash32("regnum|" + dayStart));
  const out = [];
  for (let m = 0; m < 24 * 60; m += 5) {
    const lambda = CURVE[Math.floor(m / 60)] * PEAK;
    let k = 0, p = Math.exp(-lambda), s = p;
    const u = r();
    while (u > s && k < 5) { k++; p *= lambda / k; s += p; }
    for (let i = 0; i < k; i++) {
      const at = dayStart + (m + r() * 5) * 60000;
      const first = NAMES[Math.floor(r() * NAMES.length)];
      const last = LAST[Math.floor(r() * LAST.length)];
      out.push({
        id: `d-${Math.round(at / 1000)}-${i}`, label: `${first} ${last}.`, ini: first[0] + last, hue: hueOf(first + last),
        zone: CHECKIN.zones[Math.floor(r() * CHECKIN.zones.length)], at, until: at + (35 + r() * 80) * 60000, demo: true,
      });
    }
  }
  days.set(dayStart, out);
  if (days.size > 3) days.delete(days.keys().next().value);
  return out;
}

function demo(now) {
  if (!CHECKIN.demo) return [];
  const d = new Date(now);
  const today = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const yesterday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1).getTime();
  const seen = new Set();
  return [...visitsOn(yesterday), ...visitsOn(today)]
    .filter((v) => v.at <= now && v.until > now)
    .filter((v) => (seen.has(v.label) ? false : seen.add(v.label)));
}

/* ----------------------------------------------------------------- remote */
let remote = [];
async function pull() {
  try {
    const r = await fetch(API + "/room", { cache: "no-store" });
    if (r.ok) { remote = await r.json(); emit(); }
  } catch {}
}
const push = (method, body) => API && fetch(API + "/room", {
  method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
}).catch(() => {});
if (API) { pull(); setInterval(pull, 20000); }

/* ------------------------------------------------------------------- room */
export function me(now = Date.now()) {
  const m = readMine();
  return m && m.until > now ? m : null;
}
export const isIn = () => !!me();

/** Everyone here now, newest arrival first — you at the top when you are in. */
export function room(now = Date.now()) {
  const mine = me(now);
  const others = (API ? remote.filter((p) => p.id !== myId() && p.until > now) : demo(now))
    .sort((a, b) => b.at - a.at);
  if (!mine) return others;
  const face = myFace();
  return [{ ...mine, ...face, me: true }, ...others];
}
export const count = (now = Date.now()) => room(now).length;

export function checkIn({ zone = "" } = {}) {
  const now = Date.now();
  const entry = { id: myId(), at: now, until: now + HOLD, zone };
  writeMine(entry);
  push("POST", { ...entry, ...myFace() });
  return entry;
}
export function setZone(zone) {
  const m = me();
  if (!m) return;
  writeMine({ ...m, zone });
  push("POST", { ...m, zone, ...myFace() });
}
export function extend() {
  const m = me();
  if (!m) return null;
  const next = { ...m, until: Date.now() + CHECKIN.extendMinutes * 60000 };
  writeMine(next);
  push("POST", { ...next, ...myFace() });
  return next;
}
export function checkOut() {
  writeMine(null);
  push("DELETE", { id: myId() });
}
/** Profile changed while checked in: tell the shared room. */
export function refreshFace() { const m = me(); if (m) push("POST", { ...m, ...myFace() }); emit(); }

// Let an hour run out on its own, and let the demo room change, without a reload.
setInterval(() => {
  const m = readMine();
  if (m && m.until <= Date.now()) writeMine(null);
  else emit();
}, 30000);
