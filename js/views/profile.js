// Profile — kept on this phone and nowhere else. A name and a photo if you want
// them (the room uses them), how the room sees you, light or dark, the orders
// placed here, the café, install, and one button that clears all of it.
// There is no account, no points, no tier and no card: this app keeps no
// customer record.

import { BUSINESS } from "../config.js";
import { esc, money, dateShort, hm, plural, initials, hueOf } from "../util.js";
import { icon } from "../icons.js";
import { refresh } from "../router.js";
import { profile, setProfile, orders, reorder, clearAll } from "../store.js";
import * as presence from "../presence.js";
import { themePref, setTheme } from "../theme.js";
import { standalone, isIOS, canPrompt, promptInstall } from "../install.js";
import { avatarHTML, segHTML, wireSeg, toast, openSheet, closeSheet, confirmSheet, poweredHTML } from "../ui.js";
import { haptic } from "../motion.js";

const face = (p, size = 72) => avatarHTML({ ini: initials(p.name), hue: p.name.trim() ? hueOf(p.name) : 8, photo: p.photo, size });

const orderRow = (o) => {
  const names = o.lines.map((l) => l.name);
  return `
    <li class="orow">
      <a class="row row--tap" href="#/order/${esc(o.id)}">
        <span class="row-ico">${icon("bag")}</span>
        <span class="row-t"><b>${esc(names.slice(0, 2).join(", "))}${names.length > 2 ? ` +${names.length - 2}` : ""}</b><span>${dateShort(o.at)}, ${hm(o.at)} · ${money(o.total)} ${BUSINESS.currency}</span></span>
      </a>
      <button class="btn btn--soft btn--mini" type="button" data-again="${esc(o.id)}">Again</button>
    </li>`;
};

/** Centre-crop to a square and shrink to `size` — a face, not a photo library. */
function squarePhoto(file, size = 320) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(img.naturalWidth, img.naturalHeight);
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", .84));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("unreadable")); };
    img.src = url;
  });
}

