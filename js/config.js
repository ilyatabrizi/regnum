// The facts the app runs on, in one place.
//
// REGNUM's own: the name, the lockup, the city, the photographs and the reel.
// Everything marked PREVIEW is ours, standing in until the house confirms it —
// README → Open items lists each one.
//
// There is deliberately no Instagram handle here and no link to one anywhere in
// the app: Ilya's instruction for this preview.

export const STORAGE = "regnum.v1.";

export const BUSINESS = {
  name: "REGNUM",
  full: "REGNUM Café & Restaurant",
  city: "Tabriz",
  country: "Iran",
  currency: "Toman",
  // PREVIEW — hours to be confirmed with the house
  hours: [
    { days: "Saturday – Thursday", time: "08:00 – 24:00" },
    { days: "Friday", time: "09:00 – 24:00" },
  ],
};

export const CHECKIN = {
  holdMinutes: 60,         // a check-in lets go by itself after this
  extendMinutes: 60,
  demo: true,              // PREVIEW — fill the room from the clock-derived roster
  endpoint: "",            // a shared room service; empty = this phone + the demo roster
  zones: ["Window", "Banquette", "Counter", "Terrace", "Upstairs"],
};

export const ORDER = {
  prepMinutes: 12,         // PREVIEW — what the order screen counts down
};
