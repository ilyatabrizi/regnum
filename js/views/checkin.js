// Check in. One tap when you sit down: the disc fills, your hour starts, and you
// join the room below. Where you sit is optional; how you appear is set in
// Profile. "Check out" leaves early — otherwise the hour lets go by itself.

import { BUSINESS, CHECKIN } from "../config.js";
import { esc, since, minsLeft, clamp, hm } from "../util.js";
import { icon } from "../icons.js";
import { haptic, replay } from "../motion.js";
import { toast, avatarHTML } from "../ui.js";
import { profile, setProfile } from "../store.js";
import * as presence from "../presence.js";

const when = (at, now) => { const s = since(at, now); return s === "just now" ? "just arrived" : `arrived ${s} ago`; };
const herePhrase = (n) => (n === 0 ? "Nobody's in yet" : n === 1 ? "1 person is here" : `${n} people are here`);

const personHTML = (p, now, fresh) => `
  <li class="person${p.me ? " person--me" : ""}${fresh ? " arrive" : ""}" data-id="${esc(p.id)}">
    ${avatarHTML({ ini: p.ini, hue: p.hue, photo: p.photo, size: 42, me: !!p.me })}
    <span class="person-t">
      <span class="person-n">${esc(p.label)}${p.me ? `<span class="you">You</span>` : ""}</span>
      <span class="person-d">${p.zone ? `${esc(p.zone)} · ` : ""}${when(p.at, now)}</span>
    </span>
    ${!p.me && now - p.at < 6 * 60000 ? `<span class="person-new">New</span>` : ""}
  </li>`;

