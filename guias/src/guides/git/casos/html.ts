/*
  HTML estático de las vistas «Problemas» y «Estrategias», generado en el build desde los datos.
  Va en el HTML de la página (no lo arma el navegador) para que los buscadores indexen cada caso:
  la gente llega buscando su problema con sus palabras.
  content.html marca dónde va cada bloque con <!--casos--> y <!--estrategias-->.
*/
import type { Caso, Estrategia, Grupo } from "./tipos";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const RIESGO = { bajo: "Riesgo bajo", medio: "Con cuidado", alto: "Riesgo alto" } as const;
const VISTA: Record<string, string> = {
  basico: "Básico", intermedio: "Intermedio", avanzado: "Avanzado", experto: "Experto",
  rescate: "Rescate", comandos: "Comandos", estrategias: "Estrategias", problemas: "Problemas",
};

const code = (txt: string, label = "bash") =>
  `<div class="code"><div class="ch"><span>${label}</span><button class="copy">copiar</button></div><pre data-hl>${esc(txt)}</pre></div>`;

export function htmlCasos(casos: Caso[], grupos: Grupo[]) {
  const chips = grupos
    .map((g) => `<button type="button" class="chip" data-g="${g.id}">${g.label}</button>`)
    .join("");
  const indice = `
    <div class="wd pb-w" id="pbW">
      <div class="wh"><span class="dot"></span><span class="tt">¿Qué te está pasando?</span><span class="cmd-count" id="pbN"></span></div>
      <div class="wb">
        <input type="search" id="pbQ" class="cmd-q" placeholder="Describe el problema: «conflictos siempre», «PR enorme», «hotfix»…" aria-label="Buscar un problema" autocomplete="off">
        <div class="chips" id="pbG"><button type="button" class="chip on" data-g="">Todos</button>${chips}</div>
      </div>
      <ol class="pb-list" id="pbList">${casos
        .map((c) => `<li data-id="${c.id}" data-g="${c.grupo}"><a href="#c-${c.id}"><span>${esc(c.q)}</span><span class="sos-r r-${c.riesgo}">${RIESGO[c.riesgo]}</span></a></li>`)
        .join("")}</ol>
      <p class="cmd-empty" id="pbEmpty" hidden>Nada coincide. Prueba con «conflicto», «rama», «release», «push» o «lento».</p>
    </div>`;

  const bloques = grupos
    .map((g) => {
      const del = casos.filter((c) => c.grupo === g.id);
      if (!del.length) return "";
      return `<h2 class="rh pb-gh" id="g-${g.id}">${g.label}</h2>` + del.map(caso).join("");
    })
    .join("");
  return indice + bloques;
}

function caso(c: Caso) {
  const lec = c.leccion
    ? `<a class="pb-more" href="#${c.leccion}">Más a fondo en ${VISTA[c.leccion] ?? c.leccion} →</a>`
    : "";
  return `
  <article class="pb" id="c-${c.id}" data-g="${c.grupo}">
    <div class="pb-top"><span class="sos-r r-${c.riesgo}">${RIESGO[c.riesgo]}</span></div>
    <h3>${esc(c.q)}</h3>
    <div class="pb-sint"><b class="h">Lo que ves</b><p>${c.sintoma}</p>${c.msg ? `<pre class="pb-msg">${esc(c.msg)}</pre>` : ""}</div>
    <p class="pb-causa"><b>Por qué pasa.</b> ${c.causa}</p>
    <h4 class="pb-h">El flujo recomendado</h4>
    <div data-flujo="caso:${c.id}" tabindex="0"></div>
    ${code(c.comandos)}
    <div class="pb-cols">
      ${c.alternativa ? `<div class="pb-c"><b class="h">Otra salida</b><p>${c.alternativa}</p></div>` : ""}
      <div class="pb-c pb-prev"><b class="h">Para que no vuelva a pasar</b><p>${c.prevencion}</p></div>
    </div>
    ${lec}
  </article>`;
}

export function htmlEstrategias(es: Estrategia[]) {
  return es
    .map(
      (e) => `
  <article class="es-a" id="e-${e.id}">
    <h2 class="rh">${esc(e.nombre)}</h2>
    <p class="es-idea">${e.idea}</p>
    <div data-flujo="estr:${e.id}" tabindex="0"></div>
    <dl class="es-dl">
      <div><dt>Ramas</dt><dd>${e.ramas}</dd></div>
      <div><dt>Cómo se libera</dt><dd>${e.libera}</dd></div>
      <div class="ok"><dt>Sirve para</dt><dd>${e.sirve}</dd></div>
      <div class="no"><dt>No sirve para</dt><dd>${e.noSirve}</dd></div>
      <div class="wide"><dt>Problemas típicos</dt><dd>${e.problemas}</dd></div>
    </dl>
    ${code(e.clave)}
    <p class="es-src">Fuentes: ${e.fuentes.map((f) => `<a href="${f.url}" rel="noopener" target="_blank">${esc(f.t)}</a>`).join(" · ")}</p>
  </article>`,
    )
    .join("");
}
