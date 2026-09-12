// The bag. Change a line's choices or its count, or take it out (with an undo);
// say where it goes — your table, or the counter to take away — and place it.
// Nothing is paid in the app: you pay at the counter, as you would anyway.

import { byId } from "../data.js";
import { esc, money, priceHTML, priceText, plural } from "../util.js";
import { icon } from "../icons.js";
import { go, refresh } from "../router.js";
import {
  bag, bagCount, bagTotal, lineTotal, setQty, removeLine, restoreLine, optsLabel,
  placeOrder, profile, setProfile, orders, reorder, subscribe,
} from "../store.js";
import { thumbHTML, qtyHTML, qty, segHTML, wireSeg, toast, itemSheet, emptyHTML } from "../ui.js";
import { haptic } from "../motion.js";

// what was typed survives a re-render (a line added from a sheet repaints the bag)
const draft = { mode: "table", table: "", note: "", name: null };
const sigOf = () => bag().map((l) => l.key).join(",");
const summaryOf = (o) => {
  const names = o.lines.map((l) => (l.qty > 1 ? `${l.qty} × ${l.name}` : l.name));
  return names.slice(0, 2).join(", ") + (names.length > 2 ? ` +${names.length - 2}` : "");
};

const lineHTML = (l) => {
  const it = byId(l.id);
  const lab = optsLabel(it, l.opts);
  const opts = it.options?.length;
  return `
    <li class="line" data-key="${esc(l.key)}">
      <span class="line-img">${thumbHTML(it, 58)}</span>
      <span class="line-t">
        <span class="line-n">${esc(it.name)}</span>
        ${opts ? `<span class="line-o">${esc(lab || "As it comes")}</span><button class="line-edit" type="button" data-edit>Change</button>` : ""}
      </span>
      <span class="line-r"><span class="line-p money">${money(lineTotal(l))}</span>${qtyHTML(l.qty, `${it.name}, how many`)}</span>
    </li>`;
};

function emptyBag() {
  const last = orders()[0];
  return {
    html: `
      <div class="wrap narrow">
        <header class="ph"><h1 class="lt">Bag</h1></header>
        ${emptyHTML({ glyph: "bag", title: "Your bag is empty", sub: "Everything on the menu goes in with one tap.", cta: "See the menu", href: "#/menu" })}
        ${last ? `
        <section class="sec">
          <h2 class="sec-t">Last time</h2>
          <ul class="list"><li><button class="row row--tap" type="button" id="again">
            <span class="row-ico">${icon("refresh")}</span>
            <span class="row-t"><b>${esc(summaryOf(last))}</b><span>${priceText(last.total)} · the same again</span></span>
            <span class="row-go">${icon("plus")}</span>
          </button></li></ul>
        </section>` : ""}
      </div>`,
    mount(screen) {
      screen.querySelector("#again")?.addEventListener("click", () => {
        const n = reorder(last.id);
        haptic([8, 30, 10]);
        toast(`${plural(n, "thing")} back in your bag`);
        refresh();
      });
    },
  };
}

export default function bagView() {
  const lines = bag();
  if (!lines.length) return emptyBag();
  if (draft.name == null) draft.name = profile().name || "";

  const html = `
    <div class="wrap narrow">
      <header class="ph"><h1 class="lt">Bag</h1><p class="ph-sub" id="bag-sub"></p></header>
      <ul class="list lines" id="lines">${lines.map(lineHTML).join("")}</ul>

      <section class="sec">
        <h2 class="sec-t">Where should it go?</h2>
        ${segHTML("Where", [{ v: "table", label: "At my table", ico: "table" }, { v: "takeaway", label: "To take away", ico: "takeaway" }], draft.mode)}
        <div class="fields">
          <label class="field" id="table-field"${draft.mode === "table" ? "" : " hidden"}><span class="field-l">Table number</span>
            <input id="table" inputmode="numeric" maxlength="3" placeholder="Optional — we'll find you" value="${esc(draft.table)}" autocomplete="off"></label>
          <label class="field"><span class="field-l">Name for the order</span>
            <input id="oname" maxlength="40" placeholder="Optional" value="${esc(draft.name)}" autocomplete="given-name"></label>
          <label class="field"><span class="field-l">Anything we should know?</span>
            <textarea id="note" maxlength="200" placeholder="Allergies, less sugar, no rush…">${esc(draft.note)}</textarea></label>
        </div>
      </section>

      <div class="checkout" id="checkout">
        <div class="checkout-t"><small>Total</small><b id="total"></b></div>
        <button class="btn btn--primary" id="place" type="button">Place order</button>
      </div>
      <p class="tiny pay-note">Nothing is paid in the app — you pay at the counter.</p>
    </div>`;

  return {
    html,
    mount(screen, onLeave) {
      const $ = (s) => screen.querySelector(s);
      let sig = sigOf();
      let placing = false;

      const paintTotals = () => {
        const n = bagCount();
        $("#bag-sub").textContent = `${plural(n, "thing")} · pay at the counter when it's ready`;
        $("#total").innerHTML = priceHTML(bagTotal());
      };

      const drop = (li, key) => {
        sig = bag().filter((x) => x.key !== key).map((x) => x.key).join(",");
        const gone = removeLine(key);
        haptic(10);
        li.classList.add("leaving");
        setTimeout(() => { if (!bag().length) refresh(); else { li.remove(); paintTotals(); } }, 300);
        if (gone) toast(`${byId(gone.line.id).name} taken out`, { action: { label: "Undo", run: () => restoreLine(gone) } });
      };

      screen.querySelectorAll(".line").forEach((li) => {
        const key = li.dataset.key;
        const start = bag().find((x) => x.key === key);
        qty(li.querySelector(".qty"), {
          value: start.qty, min: 0, max: 20,
          onChange: (v) => {
            if (v === 0) { drop(li, key); return; }
            setQty(key, v);
            const l = bag().find((x) => x.key === key);
            if (l) li.querySelector(".line-p").textContent = money(lineTotal(l));
            paintTotals();
          },
        });
        li.querySelector("[data-edit]")?.addEventListener("click", () => {
          const l = bag().find((x) => x.key === key);
          if (l) itemSheet(l.id, { line: l });
        });
      });

      // a line added, changed in a sheet, or brought back by Undo repaints the bag;
      // a count going up or down does not (that is painted in place above)
      onLeave(subscribe(() => {
        if (placing) return;
        const next = sigOf();
        if (next !== sig) { sig = next; refresh(); }
      }));

      wireSeg($(".seg"), (v) => { draft.mode = v; $("#table-field").hidden = v !== "table"; });
      $("#table").addEventListener("input", (e) => { draft.table = e.target.value.replace(/\D/g, "").slice(0, 3); e.target.value = draft.table; });
      $("#oname").addEventListener("input", (e) => { draft.name = e.target.value; });
      $("#note").addEventListener("input", (e) => { draft.note = e.target.value; });

      $("#place").addEventListener("click", () => {
        placing = true;
        const o = placeOrder({ mode: draft.mode, table: draft.table, note: draft.note, name: draft.name || "" });
        if (!o) { placing = false; return; }
        if (draft.name && !profile().name.trim()) setProfile({ name: draft.name.trim() });
        draft.note = "";
        draft.table = "";
        haptic([12, 40, 18]);
        go(`#/order/${o.id}`);
      });
      paintTotals();
    },
  };
}
