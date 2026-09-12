// An order, placed. The number is what the counter calls; the ring counts down
// the preview's eight minutes and the steps move on their own. Nothing is paid
// here — the total is what to hand over at the counter.

import { orderById } from "../store.js";
import { esc, money, priceHTML, hm, minsLeft, clamp } from "../util.js";
import { icon } from "../icons.js";
import { emptyHTML } from "../ui.js";

const STEPS = ["Received", "Being made", "Ready"];

export default function orderView({ id }) {
  const o = orderById(id);
  if (!o) {
    return { html: `<div class="wrap narrow">${emptyHTML({ glyph: "bag", title: "No order here", sub: "It may have been cleared from this phone.", cta: "See the menu", href: "#/menu" })}</div>` };
  }
  const where = o.mode === "table"
    ? (o.table ? `We'll bring it to table ${esc(o.table)}.` : "We'll bring it to your table.")
    : `We'll call number ${esc(o.code)} at the counter.`;
  const count = o.lines.reduce((n, l) => n + l.qty, 0);

  const html = `
    <div class="wrap narrow order">
      <section class="order-hero">
        <div class="order-ring">
          <svg viewBox="0 0 220 220" aria-hidden="true"><circle class="track" cx="110" cy="110" r="100"/><circle class="fill" id="ring-fill" cx="110" cy="110" r="100" pathLength="1000"/></svg>
          <div class="order-ring-in"><span class="eyebrow">Order</span><span class="order-code" id="code">${esc(o.code)}</span><span class="order-eta" id="eta"></span></div>
        </div>
        <h1 class="d2 order-title" id="o-title"></h1>
        <p class="body order-where">${where}${o.name ? ` Under ${esc(o.name)}.` : ""}</p>
      </section>

      <ol class="steps" id="steps">${STEPS.map((s, i) => `<li data-s="${i}"><i></i><span>${s}</span></li>`).join("")}</ol>

      <section class="sec">
        <h2 class="sec-t">${count} ${count === 1 ? "thing" : "things"} · placed at ${hm(o.at)}</h2>
        <ul class="list">
          ${o.lines.map((l) => `<li class="row"><span class="qty-n">${l.qty}×</span><span class="row-t"><b>${esc(l.name)}</b>${l.label ? `<span>${esc(l.label)}</span>` : ""}</span><span class="row-v money">${money(l.unit * l.qty)}</span></li>`).join("")}
          <li class="row row--total"><span class="row-t"><b>To pay at the counter</b></span><span class="row-v">${priceHTML(o.total)}</span></li>
        </ul>
        ${o.note ? `<p class="small order-note">“${esc(o.note)}”</p>` : ""}
      </section>

      <div class="order-acts">
        <a class="btn btn--primary btn--block" href="#/checkin">${icon("checkin")}<span>Check in while you wait</span></a>
        <a class="btn btn--soft btn--block" href="#/">Done</a>
      </div>
    </div>`;

  return {
    html,
    mount(screen, onLeave) {
      const fill = screen.querySelector("#ring-fill");
      const eta = screen.querySelector("#eta");
      const title = screen.querySelector("#o-title");
      const steps = [...screen.querySelectorAll("#steps li")];
      const span = Math.max(1, o.ready - o.at);
      const paint = () => {
        const now = Date.now();
        const stage = now >= o.ready ? 2 : now - o.at > 20000 ? 1 : 0;
        fill.style.strokeDashoffset = String(1000 - Math.round(clamp((now - o.at) / span, 0, 1) * 1000));
        eta.textContent = stage === 2 ? "Ready" : `about ${minsLeft(o.ready, now)} min`;
        title.textContent = stage === 2 ? (o.mode === "table" ? "On its way to you" : "Ready at the counter") : stage === 1 ? "Being made" : "Received";
        steps.forEach((s, i) => {
          s.classList.toggle("done", i < stage || stage === 2);
          s.classList.toggle("now", i === stage && stage < 2);
        });
      };
      paint();
      const t = setInterval(paint, 1000);
      onLeave(() => clearInterval(t));
    },
  };
}