export default function checkin() {
  const html = `
    <div class="wrap narrow">
      <header class="ph"><h1 class="lt">Check in</h1><p class="ph-sub">Tap when you arrive and see who's around. It lasts an hour, then lets go by itself.</p></header>

      <section class="ci-stage" id="stage" data-in="0">
        <button class="disc" id="disc" type="button">
          <span class="disc-waves" aria-hidden="true"><i></i><i></i><i></i></span>
          <svg class="disc-ring" viewBox="0 0 200 200" aria-hidden="true"><circle class="disc-track" cx="100" cy="100" r="96"/><circle class="disc-fill" id="disc-fill" cx="100" cy="100" r="96" pathLength="1000"/></svg>
          <span class="disc-face"><span class="disc-ico" id="disc-ico"></span><span class="disc-l" id="disc-l"></span></span>
        </button>
        <h2 class="ci-title" id="ci-title"></h2>
        <p class="ci-sub" id="ci-sub"></p>

        <div class="ci-more" id="ci-more" hidden>
          <div class="ci-zones">
            <p class="sec-t">Where are you sitting?</p>
            <div class="opt-row" id="zones">${CHECKIN.zones.map((z) => `<button type="button" class="pill" data-z="${esc(z)}" aria-pressed="false">${esc(z)}</button>`).join("")}</div>
          </div>
          <label class="field ci-name" id="ci-name" hidden><span class="field-l">Add your name so friends can spot you</span>
            <input id="ci-name-in" maxlength="40" placeholder="Your name" autocomplete="given-name" enterkeyhint="done"></label>
          <div class="ci-acts">
            <button class="btn btn--soft" id="extend" type="button">${icon("timer")}<span>Another hour</span></button>
            <button class="btn btn--soft" id="out" type="button">${icon("logout")}<span>Check out</span></button>
          </div>
        </div>
      </section>

      <section class="sec">
        <div class="sec-head"><h2 class="t2">Here now</h2><span class="count-pill" id="room-n"><i></i><b></b></span></div>
        <ul class="list room" id="room"></ul>
      </section>
      <p class="tiny ci-foot" id="ci-foot"></p>
    </div>`;

  return {
    html,
    mount(screen, onLeave) {
      const $ = (s) => screen.querySelector(s);
      const stage = $("#stage"), disc = $("#disc"), fill = $("#disc-fill"), ico = $("#disc-ico"), lab = $("#disc-l");
      const title = $("#ci-title"), sub = $("#ci-sub"), more = $("#ci-more"), room = $("#room"), roomN = $("#room-n b");
      const foot = $("#ci-foot"), nameField = $("#ci-name"), nameIn = $("#ci-name-in");
      let seen = null, wasIn = null;

      const paint = () => {
        const now = Date.now();
        const mine = presence.me(now);
        const people = presence.room(now);
        const others = people.filter((p) => !p.me).length;
        const inNow = !!mine;
        if (inNow !== wasIn) { ico.innerHTML = icon(inNow ? "check" : "checkin"); wasIn = inNow; }
        stage.dataset.in = inNow ? "1" : "0";
        more.hidden = !inNow;
        if (inNow) {
          const left = minsLeft(mine.until, now);
          lab.textContent = `${left} min left`;
          fill.style.strokeDashoffset = String(1000 - Math.round(clamp(left / CHECKIN.holdMinutes, 0, 1) * 1000));
          title.textContent = "You're in";
          sub.textContent = `Until ${hm(mine.until)}${mine.zone ? ` · ${mine.zone}` : ""} · ${others ? `${others} other${others === 1 ? "" : "s"} here` : "the first one here"}`;
          disc.setAttribute("aria-label", `Checked in, ${left} minutes left`);
          $("#zones").querySelectorAll(".pill").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.z === mine.zone)));
          const p = profile();
          if (document.activeElement !== nameIn) nameField.hidden = !!p.name.trim() || p.visibility === "hidden";
        } else {
          lab.textContent = "Tap to check in";
          fill.style.strokeDashoffset = "1000";
          title.textContent = herePhrase(others);
          sub.textContent = others ? "Check in to join them." : "Be the first — tap when you sit down.";
          disc.setAttribute("aria-label", "Check in");
        }
        roomN.textContent = people.length;
        room.innerHTML = people.length
          ? people.map((p) => personHTML(p, now, !!seen && !seen.has(p.id))).join("")
          : `<li class="room-empty small">When people check in, they show up here.</li>`;
        seen = new Set(people.map((p) => p.id));
        const face = presence.myFace();
        foot.innerHTML = `${face.hidden ? "You're hidden from the room." : `The room sees you as <b>${esc(face.label)}</b>.`} <a href="#/profile">Change it in Profile</a>. ` +
          `Preview: the other guests are a demo room until ${BUSINESS.name}'s own is connected.`;
      };

      disc.addEventListener("click", () => {
        if (presence.isIn()) { replay(stage, "nudge"); haptic(6); return; }
        presence.checkIn();
        haptic([14, 50, 22]);
        replay(stage, "burst");
        toast(`You're checked in — enjoy ${BUSINESS.name}`);
      });
      $("#zones").addEventListener("click", (e) => {
        const b = e.target.closest(".pill");
        const m = presence.me();
        if (!b || !m) return;
        haptic(6);
        presence.setZone(m.zone === b.dataset.z ? "" : b.dataset.z);
      });
      $("#extend").addEventListener("click", () => { const m = presence.extend(); if (m) toast(`Held until ${hm(m.until)}`); });
      $("#out").addEventListener("click", () => { presence.checkOut(); haptic(10); toast("Checked out — see you soon"); });
      const saveName = () => {
        const v = nameIn.value.trim();
        if (!v) return;
        setProfile({ name: v });
        presence.refreshFace();
        toast(`The room sees you as ${presence.myFace().label}`);
      };
      nameIn.addEventListener("change", saveName);
      nameIn.addEventListener("keydown", (e) => { if (e.key === "Enter") nameIn.blur(); });

      paint();
      onLeave(presence.subscribe(paint));
      const t = setInterval(paint, 15000);
      onLeave(() => clearInterval(t));
    },
  };
}
