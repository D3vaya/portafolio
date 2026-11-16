/*
  Portada de la guía de Git: un grafo que se arma solo, en bucle. Una rama nace, avanza, main
  también avanza, y la rama vuelve con un merge. Sin controles: es la figura 1 de la portada.
*/
import { gsap } from "gsap";
import { grafo, consola, c, type Grafo } from "./anim/_kit";

const A = c("A", 0, 0), B = c("B", 1, 0, "A"), C = c("C", 2, 0, "B");
const D = c("D", 2, 1, "B"), E = c("E", 3, 1, "D"), F = c("F", 3, 0, "C"), M = c("M", 4, 0, ["F", "E"]);
const PASOS: [string, Grafo][] = [
  ['git commit -m "crea la tienda"', { nodes: [A, B], refs: [{ name: "main", at: "B" }], head: "main" }],
  ["git switch -c carrito", { nodes: [A, B], refs: [{ name: "main", at: "B" }, { name: "carrito", at: "B" }], head: "carrito" }],
  ['git commit -m "agrega carrito"', { nodes: [A, B, { ...D, tone: "new" }], refs: [{ name: "main", at: "B" }, { name: "carrito", at: "D" }], head: "carrito" }],
  ['git commit -m "calcula total"', { nodes: [A, B, D, { ...E, tone: "new" }], refs: [{ name: "main", at: "B" }, { name: "carrito", at: "E" }], head: "carrito" }],
  ["git switch main", { nodes: [A, B, D, E], refs: [{ name: "main", at: "B" }, { name: "carrito", at: "E" }], head: "main" }],
  ['git commit -m "corrige portada"', { nodes: [A, B, { ...C, tone: "new" }, D, E], refs: [{ name: "main", at: "C" }, { name: "carrito", at: "E" }], head: "main" }],
  ['git commit -m "agrega footer"', { nodes: [A, B, C, D, E, { ...F, tone: "new" }], refs: [{ name: "main", at: "F" }, { name: "carrito", at: "E" }], head: "main" }],
  ["git merge carrito", { nodes: [A, B, C, D, E, F, { ...M, tone: "ok" }], refs: [{ name: "main", at: "M" }, { name: "carrito", at: "E" }], head: "main" }],
];

const host = document.getElementById("gitHero");
if (host) {
  const term = consola(host);
  const box = document.createElement("div");
  box.className = "gh-graph";
  host.appendChild(box);
  let g = grafo(box, { cols: 5, rows: 2, bottom: 64 });
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    term.show(PASOS[7][0], null);
    g.render(PASOS[7][1], null);
  } else {
    let i = 0;
    let visible = true;
    new IntersectionObserver((es) => (visible = es[0].isIntersecting)).observe(host);
    const tick = () => {
      if (!visible || document.hidden) return gsap.delayedCall(1, tick);
      if (i === PASOS.length) {
        // reinicia: el grafo se desvanece y vuelve a empezar
        gsap.to(box, { opacity: 0, duration: 0.4, onComplete: () => { box.innerHTML = ""; g = grafo(box, { cols: 5, rows: 2, bottom: 64 }); gsap.set(box, { opacity: 1 }); i = 0; tick(); } });
        return;
      }
      const [cmd, G] = PASOS[i];
      const tl = gsap.timeline();
      const d = term.show(cmd, tl, 0);
      g.render(G, tl, d);
      i++;
      gsap.delayedCall(i === PASOS.length ? 4.5 : 2.4, tick);
    };
    tick();
  }
}
