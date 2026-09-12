// Menu. The chips filter to one section (or all of them); search matches names
// and descriptions across every section. The plus adds a thing as it comes in
// one tap; a tap anywhere else on the row opens it, with its choices.

import { BUSINESS } from "../config.js";
import { CATEGORIES, inCat } from "../data.js";
import { esc, priceHTML } from "../util.js";
import { icon } from "../icons.js";
import { thumbHTML, addHTML } from "../ui.js";

const row = (item) => `
  <li class="mrow" data-item="${item.id}" tabindex="0" data-q="${esc((item.name + " " + item.desc).toLowerCase())}">
    <span class="mrow-img">${thumbHTML(item, 64)}</span>
    <span class="mrow-t">
      <span class="mrow-n">${esc(item.name)}${item.tag ? `<span class="tag">${esc(item.tag)}</span>` : ""}</span>
      <span class="mrow-d">${esc(item.desc)}</span>
      <span class="mrow-p">${priceHTML(item.price)}</span>
    </span>
    ${addHTML(item)}
  </li>`;

export default function menu(_, q) {
  let cat = CATEGORIES.some((c) => c.id === q.c) ? q.c : "all";
  const html = `
    <div class="wrap narrow">
      <header class="ph"><h1 class="lt">Menu</h1><p class="ph-sub">At your table or to take away. You pay at the counter.</p></header>
      <label class="search">${icon("search")}<input id="q" type="search" placeholder="Search drinks and food" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" aria-label="Search the menu"><button class="search-x" id="q-x" type="button" aria-label="Clear the search" hidden>${icon("close")}</button></label>
    </div>
    <div class="chips-bar"><div class="chips narrow" id="chips" role="toolbar" aria-label="Menu sections">
      ${[{ id: "all", name: "All" }, ...CATEGORIES].map((c) => `<button type="button" class="chip" data-c="${c.id}" aria-pressed="${c.id === cat}">${esc(c.name)}</button>`).join("")}
    </div></div>
    <div class="wrap narrow" id="menu-body">
      ${CATEGORIES.map((c) => `
        <section class="msec" data-c="${c.id}"${cat !== "all" && cat !== c.id ? " hidden" : ""}>
          <div class="msec-head"><h2 class="d3">${esc(c.name)}</h2>${c.note ? `<p class="small">${esc(c.note)}</p>` : ""}</div>
          <ul class="list mlist">${inCat(c.id).map(row).join("")}</ul>
        </section>`).join("")}
      <div class="menu-none" id="none" hidden></div>
      <p class="tiny menu-note">Preview menu: names and prices are placeholders until ${esc(BUSINESS.name)} sends their card.</p>
    </div>`;

  return {
    html,
    mount(screen) {
      const $ = (s) => screen.querySelector(s);
      const input = $("#q"), clear = $("#q-x"), none = $("#none"), chips = $("#chips");
      const secs = [...screen.querySelectorAll(".msec")];

      const apply = () => {
        const term = input.value.trim().toLowerCase();
        clear.hidden = !term;
        let shown = 0;
        secs.forEach((s) => {
          let hits = 0;
          s.querySelectorAll(".mrow").forEach((r) => {
            const ok = !term || r.dataset.q.includes(term);
            r.hidden = !ok;
            if (ok) hits++;
          });
          const inChip = term ? true : cat === "all" || s.dataset.c === cat;
          s.hidden = !inChip || hits === 0;
          if (!s.hidden) shown += hits;
        });
        none.hidden = shown > 0;
        if (!shown) none.innerHTML = `<p class="d3">Nothing called “${esc(input.value.trim())}”</p><p class="small">Try a drink, a dish, or something in it.</p>`;
        chips.classList.toggle("dim", !!term);
      };

      chips.addEventListener("click", (e) => {
        const b = e.target.closest(".chip");
        if (!b) return;
        cat = b.dataset.c;
        chips.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        input.value = "";
        apply();
        // the address follows the filter without a navigation (no hashchange, no re-render)
        history.replaceState(history.state, "", cat === "all" ? "#/menu" : `#/menu?c=${cat}`);
        b.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        const bar = document.getElementById("bar").offsetHeight + screen.querySelector(".chips-bar").offsetHeight;
        const top = $("#menu-body").getBoundingClientRect().top + scrollY - bar - 6;
        if (scrollY > top) scrollTo({ top, behavior: "smooth" });
      });
      input.addEventListener("input", apply);
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") input.blur(); });
      clear.addEventListener("click", () => { input.value = ""; apply(); input.focus(); });
      apply();
      chips.querySelector('[aria-pressed="true"]')?.scrollIntoView({ inline: "center", block: "nearest" });
    },
  };
}
