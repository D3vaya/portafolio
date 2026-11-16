/*
  Parte interactiva de las vistas «Problemas» y «Estrategias»:
  - monta la animación de cada flujo ([data-flujo="caso:id"] o "estr:id"),
  - el buscador de problemas (#pbW) filtra la lista y los casos de la página,
  - el asistente «¿Qué estrategia me sirve?» (#esW) recomienda una según el equipo.
  Solo se descarga en las páginas que lo usan.
*/
import { montar } from "../../../scripts/escena";

const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T | null;
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll(s)) as T[];
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

async function animaciones() {
  const els = $$("[data-flujo]");
  if (!els.length) return;
  const [{ escenaDe }, casos, estr] = await Promise.all([import("./flujo"), import("./casos"), import("./estrategias")]);
  const io = new IntersectionObserver(
    (es) =>
      es.forEach((en) => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        const el = en.target as HTMLElement;
        const [tipo, id] = (el.dataset.flujo || "").split(":");
        const f = tipo === "caso" ? casos.CASOS.find((c) => c.id === id)?.flujo : estr.ESTRATEGIAS.find((e) => e.id === id)?.flujo;
        if (!f) return;
        try { montar(el, escenaDe(f)); } catch (err) { console.warn("[flujo]", id, err); }
      }),
    // se monta un poco antes de entrar en pantalla, para que no se vea el salto
    { rootMargin: "600px 0px" },
  );
  els.forEach((el) => io.observe(el));
}

function buscador() {
  const w = $("#pbW") as HTMLElement;
  if (!w) return;
  const q = $<HTMLInputElement>("#pbQ", w)!;
  const items = $$("#pbList li", w);
  const arts = $$("article.pb");
  const heads = $$(".pb-gh");
  const texto = new Map(arts.map((a) => [a.id.slice(2), norm(a.textContent || "")]));
  let grupo = "";

  function filtrar() {
    const terms = norm(q.value).split(/\s+/).filter(Boolean).map((t) => (t.length > 5 ? t.slice(0, -1) : t));
    let n = 0;
    const vis = new Set<string>();
    items.forEach((li) => {
      const id = li.dataset.id!;
      const ok = (!grupo || li.dataset.g === grupo) && terms.every((t) => texto.get(id)!.includes(t));
      li.hidden = !ok;
      if (ok) { n++; vis.add(id); }
    });
    arts.forEach((a) => (a.hidden = !vis.has(a.id.slice(2))));
    heads.forEach((h) => {
      const g = h.id.slice(2);
      h.hidden = !arts.some((a) => a.dataset.g === g && !a.hidden);
    });
    $("#pbN", w)!.textContent = n === items.length ? `${n} casos` : `${n} de ${items.length}`;
    $("#pbEmpty", w)!.hidden = n > 0;
  }
  q.addEventListener("input", filtrar);
  $("#pbG", w)!.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-g]");
    if (!b) return;
    grupo = b.dataset.g || "";
    $$("#pbG button", w).forEach((x) => x.classList.toggle("on", x === b));
    filtrar();
  });
  filtrar();
}

