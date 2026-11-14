/*
  Animación: cómo funciona el prompt caching por dentro.
  Fila de arriba: lo que Claude Code envía en cada petición. Fila de abajo: lo que guarda el caché.
  Un haz recorre la petición comparándola con el caché: lo que coincide desde el inicio se lee
  barato (verde), lo demás se procesa y se escribe (ámbar). Al final, qué lo rompe.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";

type Kind = "sys" | "proj" | "user" | "claude";
type B = { id: string; kind: Kind; label: string; tok: number };

const MAX = 18800; // tokens que caben en el ancho de la pista

const blk = (id: string, kind: Kind, label: string, tok: number): B => ({ id, kind, label, tok });
const S = blk("s", "sys", "Sistema", 5000);
const S2 = blk("s2", "sys", "Sistema · cambió", 5000);
const P = blk("p", "proj", "CLAUDE.md", 3000);
const turn = (n: number) => [blk("u" + n, "user", "Tú", 1000), blk("c" + n, "claude", "Claude", 1300)];
const conv = (n: number, closeLast = false) => {
  const out: B[] = [];
  for (let k = 1; k <= n; k++) out.push(...turn(k));
  if (!closeLast) out.pop(); // la petición termina con tu mensaje, aún sin respuesta
  return out;
};

let root: HTMLElement;
/** Animación del paso en curso: si el lector avanza antes de que termine, se completa al instante. */
let tl: gsap.core.Timeline | null = null;

type Estado = {
  req: B[];
  /** cuántos tokens del inicio se leen del caché */
  hit: number;
  cache: B[];
  cacheState: "warm" | "expired" | "empty";
  model: string;
  ttl: number; // 0..1
  scan: "hit" | "miss" | "break" | "none";
  breakAt?: string; // id del bloque donde la comparación falla
  dimReq?: boolean;
};

const tokens = (bs: B[]) => bs.reduce((a, b) => a + b.tok, 0);
const upTo = (bs: B[], id: string) => tokens(bs.slice(0, bs.findIndex((b) => b.id === id) + 1));

const R1 = [S, P, ...conv(1)];
const R2 = [S, P, ...conv(2)];
const R3 = [S, P, ...conv(3)];
const R4 = [S, P, ...conv(4)];
const R4b = [S2, P, ...conv(4)];
const R5 = [S, P, ...conv(5)];

const ESTADOS: Estado[] = [
  { req: [], hit: 0, cache: [], cacheState: "empty", model: "Sonnet", ttl: 1, scan: "none" },
  { req: R1, hit: 0, cache: R1, cacheState: "warm", model: "Sonnet", ttl: 1, scan: "miss" },
  { req: R2, hit: tokens(R1), cache: R2, cacheState: "warm", model: "Sonnet", ttl: 1, scan: "hit" },
  { req: R3, hit: tokens(R2), cache: R3, cacheState: "warm", model: "Sonnet", ttl: 1, scan: "hit" },
  { req: R3, hit: 0, cache: R3, cacheState: "expired", model: "Sonnet", ttl: 0, scan: "none", dimReq: true },
  { req: R4, hit: 0, cache: R4, cacheState: "warm", model: "Sonnet", ttl: 1, scan: "miss" },
  { req: R4, hit: 0, cache: R4, cacheState: "warm", model: "Opus", ttl: 1, scan: "miss" },
  { req: R4b, hit: 0, cache: R4b, cacheState: "warm", model: "Opus", ttl: 1, scan: "break", breakAt: "s2" },
  { req: R5, hit: upTo(R5, "u4"), cache: R5, cacheState: "warm", model: "Opus", ttl: 1, scan: "hit" },
];

