/*
  Kit común de las animaciones de Git: dibuja grafos de commits, ramas, HEAD y una consola.

  Todas las escenas de Git usan el mismo vocabulario visual, para que el lector aprenda a leerlo una
  vez y lo reconozca en todas partes:

  - Commit: círculo con su nombre corto (A, B, C… o un hash). Lo más viejo a la izquierda.
  - Línea entre commits: "este commit viene de aquel" (apunta a su padre).
  - Rama: etiqueta pegada a un commit. Naranja con "HEAD →" si es la rama actual; lila si es otra
    rama local; gris con contorno si es remota (origin/…); blanca si es un tag.
  - HEAD separado (detached): etiqueta ámbar "HEAD" pegada directo al commit.
  - Tonos de commit: "new" (recién creado, naranja), "ghost" (ya no lo apunta nada, punteado),
    "copy" (copia hecha por rebase o cherry-pick, lila), "conflict" (rojo), "ok" (verde), "dim".

  Uso (declarativo): cada paso describe el grafo completo y `render` anima la diferencia.

    const g = grafo(host, { cols: 6, rows: 2 });
    g.render({ nodes: [{ id: "A", x: 0, y: 0 }, { id: "B", x: 1, y: 0, p: ["A"] }],
               refs: [{ name: "main", at: "B" }], head: "main" }, tl, 0);

  Con `tl` null todo se aplica sin animar (saltos de paso y movimiento reducido).
*/
import { gsap } from "gsap";
import "./_kit.css";

export type Tono = "new" | "ghost" | "copy" | "conflict" | "ok" | "dim" | "hl";
export type Nodo = {
  id: string;
  /** Columna (0 = la más vieja) y carril (0 = arriba). Admiten decimales. */
  x: number;
  y: number;
  /** Padres: el primero es el principal; dos padres = commit de merge. */
  p?: string[];
  /** Texto dentro del círculo; por defecto el id. */
  label?: string;
  tone?: Tono;
  /** Texto corto bajo el commit (mensaje). */
  msg?: string;
};
export type Ref = {
  name: string;
  at: string;
  kind?: "branch" | "remote" | "tag";
  /** Dónde se apilan las etiquetas: arriba (por defecto en el carril 0) o abajo. */
  side?: "up" | "down";
};
export type Grafo = {
  nodes: Nodo[];
  refs?: Ref[];
  /** Nombre de rama (HEAD → rama) o id de commit (HEAD separado). */
  head?: string;
};

type Pos = { x: number; y: number; o: number; s: number };
const NS = "http://www.w3.org/2000/svg";
const mk = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}) => {
  const el = document.createElementNS(NS, tag);
  for (const k in attrs) el.setAttribute(k, String(attrs[k]));
  return el;
};

export const CW = 74; // ancho de columna
export const RH = 78; // alto de carril
const R = 16; // radio del commit
const PAD = 26;
const TOP = 66; // espacio para las etiquetas del carril 0
const CH = 8.2; // ancho aproximado de un carácter de la etiqueta (mono 13.5px)

