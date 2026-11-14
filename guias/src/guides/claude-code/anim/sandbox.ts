/*
  Animación: sandbox de Bash. El SO levanta un perímetro alrededor del proyecto: lo que corre
  adentro se aprueba solo; escribir afuera choca con el borde; leer llega a casi toda la máquina
  hasta que aplicas denyRead/allowRead; la red sale solo por un proxy que valida cada host
  contra network.allowedDomains. Al final, lo que el sandbox no cubre.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import "./sandbox.css";

type Act = "none" | "pass" | "block" | "read" | "deny" | "net-block" | "net-pass";
type Estado = {
  on: boolean; // perímetro activo
  tool?: string; // quién ejecuta (por defecto, Bash)
  cmd: string;
  act: Act;
  target?: string; // selector del destino
  res?: { c: "ok" | "bad" | "warn"; t: string };
  cfg: number; // nivel de configuración mostrado
  readAll?: boolean; // alcance de lectura: casi toda la máquina
  deny?: boolean; // receta denyRead/allowRead aplicada
  out?: boolean; // lo que no cubre
};

const ESTADOS: Estado[] = [
  { on: false, tool: "Tú, en Claude Code", cmd: "/sandbox", act: "none", cfg: 0 },
  { on: true, cmd: "npm test", act: "pass", target: ".sb-proj", res: { c: "ok", t: "✓ dentro del sandbox: se aprueba solo" }, cfg: 1 },
  { on: true, cmd: "echo hola > ~/notas.txt", act: "block", target: ".sb-f-notes", res: { c: "bad", t: "✕ escritura fuera del perímetro: bloqueada" }, cfg: 1 },
  { on: true, cmd: "cat ~/.ssh/config", act: "read", target: ".sb-f-ssh", res: { c: "warn", t: "lectura permitida por defecto" }, cfg: 1, readAll: true },
  { on: true, cmd: "cat ~/.ssh/config", act: "deny", target: ".sb-f-ssh", res: { c: "bad", t: "✕ denyRead: lectura bloqueada" }, cfg: 2, deny: true },
  { on: true, cmd: "curl https://github.com", act: "net-block", target: ".sb-d-gh", res: { c: "bad", t: "✕ github.com no está en la allowlist" }, cfg: 2, deny: true },
  { on: true, cmd: "curl https://github.com", act: "net-pass", target: ".sb-d-gh", res: { c: "ok", t: "✓ github.com está en la allowlist" }, cfg: 3, deny: true },
  { on: true, cmd: "", act: "none", cfg: 3, deny: true, out: true },
];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;

export const sandbox: Escena = {
  title: "Un perímetro que el sistema operativo impone a cada comando",
  steps: [
    { title: "Apagado por defecto", text: "Claude corre comandos de shell en tu máquina. El sandbox los encierra en un perímetro que impone el sistema operativo, pero viene apagado: lo activas con <code>/sandbox</code>.", ms: 7000 },
    { title: "Dentro del perímetro, sin preguntas", text: "Con el sandbox activo, un comando que trabaja dentro del proyecto se aprueba solo: la barrera la impone el SO, así que no hace falta aprobar uno por uno.", ms: 7500 },
    { title: "Escribir afuera choca con el borde", text: "La escritura llega al directorio de trabajo, al temp por usuario y a los directorios agregados. Escribir fuera se bloquea; para abrir más rutas usa <code>filesystem.allowWrite</code>.", ms: 8000 },
    { title: "Leer llega a casi toda la máquina", text: "Por defecto, la lectura alcanza casi toda la máquina, incluidos <code>~/.ssh</code> y tus credenciales. No es un fallo: es el punto de partida, y se ajusta con una regla.", ms: 8000 },
    { title: "La receta: denyRead y allowRead", text: "<code>\"denyRead\": [\"~/\"]</code> bloquea la lectura de tu home y <code>\"allowRead\": [\".\"]</code> vuelve a permitir el proyecto. Ahora <code>~/.ssh</code> queda fuera de alcance.", ms: 8500 },
    { title: "La red pasa por un proxy", text: "Los comandos no tienen salida directa: un proxy local revisa cada host contra tu allowlist, que empieza vacía. Sin entrada, la conexión se rechaza.", ms: 7500 },
    { title: "Agregas el dominio permitido", text: "Con <code>github.com</code> en <code>network.allowedDomains</code>, el proxy deja pasar la conexión. Cualquier otro host sigue bloqueado.", ms: 7000 },
    { title: "Lo que el sandbox no cubre", text: "Read, Edit, Write y WebFetch usan reglas de permiso; hooks, servidores MCP locales y tus comandos <code>!</code> quedan fuera. Para una barrera total, usa un contenedor o VM.", ms: 9000 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("sb");
    stage.innerHTML = `
      <div class="sb-console"><span class="sb-tool">Bash</span><code class="sb-cmd"></code><span class="sb-res"></span></div>
      <div class="sb-grid">
        <div class="sb-map">
          <div class="sb-net"><span class="sb-l">Internet</span>
            <span class="sb-chip sb-d-gh">github.com</span><span class="sb-chip sb-d-x">ejemplo.org</span></div>
          <div class="sb-machine"><span class="sb-l">Tu máquina</span>
            <div class="sb-reach"><span>Alcance de lectura por defecto: casi toda la máquina</span></div>
            <div class="sb-perim">
              <span class="sb-pl">Sandbox · lo impone el SO</span>
              <span class="sb-claude">Claude · Bash</span>
              <div class="sb-zones">
                <span class="sb-zone sb-proj"><b>proyecto/</b><em>directorio de trabajo</em></span>
                <span class="sb-zone sb-tmp"><b>temp</b><em>por usuario</em></span>
              </div>
              <span class="sb-allowr">allowRead: "."</span>
              <span class="sb-proxy"><b>proxy local</b><em>allowlist: <i class="sb-al">vacía</i></em></span>
            </div>
            <div class="sb-home"><span class="sb-l">~ tu home, fuera del perímetro</span>
              <span class="sb-chip sb-f-notes">~/notas.txt</span><span class="sb-chip sb-f-ssh">~/.ssh</span><span class="sb-chip sb-f-cred">credenciales</span>
              <span class="sb-denyr">denyRead: "~/"</span>
            </div>
          </div>
          <i class="sb-pk"></i>
        </div>
        <div class="sb-cfg"><span class="sb-cfg-h">.claude/settings.json</span>
<pre><span>{</span><span>  <k>"sandbox"</k>: {</span><span class="c1">    <k>"enabled"</k>: <v>true</v><span class="c2">,</span></span><span class="c2">    <k>"filesystem"</k>: {</span><span class="c2">      <k>"denyRead"</k>: [<s>"~/"</s>],</span><span class="c2">      <k>"allowRead"</k>: [<s>"."</s>]</span><span class="c2">    }<span class="c3">,</span></span><span class="c3">    <k>"network"</k>: {</span><span class="c3">      <k>"allowedDomains"</k>: [<s>"github.com"</s>]</span><span class="c3">    }</span><span>  }</span><span>}</span></pre>
        </div>
      </div>
      <div class="sb-out">
        <span class="sb-l">Fuera del sandbox</span>
        <span class="sb-chip">Read · Edit · Write · WebFetch <em>→ reglas de permiso</em></span>
        <span class="sb-chip">hooks</span><span class="sb-chip">servidores MCP locales</span><span class="sb-chip">comandos <code>!</code> que tú tipeas</span>
        <span class="sb-tipc">Barrera total: Claude Code dentro de un contenedor o VM (dev containers)</span>
      </div>`;
  },

  go(i, instant) {
    const st = ESTADOS[i];
    const prev = i > 0 ? ESTADOS[i - 1] : st;
    if (tl && tl.progress() < 1) tl.progress(1);
    gsap.getTweensOf(root.querySelectorAll("*")).forEach((tw) => tw.progress(1).kill());
    const d = instant ? 0 : 1;
    const t = (tl = gsap.timeline());
    const q = (s: string) => root.querySelector(s) as HTMLElement;
    const map = q(".sb-map"), perim = q(".sb-perim"), pk = q(".sb-pk"), res = q(".sb-res");

    // ---------- estado base ----------
    root.classList.toggle("is-on", st.on);
    root.classList.toggle("read-all", !!st.readAll);
    root.classList.toggle("deny", !!st.deny);
    root.classList.toggle("show-out", !!st.out);
    root.querySelectorAll(".sb-hit, .sb-hit-bad, .sb-hit-warn").forEach((e) => e.classList.remove("sb-hit", "sb-hit-bad", "sb-hit-warn"));
    for (let n = 1; n <= 3; n++) {
      root.querySelectorAll<HTMLElement>(".c" + n).forEach((e) => {
        e.classList.toggle("on", st.cfg >= n);
        e.classList.toggle("new", st.cfg === n && prev.cfg < n);
      });
    }
    q(".sb-al").textContent = st.cfg >= 3 ? "github.com" : "vacía";
    q(".sb-tool").textContent = st.tool ?? "Bash";
    q(".sb-tool").classList.toggle("is-you", !!st.tool);
    q(".sb-cmd").textContent = st.cmd ? (st.tool ? "" : "$ ") + st.cmd : "";
    res.className = "sb-res";
    res.textContent = "";
    gsap.set(pk, { opacity: 0, x: 0, y: 0 });

    // perímetro que se dibuja al activarse
    if (st.on && !prev.on && d) t.fromTo(perim, { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: 0.7, ease: "power3.out" }, 0);
    else gsap.set(perim, { opacity: 1, scale: 1 });
    if (st.out && d) t.fromTo(root.querySelectorAll(".sb-out > *"), { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.15, ease: "power3.out" }, 0);
    else gsap.set(root.querySelectorAll(".sb-out > *"), { y: 0, opacity: 1 });
    if (st.readAll && d) t.fromTo(q(".sb-reach"), { opacity: 0 }, { opacity: 1, duration: 0.8 }, 2.0);
    else gsap.set(q(".sb-reach"), { opacity: 1 });

    // ---------- viaje del comando ----------
    const finish = (at: number) => {
      if (!st.res) return;
      t.call(() => {
        res.className = "sb-res is-" + st.res!.c;
        res.textContent = st.res!.t;
        const tgt = st.target ? q(st.target) : null;
        if (tgt && st.act !== "net-block") tgt.classList.add(st.res!.c === "ok" ? "sb-hit" : st.res!.c === "bad" ? "sb-hit-bad" : "sb-hit-warn");
        if ((st.act === "net-block" || st.act === "net-pass")) q(".sb-proxy").classList.add(st.res!.c === "ok" ? "sb-hit" : "sb-hit-bad");
        if (st.act === "deny") q(".sb-denyr").classList.add("sb-hit-bad");
      }, [], at);
      if (d) t.fromTo(res, { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.35, ease: "power3.out" }, at);
    };

    if (st.act === "none" || !st.target) { if (!d) t.progress(1); return; }
    if (!d) { finish(0); t.progress(1); return; }

    const mr = map.getBoundingClientRect();
    const c = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2 - mr.left, y: r.top + r.height / 2 - mr.top }; };
    const o = c(q(".sb-claude")), tg = c(q(st.target));
    const pr = perim.getBoundingClientRect();
    // punto donde el segmento origen→destino cruza el borde del perímetro
    const edge = () => {
      const L = pr.left - mr.left, R = pr.right - mr.left, T = pr.top - mr.top, B = pr.bottom - mr.top;
      let best = 1;
      const dx = tg.x - o.x, dy = tg.y - o.y;
      for (const [v, a, b] of [[L, o.x, dx], [R, o.x, dx], [T, o.y, dy], [B, o.y, dy]] as const) {
        if (b === 0) continue;
        const k = (v - a) / b;
        if (k > 0 && k < best) best = k;
      }
      return { x: o.x + dx * best, y: o.y + dy * best };
    };

    pk.className = "sb-pk";
    t.set(pk, { x: o.x, y: o.y, opacity: 1, scale: 1 }, 0.1);
    t.call(() => { q(".sb-claude").classList.add("is-run"); }, [], 0.1);
    t.call(() => { q(".sb-claude").classList.remove("is-run"); }, [], 2.2);
    let end = 1.4;
    if (st.act === "pass" || st.act === "read") {
      if (st.act === "read") pk.classList.add("is-warn");
      t.to(pk, { x: tg.x, y: tg.y, duration: 1.1, ease: "power2.inOut" }, st.act === "pass" ? 0.8 : 0.2);
      t.to(pk, { scale: 2.2, opacity: 0, duration: 0.35 }, st.act === "pass" ? 1.9 : 1.3);
      end = st.act === "pass" ? 1.9 : 1.3;
    } else if (st.act === "block" || st.act === "deny") {
      const e = edge();
      t.to(pk, { x: e.x, y: e.y, duration: 0.8, ease: "power2.in" }, 0.2);
      t.call(() => pk.classList.add("is-bad"), [], 1.0);
      t.to(pk, { x: o.x + (e.x - o.x) * 0.72, y: o.y + (e.y - o.y) * 0.72, duration: 0.9, ease: "elastic.out(1.1, 0.35)" }, 1.0);
      t.to(perim, { "--sb-flash": 1, duration: 0.12, yoyo: true, repeat: 1 }, 1.0);
      t.to(pk, { opacity: 0, duration: 0.3 }, 1.9);
      end = 1.0;
    } else {
      const p = c(q(".sb-proxy"));
      t.to(pk, { x: p.x, y: p.y, duration: 0.8, ease: "power2.inOut" }, 0.2);
      t.call(() => q(".sb-proxy").classList.add("is-check"), [], 1.0);
      t.call(() => q(".sb-proxy").classList.remove("is-check"), [], 1.7);
      if (st.act === "net-pass") {
        t.to(pk, { x: tg.x, y: tg.y, duration: 0.8, ease: "power2.inOut" }, 1.7);
        t.call(() => pk.classList.add("is-ok"), [], 1.7);
        t.to(pk, { scale: 2.2, opacity: 0, duration: 0.35 }, 2.5);
        end = 2.5;
      } else {
        t.call(() => pk.classList.add("is-bad"), [], 1.7);
        t.to(pk, { x: p.x + (o.x - p.x) * 0.3, y: p.y + (o.y - p.y) * 0.3, duration: 0.9, ease: "elastic.out(1.1, 0.35)" }, 1.7);
        t.to(pk, { opacity: 0, duration: 0.3 }, 2.6);
        end = 1.7;
      }
    }
    finish(end);
  },
};
