/*
  Animación: el advisor. El modelo principal trabaja (cada marca es una llamada a una herramienta)
  y en momentos clave le envía la conversación completa a un modelo más capaz, que devuelve un
  consejo. Se ve quién decide, qué viaja en cada sentido y cuánto cuesta cada consulta.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";

type Tick = "ok" | "err" | "ask";
type Estado = {
  ticks: Tick[];
  adv: "idle" | "reading" | "advised" | "reviewed";
  send?: boolean; // viaja la conversación al advisor
  advice?: string; // vuelve un consejo
  execTok: number; // tokens del principal (miles)
  advTok: number; // tokens leídos por el advisor (miles)
};

const T = (s: string) => s.split("").map((c) => (c === "x" ? "err" : c === "?" ? "ask" : "ok")) as Tick[];

const ESTADOS: Estado[] = [
  { ticks: [], adv: "idle", execTok: 0, advTok: 0 },
  { ticks: T("ooo"), adv: "idle", execTok: 18, advTok: 0 },
  { ticks: T("ooo?"), adv: "reading", send: true, execTok: 20, advTok: 0 },
  { ticks: T("ooo?"), adv: "advised", advice: "Migra primero los tests del módulo de pagos; el refactor del modelo rompe tres llamadas que nadie cubre.", execTok: 20, advTok: 20 },
  { ticks: T("ooo?oooox"), adv: "advised", execTok: 44, advTok: 20 },
  { ticks: T("ooo?ooooxx?"), adv: "advised", send: true, advice: "Los dos fallos vienen del mismo mock desactualizado. Actualízalo antes de tocar más código.", execTok: 50, advTok: 70 },
  { ticks: T("ooo?ooooxx?ooooo?"), adv: "reviewed", send: true, advice: "Revisado: los cambios cumplen lo pedido y los tests pasan.", execTok: 74, advTok: 144 },
  { ticks: T("ooo?ooooxx?ooooo?"), adv: "reviewed", execTok: 74, advTok: 144 },
];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;

export const advisor: Escena = {
  title: "Un segundo modelo que revisa las decisiones clave",
  steps: [
    { title: "Dos modelos, dos papeles", text: "El <b>principal</b> (aquí, Sonnet) hace el trabajo: lee, edita y corre comandos. El <b>advisor</b> (aquí, Opus) no toca nada: solo da consejos cuando el principal se los pide.", ms: 4800 },
    { title: "El principal trabaja solo", text: "Cada marca es una llamada a una herramienta. La mayor parte de una tarea es rutina, y para eso basta el modelo más rápido y barato.", ms: 4400 },
    { title: "Momento clave: elegir un enfoque", text: "Antes de decidir cómo resolverla, el principal llama al advisor. Le envía <b>la conversación completa</b>: tu pedido, los archivos leídos y los resultados de cada herramienta.", ms: 5600 },
    { title: "El advisor lee y aconseja", text: "Opus revisa todo y devuelve un consejo. El principal lo lee y sigue trabajando; si su propia evidencia lo contradice, lo dice.", ms: 6000 },
    { title: "Vuelve la rutina", text: "Con el plan claro, el principal sigue solo. Aparece un error: todavía no hace falta consultar.", ms: 4400 },
    { title: "Un error que se repite", text: "Cuando el mismo problema aparece dos veces, el principal vuelve a consultar. El advisor relee la conversación, ahora más larga, y encuentra la causa común.", ms: 6000 },
    { title: "Antes de terminar: revisión", text: "Antes de dar la tarea por terminada, una última consulta para verificar. En la terminal verás <code>Advising</code> y luego <code>Reviewed</code>; <kbd class=\"k\">Ctrl</kbd>+<kbd class=\"k\">O</kbd> muestra el consejo.", ms: 6000 },
    { title: "Cuánto cuesta", text: "El advisor trabaja poco, pero <b>cada consulta relee toda la conversación</b>, sin caché entre consultas, a la tarifa del modelo más caro. Úsalo en tareas largas donde un mal plan cuesta más que tres consultas.", ms: 6500 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("ad");
    stage.innerHTML = `
      <div class="ad-board">
        <div class="ad-chip ad-exec"><span class="ad-role">Principal</span><b>Sonnet</b><span class="ad-st">trabajando</span></div>
        <div class="ad-wire"><i class="ad-pk ad-pk-out"><span>conversación completa</span></i><i class="ad-pk ad-pk-in"><span>consejo</span></i></div>
        <div class="ad-chip ad-adv"><span class="ad-role">Advisor</span><b>Opus</b><span class="ad-st">en espera</span></div>
      </div>
      <div class="ad-lane"><span class="ad-lane-l">Llamadas a herramientas</span><div class="ad-ticks"></div></div>
      <div class="ad-advice"><span class="ad-advice-l">Consejo</span><p></p></div>
      <div class="ad-cost">
        <div class="ad-bar"><span>Tokens del principal</span><b class="e"><i></i></b><em class="ev"></em></div>
        <div class="ad-bar"><span>Tokens leídos por el advisor</span><b class="a"><i></i></b><em class="av"></em></div>
      </div>`;
  },

  go(i, instant) {
    const st = ESTADOS[i];
    if (tl && tl.progress() < 1) tl.progress(1);
    gsap.getTweensOf(root.querySelectorAll("*")).forEach((tw) => tw.progress(1).kill());
    const d = instant ? 0 : 1;
    const t = (tl = gsap.timeline());
    const q = (s: string) => root.querySelector(s) as HTMLElement;

    // ---------- marcas de herramientas ----------
    const lane = q(".ad-ticks");
    const have = lane.children.length;
    while (lane.children.length > st.ticks.length) lane.lastElementChild!.remove();
    st.ticks.forEach((k, n) => {
      let el = lane.children[n] as HTMLElement | undefined;
      if (!el) {
        el = document.createElement("i");
        lane.appendChild(el);
        if (d) t.fromTo(el, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(3)" }, 0.18 * (n - have));
      }
      el.className = "t-" + k;
    });
    const newTicks = Math.max(0, st.ticks.length - have);
    const afterTicks = d ? 0.18 * newTicks + 0.2 : 0;

    // ---------- chips ----------
    const exec = q(".ad-exec"), adv = q(".ad-adv");
    exec.classList.toggle("is-waiting", !!st.send);
    exec.querySelector(".ad-st")!.textContent = st.send ? "esperando consejo" : st.ticks.length ? "trabajando" : "listo";
    adv.classList.remove("is-reading", "is-done");
    const advSt = adv.querySelector(".ad-st")!;
    advSt.textContent = st.adv === "idle" ? "en espera" : st.adv === "reading" ? "leyendo…" : st.adv === "reviewed" ? "Reviewed ✓" : "aconsejó";

    // ---------- viaje de ida y vuelta ----------
    const out = q(".ad-pk-out"), back = q(".ad-pk-in");
    gsap.set([out, back], { opacity: 0, left: "0%" });
    if (st.send && d) {
      t.set(out, { opacity: 1, left: "0%" }, afterTicks);
      t.to(out, { left: "100%", duration: 1.1, ease: "power2.inOut" }, afterTicks);
      t.set(out, { opacity: 0 }, afterTicks + 1.15);
      t.call(() => adv.classList.add("is-reading"), [], afterTicks + 1.05);
      if (st.advice) {
        t.call(() => { adv.classList.remove("is-reading"); adv.classList.add("is-done"); }, [], afterTicks + 2.3);
        t.set(back, { opacity: 1, left: "100%" }, afterTicks + 2.3);
        t.to(back, { left: "0%", duration: 1.0, ease: "power2.inOut" }, afterTicks + 2.3);
        t.set(back, { opacity: 0 }, afterTicks + 3.35);
      }
    } else if (st.adv === "reading") {
      adv.classList.add("is-reading");
    } else if (st.adv !== "idle") {
      adv.classList.add("is-done");
    }
    if (st.adv === "reading" && d) t.call(() => adv.classList.add("is-reading"), [], afterTicks + 1.05);

    // ---------- consejo ----------
    const box = q(".ad-advice"), p = box.querySelector("p")!;
    if (st.advice) {
      const at = st.send && d ? afterTicks + 3.3 : 0;
      t.call(() => { p.textContent = st.advice!; box.classList.add("on"); box.classList.toggle("ok", st.adv === "reviewed"); }, [], at);
      if (d) t.fromTo(box, { y: 10, opacity: 0.3 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, at);
    } else if (i <= 2) {
      box.classList.remove("on", "ok");
      p.textContent = "";
    }

    // ---------- costo ----------
    const max = 150;
    const eb = q(".ad-cost .e i"), ab = q(".ad-cost .a i");
    const at = st.send && d ? afterTicks + 1.1 : afterTicks;
    t.to(eb, { width: (st.execTok / max) * 100 + "%", duration: 0.8 * d, ease: "power2.out" }, at);
    t.to(ab, { width: (st.advTok / max) * 100 + "%", duration: 0.8 * d, ease: "power2.out" }, at);
    t.call(() => { q(".ev").textContent = st.execTok ? st.execTok + "k" : ""; q(".av").textContent = st.advTok ? st.advTok + "k" : ""; }, [], at + 0.8 * d);
    root.classList.toggle("show-cost", i >= 7);
    if (!d) t.progress(1);
  },
};