export function grafo(host: HTMLElement, opts: { cols: number; rows: number; bottom?: number; className?: string }) {
  const W = PAD * 2 + (opts.cols - 1) * CW;
  const H = TOP + (opts.rows - 1) * RH + (opts.bottom ?? 58);
  const svg = mk("svg", { viewBox: `0 0 ${W} ${H}`, class: "gk-svg " + (opts.className || ""), role: "img" });
  const gEdges = mk("g", { class: "gk-edges" });
  const gNodes = mk("g", { class: "gk-nodes" });
  const gRefs = mk("g", { class: "gk-refs" });
  svg.append(gEdges, gNodes, gRefs);
  // tamaño natural ×1.3 como máximo: en escritorio no se agranda de más, en móvil se encoge
  svg.style.maxWidth = Math.round(W * 1.3) + "px";
  host.appendChild(svg);

  const px = (x: number) => PAD + x * CW;
  const py = (y: number) => TOP + y * RH;

  const nodes = new Map<string, { el: SVGGElement; pos: Pos; data: Nodo }>();
  const edges = new Map<string, { el: SVGPathElement; from: string; to: string }>();
  const refs = new Map<string, { el: SVGGElement; pos: Pos; w: number }>();

  function edgePath(a: Pos, b: Pos) {
    // a = hijo (derecha), b = padre (izquierda)
    if (Math.abs(a.y - b.y) < 0.5) return `M${a.x - R},${a.y} L${b.x + R},${b.y}`;
    const mx = Math.max(b.x + R + 6, a.x - CW * 0.62);
    return `M${a.x - R},${a.y} C${mx - 10},${a.y} ${b.x + 22},${b.y} ${b.x + R - 2},${b.y + (a.y > b.y ? 7 : -7)}`;
  }

  function draw() {
    nodes.forEach((n) => {
      n.el.setAttribute("transform", `translate(${n.pos.x},${n.pos.y}) scale(${n.pos.s})`);
      n.el.style.opacity = String(n.pos.o);
    });
    edges.forEach((e) => {
      const a = nodes.get(e.from), b = nodes.get(e.to);
      if (!a || !b) return;
      e.el.setAttribute("d", edgePath(a.pos, b.pos));
      e.el.style.opacity = String(Math.min(a.pos.o, b.pos.o));
    });
    refs.forEach((r) => {
      r.el.setAttribute("transform", `translate(${r.pos.x},${r.pos.y}) scale(${r.pos.s})`);
      r.el.style.opacity = String(r.pos.o);
    });
  }

  function tween(pos: Pos, to: Partial<Pos>, tl: gsap.core.Timeline | null, at: number, dur = 0.7, ease = "power3.inOut") {
    if (!tl) { Object.assign(pos, to); return; }
    tl.to(pos, { ...to, duration: dur, ease, onUpdate: draw }, at);
  }

  function nodeEl(n: Nodo) {
    const g = mk("g", { class: "gk-node" });
    g.append(mk("circle", { r: R, class: "gk-c" }), mk("text", { class: "gk-l", y: 5 }));
    const m = mk("text", { class: "gk-msg", y: R + 17 });
    g.appendChild(m);
    gNodes.appendChild(g);
    return g;
  }

  function refEl(name: string) {
    const g = mk("g", { class: "gk-ref" });
    g.append(mk("rect", { rx: 5, height: 23, y: -11.5 }), mk("text", { y: 4.3 }));
    gRefs.appendChild(g);
    return g;
  }

  /** Lleva el dibujo al grafo `G`. Las animaciones se agregan a `tl` desde `at`. */
  function render(G: Grafo, tl: gsap.core.Timeline | null, at = 0) {
    const want = new Map(G.nodes.map((n) => [n.id, n]));

    // ---------- commits ----------
    nodes.forEach((n, id) => {
      if (want.has(id)) return;
      if (tl) tl.to(n.pos, { o: 0, s: 0.6, duration: 0.35, onUpdate: draw, onComplete: () => { n.el.remove(); nodes.delete(id); draw(); } }, at);
      else { n.el.remove(); nodes.delete(id); }
    });
    G.nodes.forEach((n, k) => {
      let cur = nodes.get(n.id);
      const tx = px(n.x), ty = py(n.y);
      if (!cur) {
        // nace desde su padre: se ve que "sale" de él
        const parent = n.p && nodes.get(n.p[0]);
        const from: Pos = parent ? { ...parent.pos, o: 0, s: 0.4 } : { x: tx, y: ty, o: 0, s: 0.4 };
        cur = { el: nodeEl(n), pos: from, data: n };
        nodes.set(n.id, cur);
        tween(cur.pos, { x: tx, y: ty, o: 1, s: 1 }, tl, at + 0.12 * Math.min(k, 0), 0.65, "back.out(1.6)");
      } else {
        tween(cur.pos, { x: tx, y: ty, o: 1, s: 1 }, tl, at);
      }
      cur.data = n;
      const el = cur.el;
      el.setAttribute("class", "gk-node" + (n.tone ? " t-" + n.tone : ""));
      (el.querySelector(".gk-l") as SVGTextElement).textContent = n.label ?? n.id;
      (el.querySelector(".gk-msg") as SVGTextElement).textContent = n.msg ?? "";
    });

    // ---------- líneas hijo → padre ----------
    const wantE = new Set<string>();
    G.nodes.forEach((n) => (n.p || []).forEach((p, k) => {
      const key = n.id + ">" + p;
      wantE.add(key);
      if (!edges.has(key)) {
        const el = mk("path", { class: "gk-e" + (k ? " is-merge" : "") });
        gEdges.appendChild(el);
        edges.set(key, { el, from: n.id, to: p });
      }
      const e = edges.get(key)!;
      const ghost = n.tone === "ghost";
      e.el.classList.toggle("is-ghost", ghost);
    }));
    edges.forEach((e, key) => { if (!wantE.has(key)) { e.el.remove(); edges.delete(key); } });

    // ---------- ramas, tags y HEAD ----------
    const list: (Ref & { label: string; cls: string })[] = (G.refs || []).map((r) => {
      const isHead = r.kind !== "tag" && r.kind !== "remote" && G.head === r.name;
      return { ...r, label: (isHead ? "HEAD → " : "") + r.name, cls: "k-" + (r.kind || "branch") + (isHead ? " is-head" : "") };
    });
    if (G.head && want.has(G.head)) list.push({ name: "HEAD", at: G.head, label: "HEAD", cls: "k-detached" });

    const stack = new Map<string, number>();
    const wantR = new Set<string>();
    list.forEach((r) => {
      const n = want.get(r.at);
      if (!n) return;
      wantR.add(r.name);
      const side = r.side || (n.y === 0 ? "up" : "down");
      const key = r.at + side;
      const k = stack.get(key) || 0;
      stack.set(key, k + 1);
      const w = Math.round(r.label.length * CH + 16);
      // centrada sobre su commit, pero sin salirse del dibujo: en la última columna se corre a la izquierda
      const tx = Math.max(w / 2 + 1, Math.min(W - w / 2 - 1, px(n.x)));
      const ty = side === "up" ? py(n.y) - R - 20 - k * 25 : py(n.y) + R + 20 + k * 25 + (n.msg ? 16 : 0);
      let cur = refs.get(r.name);
      if (!cur) {
        cur = { el: refEl(r.name), pos: { x: tx, y: ty, o: 0, s: 0.7 }, w };
        refs.set(r.name, cur);
        tween(cur.pos, { o: 1, s: 1 }, tl, at + 0.25, 0.45, "back.out(2)");
      } else {
        tween(cur.pos, { x: tx, y: ty, o: 1, s: 1 }, tl, at + 0.1, 0.8);
      }
      cur.w = w;
      cur.el.setAttribute("class", "gk-ref " + r.cls);
      const rect = cur.el.querySelector("rect")!;
      rect.setAttribute("width", String(w));
      rect.setAttribute("x", String(-w / 2));
      const txt = cur.el.querySelector("text")!;
      txt.textContent = r.label;
    });
    refs.forEach((r, name) => {
      if (wantR.has(name)) return;
      if (tl) tl.to(r.pos, { o: 0, s: 0.7, duration: 0.3, onUpdate: draw, onComplete: () => { r.el.remove(); refs.delete(name); } }, at);
      else { r.el.remove(); refs.delete(name); }
    });

    draw();
  }

  /** Posición en píxeles del viewBox de un commit (para dibujar encima: flechas, rótulos). */
  const at = (id: string) => { const n = nodes.get(id); return n ? { x: n.pos.x, y: n.pos.y } : null; };

  return { svg, render, draw, px, py, at, W, H };
}