/* ---------- ¿Qué estrategia me sirve? ---------- */
type Resp = Record<string, string>;
const REGLAS: { id: string; nombre: string; si: (r: Resp) => number; por: (r: Resp) => string }[] = [
  {
    id: "trunk", nombre: "Trunk-based development",
    si: (r) => (r.deploy === "continuo" ? 3 : 0) + (r.ci === "solido" ? 3 : -3) + (r.versiones === "una" ? 1 : -2) + (r.equipo === "oss" ? -3 : 0) + (r.regulado === "si" ? -1 : 0),
    por: () => "Despliegas seguido y tus pruebas automáticas son confiables: integrar a main varias veces al día, con ramas de horas y feature flags para lo incompleto, es lo que más reduce conflictos y tiempo de entrega.",
  },
  {
    id: "github-flow", nombre: "GitHub flow",
    si: (r) => 2 + (r.deploy === "continuo" ? 2 : r.deploy === "programado" ? 0 : -1) + (r.versiones === "una" ? 1 : -2) + (r.ci === "solido" ? 0 : 1) + (r.equipo === "oss" ? -1 : 0) + (r.regulado === "si" ? -2 : 0),
    por: (r) => `Una rama corta y un pull request por cambio, con main siempre desplegable. Es simple y sirve a casi cualquier equipo${r.ci === "solido" ? "" : "; mientras mejoras las pruebas automáticas, la revisión del PR es tu red de seguridad"}.`,
  },
  {
    id: "release", nombre: "Ramas de release (release flow)",
    si: (r) => (r.versiones === "varias" ? 3 : 0) + (r.deploy === "versiones" ? 2 : 0) + (r.regulado === "si" ? 2 : 0) + (r.equipo === "grande" ? 1 : 0),
    por: () => "Necesitas congelar lo que sale y mantener correcciones en versiones ya publicadas: trabajas en main y cortas una rama release/… por versión. Los arreglos van primero a main y se llevan con cherry-pick.",
  },
  {
    id: "gitlab-flow", nombre: "GitLab flow (ramas de entorno)",
    si: (r) => (r.regulado === "si" ? 3 : 0) + (r.deploy === "programado" ? 2 : 0) + (r.versiones === "una" ? 1 : 0),
    por: () => "Hay que pasar por entornos con aprobación (staging, producción) o desplegar en ventanas programadas: los cambios fluyen de main a ramas de entorno, siempre en una sola dirección.",
  },
  {
    id: "git-flow", nombre: "Git flow",
    si: (r) => (r.versiones === "varias" ? 2 : -2) + (r.deploy === "versiones" ? 2 : -3) + (r.ci === "solido" ? -1 : 1),
    por: () => "Publicas versiones numeradas, con poca frecuencia, y mantienes más de una a la vez. Su propio autor lo desaconseja para software que se despliega continuamente.",
  },
  {
    id: "fork", nombre: "Forks y pull requests",
    si: (r) => (r.equipo === "oss" ? 6 : -5),
    por: () => "Aceptas contribuciones de gente sin permiso de escritura: cada quien trabaja en su fork y propone cambios con pull requests al repositorio original.",
  },
];

function asistente() {
  const w = $("#esW") as HTMLElement;
  if (!w) return;
  const out = $("#esOut", w)!;
  function calcular() {
    const r: Resp = {};
    $$<HTMLInputElement>("input:checked", w).forEach((i) => (r[i.name] = i.value));
    const faltan = $$("fieldset", w).filter((f) => !$("input:checked", f)).length;
    const total = $$("fieldset", w).length;
    if (faltan) { out.innerHTML = `<p class="es-wait">${faltan === total ? "Elige una respuesta en cada pregunta y aparece la recomendación." : `Falta${faltan === 1 ? " una pregunta" : `n ${faltan} preguntas`} para ver la recomendación.`}</p>`; return; }
    const orden = REGLAS.map((x) => ({ ...x, p: x.si(r) })).sort((a, b) => b.p - a.p);
    const [a, b] = orden;
    out.innerHTML = `
      <div class="es-rec"><span class="es-k">Te recomendamos</span><b>${a.nombre}</b><p>${a.por(r)}</p><a href="#e-${a.id}" class="btn">Ver cómo funciona</a></div>
      <p class="es-alt">También podría servirte: <a href="#e-${b.id}">${b.nombre}</a>. ${r.deploy === "continuo" && r.ci !== "solido" ? "Si quieres llegar a trunk-based, lo primero es tener pruebas automáticas confiables en cada push." : ""}</p>`;
    // resalta la tarjeta recomendada en la página
    $$("article.es-a").forEach((x) => x.classList.toggle("is-rec", x.id === "e-" + a.id));
  }
  w.addEventListener("change", calcular);
  calcular();
}

animaciones();
buscador();
asistente();
