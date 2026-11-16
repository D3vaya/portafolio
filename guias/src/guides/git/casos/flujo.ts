/*
  Fábrica de animaciones a partir de datos. Las vistas «Problemas» y «Estrategias» tienen muchos
  flujos parecidos (un grafo que cambia y el comando de cada paso), así que en vez de una escena
  escrita a mano por flujo, cada uno es un objeto `Flujo` y `escenaDe` lo convierte en una Escena
  con el mismo vocabulario visual que el resto de la guía (anim/_kit).

  Un paso puede traer:
  - g: el grafo completo de ese paso (render declarativo, se anima la diferencia).
  - cmd / out: el comando que se ve en la consola y su salida (HTML permitido en out).
  - nota: un panel de texto (HTML) para pasos que no cambian el grafo (configuración, avisos).
  Si un paso no trae g, se mantiene el último grafo.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { grafo, consola, cerrar, type Grafo } from "../anim/_kit";
import "./flujo.css";

export type PasoFlujo = {
  title: string;
  text: string;
  cmd?: string;
  out?: string;
  g?: Grafo;
  nota?: string;
  ms?: number;
};
export type Flujo = {
  title: string;
  cols?: number;
  rows?: number;
  pasos: PasoFlujo[];
};

const LEYENDA: [string, string, (g: Grafo) => boolean][] = [
  ["l-head", "HEAD → rama actual", (g) => !!g.head && !!g.refs?.some((r) => r.name === g.head)],
  ["l-branch", "otra rama", (g) => !!g.refs?.some((r) => (r.kind ?? "branch") === "branch" && r.name !== g.head)],
  ["l-remote", "remota (origin/…)", (g) => !!g.refs?.some((r) => r.kind === "remote")],
  ["l-tag", "tag de versión", (g) => !!g.refs?.some((r) => r.kind === "tag")],
  ["l-new", "commit nuevo", (g) => g.nodes.some((n) => n.tone === "new")],
  ["l-copy", "copia (rebase o cherry-pick)", (g) => g.nodes.some((n) => n.tone === "copy")],
  ["l-ok", "verificado", (g) => g.nodes.some((n) => n.tone === "ok")],
  ["l-conflict", "conflicto o error", (g) => g.nodes.some((n) => n.tone === "conflict")],
  ["l-ghost", "sin rama que lo apunte", (g) => g.nodes.some((n) => n.tone === "ghost")],
];

const MAX_X = 4.2;

export function escenaDe(f: Flujo): Escena {
  let root: HTMLElement;
  let tl: gsap.core.Timeline | null = null;
  let g: ReturnType<typeof grafo> | null = null;
  let term: ReturnType<typeof consola>;
  let nota: HTMLElement | null = null;

  // grafo vigente en cada paso (hereda el anterior si el paso no trae uno)
  const grafos: (Grafo | undefined)[] = [];
  f.pasos.forEach((p, i) => (grafos[i] = p.g ?? grafos[i - 1]));
  // A 390 px el SVG mide ~324 px: con más de ~4,2 columnas el texto bajaría de 12 px reales.
  // Si el flujo es más ancho, se juntan las columnas (los commits quedan más cerca, el texto no se achica).
  const todos = f.pasos.flatMap((p) => (p.g ? p.g.nodes : []));
  const maxX = Math.max(0, ...todos.map((n) => n.x));
  // un mensaje bajo un commit de la última columna necesita media columna más a la derecha
  const pad = todos.some((n) => n.x === maxX && n.msg) ? 0.5 : 0;
  const k = maxX > MAX_X - pad ? (MAX_X - pad) / maxX : 1;
  const escalados = new Map<Grafo, Grafo>();
  const escala = (G?: Grafo) => {
    if (!G || k === 1) return G;
    if (!escalados.has(G)) escalados.set(G, { ...G, nodes: G.nodes.map((n) => ({ ...n, x: n.x * k })) });
    return escalados.get(G);
  };
  grafos.forEach((G, i) => (grafos[i] = escala(G)));
  const usaGrafo = grafos.some(Boolean);
  const usaNota = f.pasos.some((p) => p.nota);

  return {
    title: f.title,
    steps: f.pasos.map((p) => ({ title: p.title, text: p.text, ms: p.ms ?? Math.min(9000, Math.max(6000, 3200 + p.text.length * 32)) })),

    setup(stage) {
      root = stage;
      stage.classList.add("fl");
      term = consola(stage);
      if (usaGrafo) {
        const box = document.createElement("div");
        box.className = "fl-graph";
        stage.appendChild(box);
        g = grafo(box, { cols: maxX * k + 1 + pad, rows: f.rows ?? 2 });
      }
      if (usaNota) {
        nota = document.createElement("div");
        nota.className = "fl-nota";
        stage.appendChild(nota);
      }
      const usados = LEYENDA.filter(([, , t]) => grafos.some((x) => x && t(x)));
      if (usados.length) {
        const leg = document.createElement("div");
        leg.className = "gk-legend";
        leg.innerHTML = usados.map(([cls, txt]) => `<span><i class="${cls}"></i>${txt}</span>`).join("");
        stage.appendChild(leg);
      }
    },

    go(i, instant) {
      cerrar(root, tl);
      const p = f.pasos[i];
      const t = (tl = instant ? null : gsap.timeline());
      const d = term.show(p.cmd ?? "", t, 0, p.out ?? "");
      const G = grafos[i];
      if (g && G) g.render(G, t, instant ? 0 : d);
      if (nota) {
        nota.innerHTML = p.nota ?? "";
        nota.classList.toggle("is-empty", !p.nota);
        if (t && p.nota) t.fromTo(nota, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.4 }, d);
        else gsap.set(nota, { opacity: 1, y: 0 });
      }
    },
  };
}