/* ---------- consola: muestra el comando del paso ---------- */
export function consola(host: HTMLElement) {
  const el = document.createElement("div");
  el.className = "gk-term";
  el.innerHTML = `<span class="gk-ps">$</span><span class="gk-cmd"></span><span class="gk-cur"></span><div class="gk-out"></div>`;
  host.appendChild(el);
  const cmd = el.querySelector(".gk-cmd") as HTMLElement;
  const out = el.querySelector(".gk-out") as HTMLElement;
  return {
    el,
    /** Escribe `text` letra a letra en `tl` (o de golpe sin tl). `salida` aparece después. */
    show(text: string, tl: gsap.core.Timeline | null, at = 0, salida = "") {
      el.classList.toggle("is-empty", !text);
      if (!tl) { cmd.textContent = text; out.innerHTML = salida; out.style.opacity = salida ? "1" : "0"; return 0; }
      const o = { n: 0 };
      cmd.textContent = "";
      out.innerHTML = salida;
      gsap.set(out, { opacity: 0 });
      const dur = Math.min(1.1, text.length * 0.035);
      tl.to(o, { n: text.length, duration: dur, ease: "none", onUpdate: () => { cmd.textContent = text.slice(0, Math.round(o.n)); } }, at);
      if (salida) tl.to(out, { opacity: 1, duration: 0.3 }, at + dur + 0.15);
      return dur + 0.2;
    },
  };
}

/* ---------- utilidades para las escenas ---------- */
/** Completa animaciones pendientes antes de ir a otro paso (regla técnica 2 de DESIGN.md). */
export function cerrar(root: HTMLElement, tl: gsap.core.Timeline | null) {
  if (tl && tl.progress() < 1) tl.progress(1);
  gsap.getTweensOf(root.querySelectorAll("*")).forEach((tw) => tw.progress(1).kill());
}

/** Atajo para crear un commit en línea: c("B", 1, 0, "A"). */
export const c = (id: string, x: number, y: number, p?: string | string[], extra: Partial<Nodo> = {}): Nodo => ({
  id, x, y, p: p ? (Array.isArray(p) ? p : [p]) : undefined, ...extra,
});