export const cache: Escena = {
  title: "Qué pasa con el caché en cada mensaje",
  steps: [
    { title: "Cada mensaje reenvía todo", text: "Claude no recuerda nada entre mensajes: cada petición lleva el sistema, tu CLAUDE.md y la conversación completa. Arriba, lo que se envía; abajo, lo que guarda el caché. Ejemplo con <b>API key</b>.", ms: 7000 },
    { title: "Primer mensaje: se escribe el caché", text: "Nada coincide todavía. Todo se procesa y se guarda en el caché, pagando un poco más que la entrada normal: <b>1,25×</b> con el caché de 5 minutos.", ms: 7500 },
    { title: "Segundo mensaje: se lee el comienzo", text: "El comienzo es idéntico al que quedó guardado: se lee a <b>un 5% del precio</b>. Solo la respuesta anterior y tu mensaje nuevo se escriben.", ms: 7500 },
    { title: "La conversación crece, el costo no", text: "Cada turno lee todo lo anterior del caché y escribe solo lo nuevo. Cuanto más larga la sesión, más ahorra.", ms: 7000 },
    { title: "Diez minutos sin escribir", text: "Con API key el caché dura <b>5 minutos</b> desde el último uso: expiró. Con suscripción habría durado 1 hora.", ms: 7500 },
    { title: "Volver tras la pausa cuesta todo", text: "No hay nada que leer: la conversación completa se procesa y se escribe otra vez. Si vas a cambiar de tarea, <code>/clear</code> no cuesta nada.", ms: 8000 },
    { title: "Cambiar de modelo empieza de cero", text: "Cada modelo tiene su propio caché. El de Opus está vacío: cambiar de Sonnet a Opus a mitad de una sesión larga relee toda la conversación.", ms: 8000 },
    { title: "Un cambio al comienzo invalida todo", text: "El caché compara desde el inicio. Si cambia algo al comienzo, como las herramientas o una actualización de Claude Code, todo lo que viene después se vuelve a procesar.", ms: 8500 },
    { title: "La regla", text: "<b>Mismo comienzo + dentro del tiempo del caché = barato.</b> Elige el modelo al empezar, no cambies herramientas a mitad de sesión y, si te vas, decide antes si sigues o haces <code>/clear</code>.", ms: 8500 },
  ],


  setup(stage) {
    root = stage;
    stage.classList.add("cx");
    stage.innerHTML = `
      <div class="cx-rows">
        <div class="cx-row">
          <div class="cx-lbl"><b>Petición</b><span class="cx-reqtok"></span></div>
          <div class="cx-track cx-req"><div class="cx-beam"></div><div class="cx-x">✕</div></div>
        </div>
        <div class="cx-row">
          <div class="cx-lbl"><b>Caché</b><span class="cx-model"></span></div>
          <div class="cx-track cx-cache"><div class="cx-swap"></div><div class="cx-tag"></div></div>
        </div>
        <div class="cx-keys"><span><i class="k-sys"></i>Sistema</span><span><i class="k-proj"></i>CLAUDE.md</span><span><i class="k-user"></i>Tus mensajes</span><span><i class="k-claude"></i>Respuestas de Claude</span></div>
      </div>
      <div class="cx-side">
        <svg class="cx-ttl" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="27" class="bg"/><circle cx="32" cy="32" r="27" class="fg"/>
        </svg>
        <div class="cx-ttl-l"></div>
        <div class="cx-cost"><small class="cx-ct">Costo de esta petición</small><span class="cx-pct">–</span><small>de lo que costaría sin caché</small></div>
        <div class="cx-split"><i class="r"></i><i class="w"></i></div>
        <div class="cx-legend"><span><i class="r"></i>leído</span><span><i class="w"></i>escrito</span></div>
      </div>`;
  },

  go(i, instant) {
    const st = ESTADOS[i];
    const d = instant ? 0 : 1;
    const reqT = root.querySelector(".cx-req") as HTMLElement;
    const cacheT = root.querySelector(".cx-cache") as HTMLElement;
    const beam = root.querySelector(".cx-beam") as HTMLElement;
    const xMark = root.querySelector(".cx-x") as HTMLElement;
    if (tl && tl.progress() < 1) tl.progress(1);
    // movimientos sueltos (bloques que caen al caché) también se completan, nunca quedan a medias
    gsap.getTweensOf(root.querySelectorAll("*")).forEach((tw) => tw.progress(1).kill());

    const pct = (t: number) => (t / MAX) * 100;
    const hitEnd = st.hit; // tokens leídos del caché

    // ---------- fila de la petición ----------
    const t = (tl = gsap.timeline());
    const reqEls = sync(reqT, st.req, "req");
    let acc = 0;
    let fresh = 0;
    reqEls.forEach(({ el, b, isNew }) => {
      const start = acc;
      acc += b.tok;
      el.classList.remove("is-read", "is-write");
      el.classList.toggle("is-changed", b.id === "s2");
      el.style.setProperty("--w", pct(b.tok) + "%");
      // los bloques nuevos caen en su lugar, uno tras otro
      if (isNew) t.fromTo(el, { opacity: 0, y: -18, scaleY: 0.3 }, { opacity: 1, y: 0, scaleY: 1, duration: 0.5 * d, ease: "back.out(2)" }, 0.07 * fresh++ * d);
      // el color llega cuando el haz pasa por el bloque
      if (st.scan === "none") return;
      const read = start < hitEnd;
      t.call(() => el.classList.add(read ? "is-read" : "is-write"), [], (0.7 + pct(start) * 0.012) * d);
    });
    reqT.classList.toggle("is-dim", !!st.dimReq);
    root.querySelector(".cx-reqtok")!.textContent = st.req.length ? fmt(tokens(st.req)) + " tokens" : "";

    // ---------- haz que compara con el caché ----------
    gsap.set(beam, { opacity: 0, left: 0, width: 0 });
    gsap.set(xMark, { opacity: 0, scale: 0.4 });
    beam.className = "cx-beam";
    if (st.scan !== "none" && d) {
      const reach = st.scan === "hit" ? pct(hitEnd) : st.scan === "break" ? 0.6 : 0;
      beam.classList.add(st.scan === "hit" ? "hit" : "miss");
      t.set(beam, { opacity: 1, width: 0 }, 0.55);
      t.to(beam, { width: Math.max(reach, 1.5) + "%", duration: st.scan === "hit" ? 0.9 : 0.35, ease: "power2.inOut" }, 0.6);
      if (st.scan === "break") {
        t.set(xMark, { left: "0%" }, 0.95);
        t.to(xMark, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(3)" }, 0.95);
        t.fromTo(reqT, { x: -5 }, { x: 0, duration: 0.4, ease: "elastic.out(1,0.3)" }, 0.95);
      }
      if (st.scan === "miss") {
        t.fromTo(reqT, { x: -4 }, { x: 0, duration: 0.4, ease: "elastic.out(1,0.3)" }, 0.75);
      }
      t.to(beam, { opacity: 0, duration: 0.4 }, st.scan === "hit" ? 1.7 : 1.4);
    }

    // ---------- fila del caché ----------
    const modelEl = root.querySelector(".cx-model") as HTMLElement;
    const prevModel = modelEl.textContent;
    const modelChanged = !!prevModel && prevModel !== st.model;
    const old = Array.from(cacheT.querySelectorAll<HTMLElement>(".cx-b"));
    // El caché se derrumba cuando no se puede leer nada de lo guardado: expiró, cambió el modelo
    // o cambió el comienzo. Los bloques caen y se dispersan; después se reconstruye desde arriba.
    const crash = d > 0 && (st.scan === "miss" || st.scan === "break") && old.length > 0;
    let writeDelay = st.scan === "none" ? 0 : 1.5 * d;
    if (crash) {
      t.call(() => cacheT.classList.add("is-crash"), [], 0.85);
      t.to(old, {
        y: () => gsap.utils.random(46, 92),
        x: () => gsap.utils.random(-14, 14),
        rotation: () => gsap.utils.random(-32, 32),
        opacity: 0,
        duration: 0.75,
        ease: "power2.in",
        stagger: { each: 0.035, from: "start" },
      }, 0.9);
      t.call(() => { old.forEach((n) => n.remove()); cacheT.classList.remove("is-crash"); }, [], 1.9);
      writeDelay = 2.0;
    }
    const tag = root.querySelector(".cx-tag") as HTMLElement;
    gsap.set(tag, { opacity: 0 });
    if (modelChanged && d) {
      tag.textContent = "Caché de " + st.model + ": vacío";
      t.fromTo(tag, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)" }, 1.7);
      t.to(tag, { opacity: 0, duration: 0.3 }, 2.5);
      writeDelay = 2.8; // el caché nuevo se llena después de ver que está vacío
      t.call(() => { modelEl.textContent = st.model; }, [], 0.9);
      t.fromTo(modelEl, { scale: 1.5, color: "var(--accent)" }, { scale: 1, color: "var(--ink-3)", duration: 0.7, ease: "back.out(3)" }, 0.9);
    }
    t.call(() => {
      modelEl.textContent = st.model;
      const els = sync(cacheT, st.cache, "cache");
      els.forEach(({ el, b, isNew }, k) => {
        el.style.setProperty("--w", pct(b.tok) + "%");
        el.classList.toggle("is-expired", st.cacheState === "expired");
        // lo recién escrito baja desde la petición hacia el caché
        if (isNew && st.scan !== "none" && d) {
          gsap.fromTo(el, { opacity: 0, y: -58, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, delay: 0.04 * k, ease: "power3.out" });
        }
        if (st.cacheState === "expired" && d) {
          gsap.fromTo(el, { y: 0 }, { y: 4, duration: 0.5, delay: 2.4 + 0.03 * k, ease: "power2.out" });
        }
      });
    }, [], writeDelay);
    // aviso visual cuando todo se paga completo
    if (d && (st.scan === "miss" || st.scan === "break") && i > 1) {
      t.call(() => { reqT.classList.remove("is-alert"); void reqT.offsetWidth; reqT.classList.add("is-alert"); }, [], 0.9);
    }

    // ---------- reloj del caché y costo ----------
    const ring = root.querySelector(".cx-ttl .fg") as SVGCircleElement;
    const C = 2 * Math.PI * 27;
    ring.style.strokeDasharray = String(C);
    t.to(ring, { strokeDashoffset: C * (1 - st.ttl), duration: st.ttl === 0 ? 2.6 : 0.6, ease: st.ttl === 0 ? "none" : "power2.out" }, st.ttl === 0 ? 0.3 * d : writeDelay);
    root.querySelector(".cx-ttl-l")!.textContent =
      st.cacheState === "expired" ? "Caché expirado" : st.cacheState === "empty" ? "Caché vacío" : "Caché activo · 5 min";
    root.classList.toggle("ttl-out", st.cacheState === "expired");

    const total = tokens(st.req);
    const read = Math.min(hitEnd, total);
    const write = total - read;
    const ratio = total ? (read * 0.05 + write * 1.25) / total : 0;
    const pctEl = root.querySelector(".cx-pct") as HTMLElement;
    const shown = { v: parseFloat(pctEl.dataset.v || "0") };
    if (st.scan === "none") {
      pctEl.textContent = "–"; pctEl.dataset.v = "0";
      gsap.set(root.querySelectorAll(".cx-split i"), { width: "0%" });
      root.classList.remove("is-cheap", "is-costly");
    } else {
      t.to(shown, {
        v: ratio * 100, duration: 0.9 * d, ease: "power2.out",
        onUpdate: () => { pctEl.textContent = total ? Math.round(shown.v) + "%" : "–"; pctEl.dataset.v = String(shown.v); },
      }, 0.9 * d);
      t.to(root.querySelector(".cx-split .r"), { width: total ? (read / total) * 100 + "%" : "0%", duration: 0.9 * d, ease: "power2.out" }, 0.9 * d);
      t.to(root.querySelector(".cx-split .w"), { width: total ? (write / total) * 100 + "%" : "0%", duration: 0.9 * d, ease: "power2.out" }, 0.9 * d);
      root.classList.toggle("is-cheap", total > 0 && ratio < 0.5);
      root.classList.toggle("is-costly", total > 0 && ratio >= 1);
    }
    if (!d) t.progress(1);
  },
};

const fmt = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1).replace(".", ",") + "k" : String(n));

/** Mantiene en la pista un bloque por id, en orden. Devuelve los elementos y si son nuevos. */
function sync(track: HTMLElement, list: B[], key: string) {
  const have = new Map<string, HTMLElement>();
  track.querySelectorAll<HTMLElement>(".cx-b").forEach((el) => have.set(el.dataset.id!, el));
  const keep = new Set(list.map((b) => b.id));
  have.forEach((el, id) => { if (!keep.has(id)) el.remove(); });
  return list.map((b) => {
    let el = have.get(b.id);
    const isNew = !el;
    if (!el) {
      el = document.createElement("div");
      el.className = `cx-b k-${b.kind}`;
      el.dataset.id = b.id;
      el.innerHTML = `<span>${b.label}</span>`;
      el.setAttribute("data-track", key);
    }
    track.appendChild(el); // asegura el orden
    return { el, b, isNew };
  });
}
