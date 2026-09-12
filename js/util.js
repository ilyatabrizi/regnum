// Small shared helpers. No framework, no dependencies.

import { BUSINESS } from "./config.js";

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Escape anything a person typed before it goes near innerHTML. */
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g,
  (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const pad2 = (n) => String(n).padStart(2, "0");
export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
export const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;

/** 290000 → "290,000". Grouped, Latin digits, never rounded away. */
export const money = (n) => Math.round(Number(n) || 0).toLocaleString("en-US");
export const priceText = (n) => `${money(n)} ${BUSINESS.currency}`;
/** The figure, with the unit set small beside it. */
export const priceHTML = (n) => `<span class="money">${money(n)}</span><small class="cur">${BUSINESS.currency}</small>`;

/** "Sara Karimi" → "SK"; a single name → its first letter. */
export function initials(name) {
  const p = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "";
  return (p[0][0] + (p[1] ? p[1][0] : "")).toUpperCase();
}

/** "Sara Karimi" → "Sara K." — the room never shows a surname. */
export function shortName(name) {
  const p = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "";
  return p[1] ? `${p[0]} ${p[1][0].toUpperCase()}.` : p[0];
}

export const firstName = (name) => String(name || "").trim().split(/\s+/)[0] || "";

/* ------------------------------------------------------------------ clock */
export const hm = (t = Date.now()) => { const d = new Date(t); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const dateShort = (t) => { const d = new Date(t); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };

/** "just now", "12 min", "1 h 5 min" — how long someone has been here. */
export function since(t, now = Date.now()) {
  const m = Math.max(0, Math.floor((now - t) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}
export const minsLeft = (until, now = Date.now()) => Math.max(0, Math.ceil((until - now) / 60000));

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  return "Good evening";
}

/* ---------------------------------------------------------------- seeding */
/** Deterministic 32-bit FNV-1a, for seeded demo content. */
export function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
/** Tiny seeded PRNG (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** A stable colour, 0–7, for a name: the same person keeps the same colour. */
export const hueOf = (s) => hash32(String(s || "?").trim().toLowerCase()) % 8;