export default function profileView() {
  const p = profile();
  const list = orders().slice(0, 6);
  const html = `
    <div class="wrap narrow">
      <header class="ph"><h1 class="lt">Profile</h1><p class="ph-sub">Kept on this phone — no account, no sign-up.</p></header>

      <section class="me">
        <button class="me-av" id="me-av" type="button" aria-label="${p.photo ? "Change your photo" : "Add a photo"}">${face(p)}<span class="me-cam">${icon("camera")}</span></button>
        <div class="me-t">
          <input class="me-name" id="me-name" type="text" value="${esc(p.name)}" placeholder="Your name" maxlength="40" autocomplete="name" enterkeyhint="done" aria-label="Your name">
          <p class="small" id="me-sub"></p>
        </div>
        <input type="file" id="me-file" accept="image/*" hidden>
      </section>

      <section class="sec">
        <h2 class="sec-t">In the room, show me as</h2>
        ${segHTML("Show me as", [{ v: "name", label: "Name" }, { v: "initials", label: "Initials" }, { v: "hidden", label: "No one" }], p.visibility, "seg--vis")}
      </section>

      <section class="sec">
        <h2 class="sec-t">Appearance</h2>
        ${segHTML("Appearance", [{ v: "system", label: "System", ico: "system" }, { v: "light", label: "Light", ico: "sun" }, { v: "dark", label: "Dark", ico: "moon" }], themePref(), "seg--theme")}
      </section>

      <section class="sec">
        <h2 class="sec-t">Your orders</h2>
        ${list.length ? `<ul class="list olist">${list.map(orderRow).join("")}</ul>`
          : `<div class="note-card small">Orders you place show up here, so the same again is one tap.</div>`}
      </section>

      <section class="sec">
        <h2 class="sec-t">${esc(BUSINESS.name)}</h2>
        <ul class="list">
          ${BUSINESS.hours.map((h) => `<li class="row"><span class="row-ico">${icon("clock")}</span><span class="row-t"><b>${esc(h.days)}</b><span>${esc(h.time)}</span></span></li>`).join("")}
          <li class="row"><span class="row-ico">${icon("pin")}</span><span class="row-t"><b>${esc(BUSINESS.full)}</b><span>${esc(BUSINESS.city)}, ${esc(BUSINESS.country)}</span></span></li>
          <li><a class="row row--tap" href="#/checkin"><span class="row-ico">${icon("people")}</span><span class="row-t"><b>Who is in right now</b><span>Check in when you sit down</span></span><span class="row-go">${icon("chevronR")}</span></a></li>
        </ul>
      </section>

      <section class="sec">
        <ul class="list">
          <li><button class="row row--tap" id="install" type="button"><span class="row-ico">${icon("plusSquare")}</span><span class="row-t"><b id="install-t">Add to Home Screen</b><span id="install-d">Opens full screen, like an app</span></span><span class="row-go">${icon("chevronR")}</span></button></li>
          <li><button class="row row--tap row--danger" id="clear" type="button"><span class="row-ico">${icon("trash")}</span><span class="row-t"><b>Clear everything on this phone</b><span>Name, photo, bag, orders and check-in</span></span></button></li>
        </ul>
      </section>

      ${poweredHTML()}
    </div>`;

  return {
    html,
    mount(screen) {
      const $ = (s) => screen.querySelector(s);
      const nameIn = $("#me-name"), sub = $("#me-sub"), av = $("#me-av"), file = $("#me-file");

      const paintSub = () => {
        const pp = profile();
        sub.textContent = pp.visibility === "hidden" ? "Hidden from the room"
          : pp.name.trim() ? `The room sees you as “${presence.myFace().label}”` : "Add a name and the room sees it";
      };
      const paintFace = () => {
        av.querySelector(".av").outerHTML = face(profile());
        av.setAttribute("aria-label", profile().photo ? "Change your photo" : "Add a photo");
      };
      paintSub();

      let t = null;
      nameIn.addEventListener("input", () => {
        clearTimeout(t);
        t = setTimeout(() => { setProfile({ name: nameIn.value.trim() }); presence.refreshFace(); paintSub(); paintFace(); }, 300);
      });
      nameIn.addEventListener("keydown", (e) => { if (e.key === "Enter") nameIn.blur(); });

      wireSeg($(".seg--vis"), (v) => { setProfile({ visibility: v }); presence.refreshFace(); paintSub(); });
      wireSeg($(".seg--theme"), (v) => setTheme(v));

      av.addEventListener("click", () => {
        if (!profile().photo) { file.click(); return; }
        openSheet({
          title: "Your photo", sub: "It sits beside your name in the room.", label: "Your photo",
          foot: `<div class="btn-pair"><button class="btn btn--soft" type="button" data-rm>Remove</button><button class="btn btn--primary" type="button" data-new>Choose another</button></div>`,
          mount(sheet) {
            sheet.querySelector("[data-rm]").addEventListener("click", () => { setProfile({ photo: "" }); closeSheet(); paintFace(); presence.refreshFace(); });
            sheet.querySelector("[data-new]").addEventListener("click", () => { file.click(); closeSheet(); });
          },
        });
      });
      file.addEventListener("change", async () => {
        const f = file.files?.[0];
        file.value = "";
        if (!f) return;
        try {
          setProfile({ photo: await squarePhoto(f) });
          paintFace();
          presence.refreshFace();
          toast("Photo updated");
        } catch { toast("That photo couldn't be read"); }
      });

      screen.querySelectorAll("[data-again]").forEach((b) => b.addEventListener("click", () => {
        const n = reorder(b.dataset.again);
        haptic([8, 30, 10]);
        toast(`${plural(n, "thing")} back in your bag`, { action: { label: "View", href: "#/bag" } });
      }));

      const inst = $("#install");
      if (standalone()) {
        $("#install-t").textContent = "Installed";
        $("#install-d").textContent = "You're in the app";
        inst.disabled = true;
      }
      inst.addEventListener("click", async () => {
        if (canPrompt()) { if (await promptInstall()) toast(`${BUSINESS.name} is on your Home Screen`); return; }
        const how = isIOS()
          ? [["share", "Tap <b>Share</b> in Safari."], ["plusSquare", "Choose <b>Add to Home Screen</b>."], ["check", `Tap <b>Add</b> — ${BUSINESS.name} opens full screen, like an app.`]]
          : [["external", "Open your browser's menu."], ["plusSquare", "Choose <b>Install app</b> or <b>Add to Home screen</b>."], ["check", `Confirm — ${BUSINESS.name} opens full screen, like an app.`]];
        openSheet({
          title: `Add ${BUSINESS.name} to your Home Screen`, label: "Add to Home Screen",
          body: `<ol class="steps-how">${how.map(([i, s]) => `<li><span class="how-ico">${icon(i)}</span><span>${s}</span></li>`).join("")}</ol>`,
          foot: `<button class="btn btn--primary btn--block" type="button" data-ok>Got it</button>`,
          mount(sheet) { sheet.querySelector("[data-ok]").addEventListener("click", closeSheet); },
        });
      });

      $("#clear").addEventListener("click", () => confirmSheet({
        title: "Clear everything?", sub: "Your name, photo, bag, orders and check-in on this phone. This can't be undone.",
        yes: "Clear", danger: true,
        onYes: () => { presence.checkOut(); clearAll(); setTheme("system"); toast("Cleared"); refresh(); },
      }));
    },
  };
}
