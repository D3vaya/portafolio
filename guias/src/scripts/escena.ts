/*
  Escena: animación explicativa paso a paso, compartida por todas las guías.

  Cada escena define sus pasos (título y texto) y una función `go(i, instant)` que lleva el
  dibujo al estado del paso i, animando el cambio. Este módulo pone el marco común:
  título, controles (anterior, reproducir/pausar, siguiente, repetir), puntos de progreso,
  avance automático cuando la escena entra en pantalla y respeto por "reducir movimiento".
*/
import { gsap } from "gsap";

export type Paso = { title: string; text: string; ms?: number };
export type Escena = {
  title: string;
  steps: Paso[];
  /** Dibuja el escenario dentro de `stage`. */
  setup: (stage: HTMLElement) => void;
  /** Lleva la escena al paso i. Con `instant` no anima (saltos y movimiento reducido). */
  go: (i: number, instant: boolean) => void;
};

const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export function montar(root: HTMLElement, escena: Escena) {
  root.classList.add("escena");
  root.innerHTML = `
    <div class="esc-head">
      <span class="esc-kind">Animación</span>
      <span class="esc-title"></span>
    </div>
    <div class="esc-stage"></div>
    <div class="esc-caption" aria-live="polite">
      <span class="esc-step"></span>
      <b class="esc-ct"></b>
      <p class="esc-cx"></p>
    </div>
    <div class="esc-ctrl">
      <button type="button" class="esc-btn" data-a="prev" aria-label="Paso anterior">
        <svg viewBox="0 0 20 20"><path d="M12.5 4.5 7 10l5.5 5.5"/></svg></button>
      <button type="button" class="esc-btn esc-play" data-a="play" aria-label="Reproducir">
        <svg class="i-play" viewBox="0 0 20 20"><path d="M7 4.5v11l8.5-5.5z"/></svg>
        <svg class="i-pause" viewBox="0 0 20 20"><path d="M7 4.5v11M13 4.5v11"/></svg></button>
      <button type="button" class="esc-btn" data-a="next" aria-label="Paso siguiente">
        <svg viewBox="0 0 20 20"><path d="M7.5 4.5 13 10l-5.5 5.5"/></svg></button>
      <div class="esc-dots" role="tablist"></div>
      <button type="button" class="esc-btn" data-a="restart" aria-label="Repetir desde el inicio">
        <svg viewBox="0 0 20 20"><path d="M4.5 10a5.5 5.5 0 1 0 1.8-4.1M4.5 4v3.5H8"/></svg></button>
    </div>`;

  const $ = (s: string) => root.querySelector(s) as HTMLElement;
  $(".esc-title").textContent = escena.title;
  const stage = $(".esc-stage");
  escena.setup(stage);

  const dots = $(".esc-dots");
  dots.innerHTML = escena.steps
    .map((s, i) => `<button type="button" role="tab" aria-label="Paso ${i + 1}: ${s.title}" data-i="${i}"><i></i></button>`)
    .join("");

  let cur = -1;
  let playing = false;
  let timer: gsap.core.Tween | null = null;

  function caption(i: number) {
    const s = escena.steps[i];
    $(".esc-step").textContent = `${i + 1} / ${escena.steps.length}`;
    $(".esc-ct").textContent = s.title;
    $(".esc-cx").innerHTML = s.text;
    gsap.fromTo($(".esc-caption"), { opacity: 0.25, y: 6 }, { opacity: 1, y: 0, duration: reduce() ? 0 : 0.45, ease: "power2.out", overwrite: true });
    dots.querySelectorAll("button").forEach((b, k) => {
      b.classList.toggle("on", k === i);
      b.classList.toggle("past", k < i);
      b.setAttribute("aria-selected", String(k === i));
    });
  }

  function show(i: number, instant = false) {
    i = Math.max(0, Math.min(escena.steps.length - 1, i));
    // Saltar más de un paso: pasa por los intermedios sin animar para llegar a un estado coherente.
    if (cur === -1 || i < cur || i > cur + 1) {
      for (let k = 0; k < i; k++) escena.go(k, true);
      instant = instant || reduce();
    }
    cur = i;
    escena.go(i, instant || reduce());
    caption(i);
    schedule();
  }

  function schedule() {
    timer?.kill();
    timer = null;
    if (!playing) return;
    if (cur >= escena.steps.length - 1) return setPlaying(false);
    const ms = escena.steps[cur].ms ?? 4600;
    timer = gsap.delayedCall(ms / 1000, () => show(cur + 1));
  }

  function setPlaying(p: boolean) {
    playing = p;
    root.classList.toggle("is-playing", p);
    const b = $(".esc-play");
    b.setAttribute("aria-label", p ? "Pausar" : "Reproducir");
    schedule();
  }

  root.addEventListener("click", (e) => {
    const t = (e.target as HTMLElement).closest("button");
    if (!t || !root.contains(t)) return;
    const a = t.dataset.a;
    if (t.dataset.i) { setPlaying(false); show(+t.dataset.i); return; }
    if (a === "prev") { setPlaying(false); show(cur - 1); }
    if (a === "next") { setPlaying(false); show(cur + 1); }
    if (a === "restart") { show(0); setPlaying(!reduce()); }
    if (a === "play") {
      if (!playing && cur >= escena.steps.length - 1) show(0);
      setPlaying(!playing);
    }
  });
  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { setPlaying(false); show(cur + 1); }
    if (e.key === "ArrowLeft") { setPlaying(false); show(cur - 1); }
  });

  show(0, true);

  // Arranca sola la primera vez que se ve, salvo con movimiento reducido.
  const io = new IntersectionObserver(
    (es) => {
      for (const en of es) {
        if (!en.isIntersecting) { if (playing) setPlaying(false); continue; }
        if (!root.dataset.started && !reduce()) { root.dataset.started = "1"; setPlaying(true); }
      }
    },
    { threshold: 0.55 },
  );
  io.observe(root);
}
