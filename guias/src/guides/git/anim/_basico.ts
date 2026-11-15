/*
  Utilidades de movimiento para las escenas de Git hechas con DOM (áreas, carpetas, objetos).

  Cada paso vuelve a dibujar su tablero entero (declarativo) y estas funciones animan la diferencia:

  - Todo elemento con `data-k="clave"` se reconoce entre pasos. Si cambió de lugar, se desliza desde
    donde estaba (FLIP); si es nuevo, aparece; si ya no está, se desvanece en su lugar anterior.
  - `data-sig` describe su estado (p. ej. "mod"): si cambia a un valor no vacío, el elemento destella.
  - `data-d` (segundos) retrasa su animación, para que llegue después de algo que viaja hacia él.
  - `volar` lleva una copia de un elemento hasta otro (un archivo que pasa al staging, a un commit…).

  Uso:  const antes = foto(tablero); tablero.innerHTML = …; volar(…); mover(tablero, antes, tl, at);
  Con `tl` null no anima nada: el DOM nuevo ya es el estado final.
*/
import { gsap } from "gsap";
import "./_basico.css";

type Foto = Map<string, { r: DOMRect; sig: string; el: HTMLElement }>;
type TL = gsap.core.Timeline | null;

const ancestro = (el: HTMLElement) => el.parentElement?.closest<HTMLElement>("[data-k]") ?? null;

/** Guarda posición y estado de cada `[data-k]` antes de redibujar. */
export function foto(root: HTMLElement): Foto {
  const m: Foto = new Map();
  root.querySelectorAll<HTMLElement>("[data-k]").forEach((el) =>
    m.set(el.dataset.k!, { r: el.getBoundingClientRect(), sig: el.dataset.sig ?? "", el }),
  );
  return m;
}

/** Borra restos de animaciones anteriores (copias en vuelo, salidas). */
export function limpiar(root: HTMLElement) {
  root.querySelectorAll(".bx-vuelo, .bx-salida").forEach((n) => n.remove());
}

/** Anima del estado `antes` al DOM actual de `root`. */
export function mover(root: HTMLElement, antes: Foto, tl: TL, at = 0) {
  if (!tl) return;
  const base = root.getBoundingClientRect();
  const ahora = new Map<string, HTMLElement>();
  root.querySelectorAll<HTMLElement>("[data-k]").forEach((el) => ahora.set(el.dataset.k!, el));

  const delta = new Map<string, { x: number; y: number }>();
  const nuevos = new Set<string>();
  ahora.forEach((el, k) => {
    const a = antes.get(k);
    if (!a) { nuevos.add(k); return; }
    const r = el.getBoundingClientRect();
    delta.set(k, { x: a.r.left - r.left, y: a.r.top - r.top });
  });

  ahora.forEach((el, k) => {
    const d0 = +(el.dataset.d || 0);
    const up = ancestro(el)?.dataset.k;
    if (nuevos.has(k)) {
      if (up && nuevos.has(up)) return; // ya aparece con su contenedor
      tl.from(el, { opacity: 0, y: 10, scale: 0.92, duration: 0.5, ease: "back.out(2)" }, at + d0);
      return;
    }
    const d = delta.get(k)!, pd = up ? delta.get(up) : undefined;
    const dx = d.x - (pd?.x || 0), dy = d.y - (pd?.y || 0);
    if (Math.abs(dx) > 1.5 || Math.abs(dy) > 1.5) tl.from(el, { x: dx, y: dy, duration: 0.8, ease: "power3.inOut" }, at + d0);
    const sig = el.dataset.sig ?? "";
    if (sig && sig !== antes.get(k)!.sig) {
      tl.fromTo(el, { boxShadow: "0 0 0 3px rgba(255,91,31,.9), 0 0 26px 2px rgba(255,91,31,.55)" },
        { boxShadow: "0 0 0 0px rgba(255,91,31,0), 0 0 0px 0px rgba(255,91,31,0)", duration: 1.2, ease: "power2.out", clearProps: "boxShadow" }, at + d0 + 0.15);
    }
  });

  // salidas: el nodo viejo vuelve un momento a su lugar y se desvanece
  const fuera = new Set([...antes.keys()].filter((k) => !ahora.has(k)));
  fuera.forEach((k) => {
    const a = antes.get(k)!;
    const up = ancestro(a.el)?.dataset.k;
    if ((up && fuera.has(up)) || a.el.isConnected || !a.r.width) return;
    const g = a.el;
    g.removeAttribute("data-k");
    g.querySelectorAll("[data-k]").forEach((n) => n.removeAttribute("data-k"));
    g.classList.add("bx-salida");
    Object.assign(g.style, {
      position: "absolute", left: a.r.left - base.left + "px", top: a.r.top - base.top + "px",
      width: a.r.width + "px", height: a.r.height + "px", margin: "0",
    });
    root.appendChild(g);
    tl.to(g, { opacity: 0, scale: 0.9, duration: 0.45, ease: "power2.in", onComplete: () => g.remove() }, at);
  });
}

/** Una copia de `html` viaja de `desde` a `hasta` (ambos dentro de `root`). Devuelve la duración. */
export function volar(root: HTMLElement, desde: HTMLElement | null, hasta: HTMLElement | null, html: string, tl: TL, at: number, dur = 0.9) {
  if (!tl || !desde || !hasta) return 0;
  const base = root.getBoundingClientRect();
  const a = desde.getBoundingClientRect(), b = hasta.getBoundingClientRect();
  const f = document.createElement("div");
  f.className = "bx-vuelo";
  f.innerHTML = html;
  root.appendChild(f);
  const w = f.offsetWidth, h = f.offsetHeight;
  const x0 = a.left - base.left + (a.width - w) / 2, y0 = a.top - base.top + (a.height - h) / 2;
  const x1 = b.left - base.left + (b.width - w) / 2, y1 = b.top - base.top + (b.height - h) / 2;
  gsap.set(f, { x: x0, y: y0, opacity: 0 });
  tl.set(f, { opacity: 1 }, at);
  tl.to(f, { x: x1, y: y1, duration: dur, ease: "power2.inOut" }, at);
  tl.to(f, { opacity: 0, scale: 0.8, duration: 0.25, onComplete: () => f.remove() }, at + dur);
  return dur;
}
