// One line-icon family, drawn on a 24 grid at 1.8 stroke to sit beside the
// phone's own symbols. The five tab icons also come filled, as iOS draws the
// selected tab.

const S = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
const F = (d) => `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${d}</svg>`;
const ln = (d) => `<path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="${d}"/>`;

const CUP = "M5 8.5h11.5v4.2a5.75 5.75 0 0 1-5.75 5.75A5.75 5.75 0 0 1 5 12.7Z";
const CUP_HANDLE = "M16.5 10h1.1a2.6 2.6 0 0 1 0 5.2h-1.5";
const BAG = "M5.2 8.2h13.6l-.9 11.3a1.7 1.7 0 0 1-1.7 1.6H7.8a1.7 1.7 0 0 1-1.7-1.6Z";
const BAG_HANDLE = "M8.8 10.4V7a3.2 3.2 0 0 1 6.4 0v3.4";
const PIN = "M12 21.2s-6.8-5.9-6.8-11.4a6.8 6.8 0 0 1 13.6 0c0 5.5-6.8 11.4-6.8 11.4Z";

const ICONS = {
  /* tabs */
  home: S(`<path d="M3.8 10.4 12 3.9l8.2 6.5v8.8a1.6 1.6 0 0 1-1.6 1.6h-3.9v-5.3a1.2 1.2 0 0 0-1.2-1.2h-3a1.2 1.2 0 0 0-1.2 1.2v5.3H5.4a1.6 1.6 0 0 1-1.6-1.6Z"/>`),
  homeF: F(`<path d="M11.3 3.2a1.1 1.1 0 0 1 1.4 0l8.1 6.4c.3.2.4.5.4.9v8.7a2.3 2.3 0 0 1-2.3 2.3h-3.6a.8.8 0 0 1-.8-.8v-5a1.3 1.3 0 0 0-1.3-1.3h-2.4a1.3 1.3 0 0 0-1.3 1.3v5a.8.8 0 0 1-.8.8H5.1a2.3 2.3 0 0 1-2.3-2.3v-8.7c0-.4.1-.7.4-.9Z"/>`),
  menu: S(`<path d="${CUP}"/><path d="${CUP_HANDLE}"/><path d="M3.8 21h14.4M8.6 3.6c-.6.8-.6 1.6 0 2.4M12 3c-.6.9-.6 1.8 0 2.7"/>`),
  menuF: F(`<path d="${CUP}"/>${ln(CUP_HANDLE)}${ln("M3.8 21h14.4M8.6 3.6c-.6.8-.6 1.6 0 2.4M12 3c-.6.9-.6 1.8 0 2.7")}`),
  bag: S(`<path d="${BAG}"/><path d="${BAG_HANDLE}"/>`),
  bagF: F(`<path d="${BAG}"/>${ln(BAG_HANDLE)}`),
  profile: S(`<circle cx="12" cy="8" r="3.8"/><path d="M4.6 20.4c.9-3.8 3.8-6 7.4-6s6.5 2.2 7.4 6"/>`),
  profileF: F(`<circle cx="12" cy="7.9" r="4.3"/><path d="M3.9 20.2c.7-4.3 4-7 8.1-7s7.4 2.7 8.1 7a.9.9 0 0 1-.9 1.1H4.8a.9.9 0 0 1-.9-1.1Z"/>`),
  checkin: S(`<path d="${PIN}"/><circle cx="12" cy="9.8" r="2.4"/>`),
  checkinF: F(`<path fill-rule="evenodd" d="M12 2.2a7.6 7.6 0 0 1 7.6 7.6c0 6-7 12.1-7.1 12.2a.8.8 0 0 1-1 0C11.4 21.9 4.4 15.8 4.4 9.8A7.6 7.6 0 0 1 12 2.2Zm0 5a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2Z"/>`),

  /* actions */
  plus: S(`<path d="M12 5v14M5 12h14"/>`),
  minus: S(`<path d="M5 12h14"/>`),
  check: S(`<path d="M4.5 12.5 9.5 17.5 19.5 7"/>`),
  close: S(`<path d="M6 6l12 12M18 6 6 18"/>`),
  chevronL: S(`<path d="M15 5l-7 7 7 7"/>`),
  chevronR: S(`<path d="M9 5l7 7-7 7"/>`),
  chevronD: S(`<path d="M5 9l7 7 7-7"/>`),
  arrowR: S(`<path d="M5 12h14M13 6l6 6-6 6"/>`),
  search: S(`<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>`),
  trash: S(`<path d="M4.5 7h15M9.5 7V5.2c0-.7.5-1.2 1.2-1.2h2.6c.7 0 1.2.5 1.2 1.2V7M6.5 7l.8 12a1.8 1.8 0 0 0 1.8 1.7h5.8a1.8 1.8 0 0 0 1.8-1.7l.8-12"/>`),
  pencil: S(`<path d="M4.5 19.5l.9-3.9L15.8 5.2a1.9 1.9 0 0 1 2.7 0l.3.3a1.9 1.9 0 0 1 0 2.7L8.4 18.6ZM13.8 7.2l3 3"/>`),
  camera: S(`<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.4-2h5.6l1.4 2h2.3A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z"/><circle cx="12" cy="13" r="3.3"/>`),
  refresh: S(`<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4"/>`),
  logout: S(`<path d="M14.5 4.5h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3M10 16.5 5.5 12 10 7.5M5.5 12h10"/>`),
  timer: S(`<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.3 1.4M9.5 2.8h5"/>`),
  share: S(`<path d="M12 3.5v11M8 7.5l4-4 4 4M8.5 10.5H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1.5"/>`),
  plusSquare: S(`<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/>`),
  external: S(`<path d="M13.5 4.5h6v6M19.5 4.5 11 13M9 5.5H6.5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V15"/>`),
  play: F(`<path d="M8.5 5.6v12.8a.9.9 0 0 0 1.4.8l10-6.4a.9.9 0 0 0 0-1.6l-10-6.4a.9.9 0 0 0-1.4.8Z"/>`),

  /* things */
  pin: S(`<path d="${PIN}"/><circle cx="12" cy="9.8" r="2.4"/>`),
  clock: S(`<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>`),
  people: S(`<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.6-3.3 2.9-5 5.5-5s4.9 1.7 5.5 5M15.5 5.5a3.2 3.2 0 0 1 0 6.2M17.5 14.2c1.6.6 2.7 2.2 3 4.8"/>`),
  sun: S(`<circle cx="12" cy="12" r="4"/><path d="M12 2.8v2M12 19.2v2M4.4 4.4l1.4 1.4M18.2 18.2l1.4 1.4M2.8 12h2M19.2 12h2M4.4 19.6l1.4-1.4M18.2 5.8l1.4-1.4"/>`),
  moon: S(`<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>`),
  system: S(`<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor"/>`),
  eyeOff: S(`<path d="M3.5 3.5l17 17M10.6 5.6c.5-.1.9-.1 1.4-.1 5 0 8.5 4.5 9.5 6.5-.5 1-1.6 2.6-3.2 4M6.6 7.1C4.6 8.5 3.1 10.6 2.5 12c1 2 4.5 6.5 9.5 6.5 1.6 0 3-.4 4.2-1.1M9.9 9.9a3 3 0 0 0 4.2 4.2"/>`),
  info: S(`<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.2"/>`),
  table: S(`<path d="M3.5 9.5h17M6 9.5l-1.5 10M18 9.5l1.5 10M8.5 13.5h7"/>`),
  takeaway: S(`<path d="M6.5 7.5h11l-1.3 12a1.6 1.6 0 0 1-1.6 1.4H9.4a1.6 1.6 0 0 1-1.6-1.4ZM5.5 7.5h13M7.5 7.5l.7-2.5c.2-.6.7-1 1.3-1h5c.6 0 1.1.4 1.3 1l.7 2.5M7 12.5h10"/>`),
  sparkle: S(`<path d="M12 3.5c.5 4.2 2.3 6 6.5 6.5-4.2.5-6 2.3-6.5 6.5-.5-4.2-2.3-6-6.5-6.5 4.2-.5 6-2.3 6.5-6.5Z"/>`),

  /* menu glyphs, for the drinks we have no photograph of */
  cup: S(`<path d="${CUP}"/><path d="${CUP_HANDLE}"/><path d="M3.8 21h14.4M8.6 3.6c-.6.8-.6 1.6 0 2.4M12 3c-.6.9-.6 1.8 0 2.7"/>`),
  iced: S(`<path d="M6.5 5h11l-1.4 14.1a1.9 1.9 0 0 1-1.9 1.7H9.8a1.9 1.9 0 0 1-1.9-1.7ZM7 9.5h10M9.4 12.2l2.3-.7.7 2.3-2.3.7ZM13.2 14.6l2-1.1 1 2-2 1.1ZM14.2 5l1.6-2.6"/>`),
  tea: S(`<path d="M6.2 10.5h10.3v3.9a4.3 4.3 0 0 1-4.3 4.3h-1.7a4.3 4.3 0 0 1-4.3-4.3ZM16.5 11.6h.8a2.3 2.3 0 0 1 0 4.6h-1.1M6.2 12.4 3.5 10.6l.6 3.8 2.4 1.3M8.6 10.5c.2-1.7 1.4-2.8 2.9-2.8s2.7 1.1 2.9 2.8M11.5 7.7V6.3M5.5 21.2h12"/>`),
  pour: S(`<path d="M5 4.5h14l-4.6 7.8H9.6ZM10 12.3h4v2h-4ZM7.2 16.8h9.6v1.3a2.6 2.6 0 0 1-2.6 2.6H9.8a2.6 2.6 0 0 1-2.6-2.6Z"/>`),
  croissant: S(`<path d="M3.6 16.2c.6-4.8 3.9-8.7 8.4-8.7s7.8 3.9 8.4 8.7c-1.3.8-2.8.8-4.1-.1M3.6 16.2c1.3.8 2.8.8 4.1-.1M8.2 9.2l1.7 5.6M15.8 9.2l-1.7 5.6M12 7.5V15"/>`),
  cake: S(`<path d="M4 12h16v6.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5ZM4 12l12.4-6.4L20 12M4 15.5h16"/>`),

  /* the kitchen half of the card — REGNUM is a restaurant as much as a café */
  plate: S(`<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="5.1"/>`),
  egg: S(`<path d="M12 3.6c3.5 0 6.4 3.7 6.4 8.2s-2.9 8.2-6.4 8.2-6.4-3.7-6.4-8.2S8.5 3.6 12 3.6Z"/><circle cx="12" cy="12.2" r="2.7"/>`),
  pizza: S(`<path d="m12 3.2 8.4 15.8a1 1 0 0 1-.9 1.5h-15a1 1 0 0 1-.9-1.5Z"/><path d="M6.6 12.4h10.8"/><circle cx="10" cy="15.4" r="1.05"/><circle cx="14.2" cy="16.6" r="1.05"/>`),
  bowl: S(`<path d="M3.4 11.2h17.2a8.6 8.6 0 0 1-17.2 0Z"/><path d="M8.2 8c-.6-.9-.6-1.8 0-2.7M12 7.6c-.7-1.1-.7-2.2 0-3.3M15.8 8c-.6-.9-.6-1.8 0-2.7"/>`),
  bread: S(`<path d="M4.2 11.4c0-3 3.5-5.4 7.8-5.4s7.8 2.4 7.8 5.4v4.9a2.4 2.4 0 0 1-2.4 2.4H6.6a2.4 2.4 0 0 1-2.4-2.4Z"/><path d="M9.2 9.1v.2M12 8.6v.2M14.8 9.1v.2M4.2 13.6h15.6"/>`),
};

export const icon = (name) => ICONS[name] || ICONS.info;
