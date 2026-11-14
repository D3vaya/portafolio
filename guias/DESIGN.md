# DESIGN.md — Guía de diseño de guias.jcayala.dev

Guía para agentes (y personas) que crean o editan guías en este sitio. Si una decisión no está aquí, imita lo que ya
existe en `src/guides/claude-code/` antes de inventar algo nuevo. Este documento manda sobre los gustos personales.

---

## 1. Identidad: "Placa"

Las guías son parte de la marca de [jcayala.dev](https://www.jcayala.dev): gris perla, grafito y una señal naranja
eléctrica, con titulares pesados y condensados. La metáfora es una **placa de circuito**: se lee en claro, y todo lo
que se toca o se mueve (animaciones, simuladores, widgets) vive en una placa de grafito con grilla de puntos.

Principios:

1. **Comprensión antes que decoración.** Cada elemento visual explica algo. Si no explica, sobra.
2. **Un color, un significado.** Los colores de datos nunca cambian de sentido entre una animación y otra.
3. **Lo interactivo siempre en placa.** El lector debe reconocer de un vistazo dónde puede experimentar.
4. **Tono de la marca, no de plantilla.** Nada de degradados decorativos, emojis, etiquetas en MAYÚSCULAS sobre cada
   título ni tarjetas idénticas con sombra genérica.

Archivos fuente:

| Qué | Dónde |
|---|---|
| Tokens base, componentes de lectura | `src/styles/guias.css` |
| Identidad Placa (siempre activa con `data-identidad="placa"` en `<html>`) | `src/styles/placa.css` |
| Marco de animaciones | `src/scripts/escena.ts` |
| Animaciones de una guía | `src/guides/<guía>/anim/<nombre>.ts` + `.css` |
| Ajustes propios de una guía | `src/guides/<guía>/guide.css` |
| Layout y metadatos | `src/layouts/Base.astro` |

---

## 2. Color

### Lectura (tres temas, menú Aa)

| Token | Perla (claro) | Arena (cálido) | Grafito (oscuro) | Uso |
|---|---|---|---|---|
| `--paper` | `#ecedef` | `#efe8dc` | `#111216` | Fondo de página |
| `--surface` | `#f8f8f9` | `#f8f3ea` | `#17181d` | Tarjetas claras, inputs |
| `--ink` | `#15161a` | `#241d14` | `#ececee` | Texto principal |
| `--ink-2` | `#474a52` | `#554a3b` | `#a8abb4` | Texto secundario |
| `--ink-3` | `#5e626d` | `#7a6d5b` | `#757984` | Metadatos, rótulos |
| `--accent` | `#c2410c` | `#b23a0a` | `#ff7a45` | Enlaces y texto de acento (contraste AA) |
| `--signal` | `#ff5b1f` | `#ff5b1f` | `#ff5b1f` | Marca: botón principal, puntos, progreso, lo activo |

Claves internas de tema: `papel`, `sepia`, `noche` (se mantienen para no perder preferencias guardadas).
El naranja `--signal` **no** se usa para texto largo sobre fondo claro: para texto usa `--accent`.

### Placas (grafito, en los tres temas)

Fondo `#111216` (en tema Grafito sube a `#1a1c22`), grilla `radial-gradient(rgb(255 255 255 / .07) 1px, transparent 1.2px)`
cada 18px, borde `#23252c`, radio 18px. Texto `#ececee` / `#a8abb4` / `#7a7e89`. Chips internos `#1b1d23`.

### Colores de datos (significado fijo dentro de placas)

| Color | Hex | Significa | Nunca lo uses para |
|---|---|---|---|
| Naranja señal | `#ff5b1f` | Lo principal, la sesión del usuario, "activo ahora", interfaz | Errores o costos |
| Verde | `#5fd69a` | Permitido, correcto, leído del caché, completado | Decoración |
| Ámbar | `#ffb35c` | Costo, escritura, advertencia, "pregunta" (ask) | Éxito |
| Rojo-magenta | `#ff4d6d` | Error, bloqueado, denegado — **siempre con ✕ o texto** | Énfasis general |
| Lila | `#9aa8ff` | Herramientas, procesos secundarios, otro agente o modelo | Lo principal |

Brillo de lo activo: `box-shadow: 0 0 22px -6px <color>`. Sin degradados de color como fondo.

---

## 3. Tipografía

| Familia | Variable | Uso |
|---|---|---|
| **Anybody** (variable, ancho 50–150) | `--display` | Titulares, números grandes, nombres en animaciones. Peso 800–900, `font-stretch: 70–85%`, `letter-spacing: -0.01em` a `-0.03em` |
| **Schibsted Grotesk** | `--sans` / `--serif` | Lectura (18px, interlineado 1.72), interfaz, etiquetas |
| **JetBrains Mono** | `--mono` | Código, comandos, cifras tabulares en simuladores |

Escala de referencia:

| Elemento | Tamaño |
|---|---|
| Título de nivel (`.lvhead h1`) | `clamp(54px, 8.4vw, 118px)`, stretch 72% |
| Número de nivel (`.bigglyph`) | `clamp(110px, 16vw, 220px)`, stretch 70% |
| Título de lección (`h2`) | `clamp(36px, 4.6vw, 56px)`, stretch 78% |
| Subtítulo (`h3`) | `1.35em`, stretch 85% |
| Cuerpo | 18px (16–22px según el menú Aa) |
| Rótulos | 12–13px, nunca menos de 12px reales, tampoco en móvil |

Reglas: frases en minúscula inicial ("sentence case"), sin MAYÚSCULAS sostenidas, sin cursivas decorativas, sin
letra capitular. No resaltes una sola palabra de un titular con otro color.

---

## 4. Maquetación

- **Columna de lectura**: `--measure: 36em` (~70 caracteres), centrada.
- **Placas, tablas y código** salen de la columna hasta `--wide: 880px` (en escritorio van de x=280 a x=1160 en 1440px).
  Lo hace la regla `article.lesson > :not(p, h2, h3, ul, ol, .lnum, .tip, .done-btn, button)`; no pongas
  `style="max-width:none"` en línea.
- **Aperturas de nivel y portada**: alineadas a la izquierda con el borde de las placas, titular enorme.
- **Móvil (≤ 760px)**: márgenes de 16–18px, nada de scroll horizontal en la página (solo dentro de un elemento que lo
  indique con una máscara de degradado), grillas a una columna.
- **Separador entre lecciones**: pista de circuito con una vía naranja (ya automático entre `article.lesson`).

---

## 5. Componentes

Usa siempre estas clases; no crees variantes nuevas sin necesidad.

| Componente | Marcado | Para qué |
|---|---|---|
| Lección | `<article class="lesson" id="b1" data-t="Título">` | Una unidad de lectura. `id` único y estable (guarda el progreso) |
| Etiqueta de lección | `<div class="lnum">Lección 1.1</div>` | Píldora con punto de señal |
| En simple | `<div class="simple"><b class="h">En simple</b>…</div>` | La idea clave de la lección, una por lección |
| Nota | `<div class="tip">` / `<div class="tip warn">` con `<b class="h">` | Consejo o advertencia al margen |
| Código | `<div class="code"><div class="ch"><span>archivo</span><button class="copy">copiar</button></div><pre data-hl>…</pre></div>` | Siempre con botón copiar |
| Tabla | `<table class="ref">` con `thead` | Referencia comparativa |
| Widget | `<div class="wd"><div class="wh"><span class="dot"></span><span class="tt">Título</span></div><div class="wb">…</div></div>` | Simulador o herramienta interactiva: **siempre con cabecera `.wh` y título** |
| Animación | `<div data-escena="nombre" tabindex="0"></div>` | Ver sección 6 |
| Tarjeta pequeña | `<div class="mini"><b>Título</b>texto</div>` | El primer `<b>` es el título; los siguientes son negritas en línea |
| Botones | `.btn`, `.btn.pri`, `.btn.sm` | `.pri` = naranja señal, uno por bloque |
| Chips | `.chip`, `.chip.on` | Opciones o filtros |
| Marcar completada | `<button class="done-btn" data-done="<id>">○ Marcar como completada</button>` | Al final de cada lección |
| Quiz | `<div class="wd quiz" data-quiz="<nivel>">` | Al final de cada nivel |
| Atajo | `<kbd class="k">Esc</kbd>` | Teclas |

Íconos: **sin emojis**. Si hace falta un ícono, SVG de trazo simple en `currentColor`. Los glifos tipográficos
✓ ✕ ⏸ ⏵⏵ están permitidos porque existen en las fuentes.

---

## 6. Animaciones (escenas)

Marco: `src/scripts/escena.ts`. Una escena exporta `{ title, steps: [{ title, text, ms }], setup(stage), go(i, instant) }`
y se registra sola desde `anim/index.ts` (carga bajo demanda). Referencias de calidad: `anim/advisor.ts`, `anim/cache.ts`.

Reglas de contenido:

1. **Se entiende sin leer el código**: cada elemento tiene etiqueta visible o leyenda.
2. **Cada paso cambia algo visible** que su texto explica. Título ≤ 8 palabras; explicación ≤ 35 palabras.
3. **5 a 8 pasos**, `ms` entre 6000 y 9000 según cuánto haya que leer.
4. **Un foco de movimiento a la vez**: primero lo que el ojo debe seguir, después el cambio de estado.
5. **Movimiento que explica**: algo viaja, se llena, se bloquea, se derrumba o se ilumina en secuencia. Easing GSAP
   `power3.out`, `back.out(2)`; `elastic` solo para el rebote de un error.
6. **Precisión**: todo dato técnico sale del texto de la lección. Cifras ilustrativas, rotuladas como tales.
7. **Sin contradicciones**: lo que la animación muestre (precios, duraciones, orden) debe coincidir con la lección.

Reglas técnicas:

1. `go(i, instant)` deja el estado **completo** del paso `i` venga de donde venga (el marco reproduce los pasos previos con
   `instant=true` cuando el lector salta).
2. Al empezar `go`: completa la animación anterior (`if (tl && tl.progress() < 1) tl.progress(1)`) y los tweens sueltos
   (`gsap.getTweensOf(root.querySelectorAll("*")).forEach(tw => tw.progress(1).kill())`).
3. Busca elementos dentro del `stage`, nunca en `document`.
4. Prefija todas las clases CSS con un prefijo corto propio (`.cx-`, `.ad-`…).
5. Debe verse bien a 390px de ancho. En móvil, simplifica (menos filas, solo lo último del registro) para que la escena
   no pase de ~1,5 pantallas de alto, y deja lo que cambia arriba para que el lector lo vea sin desplazarse.
6. Para código dentro del dibujo usa `<span class="mo">` (o una clase propia): `.escena code` tiene un estilo global de
   píldora pensado para el texto del paso.
7. "Reducir movimiento" lo maneja el marco (sin avance automático y sin animar).
8. Las escenas se cargan bajo demanda: un error en un archivo solo afecta a su propia escena, pero un `import "./x.css"` a un
   archivo que no existe rompe el build. Crea el CSS antes de importarlo.

---

## 7. Redacción

- Español neutro, tuteo, voz activa, frases cortas. Evita regionalismos como término técnico ("coincide", no "calza").
- Nombra las cosas como las ve el usuario: "los permisos", no "el ruleset".
- Los botones dicen exactamente lo que pasa ("Copiar", "Simular un pedido"); el mensaje de confirmación usa el mismo verbo.
- Los errores explican qué pasó y cómo seguir, sin disculpas.
- Comandos, flags, rutas y claves de configuración siempre en `<code>`, tal como se escriben.
- No inventes comandos ni comportamientos: verifica en la documentación oficial y cita la versión cuando importe.

---

## 8. Accesibilidad

- Contraste AA en texto (por eso `--accent` y no `--signal` para enlaces sobre claro).
- Foco visible (`:focus-visible` con contorno del acento) en todo lo interactivo.
- Información nunca solo por color: error = rojo **y** ✕ o texto.
- `prefers-reduced-motion` respetado en CSS y en las escenas.
- Imágenes y SVG decorativos con `aria-hidden="true"`; los que informan, con texto alternativo.
- Tamaño mínimo de texto 12px reales; objetivos táctiles de al menos 32px.

---

## 9. SEO (no romper)

Cada vista de una guía es su propia URL, generada por `src/pages/<guía>/[...view].astro`.

- **Un solo `<h1>` por página**. Las lecciones usan `<h2>`; las escenas no agregan encabezados.
- **Título** ≤ 60 caracteres y **descripción** ≤ 155, únicos por página (`views.ts` → `META`).
- `canonical`, `og:*` y tarjeta de Twitter los pone `Base.astro`. Imagen para compartir 1200×630 en `public/`.
- **Datos estructurados**: `WebSite` + `ItemList` en la biblioteca, `Course` en el inicio de cada guía,
  `TechArticle` + `BreadcrumbList` en cada vista.
- `src/pages/sitemap.xml.ts` genera el sitemap con todas las vistas; `public/robots.txt` lo declara.
- **Si renombras o borras una URL**, agrega una redirección permanente en `vercel.json` (como `/claude-code/arquitecto/` → `/experto/`).
- Antes de publicar, verifica en el build: un H1 por página, metadatos completos y el sitemap con todas las URLs.

---

## 10. Agregar una guía nueva (checklist)

1. Entrada en `src/data/guides.ts` (`slug`, `title`, `tagline`, `summary`, `facts`, `signal`, `status`).
2. Contenido y vistas en `src/guides/<slug>/` y página en `src/pages/<slug>/`, con su `META` de títulos.
3. Lecciones con los componentes de la sección 5; una animación para cada concepto difícil de imaginar.
4. Imagen para compartir 1200×630 con la identidad Placa.
5. Verifica SEO (sección 9), móvil a 390px, los tres temas y la consola sin errores.

---

## 11. Lo que no se hace

- Emojis como íconos.
- Degradados decorativos, brillos sin significado, sombras grises genéricas en tarjetas idénticas.
- Etiquetas en MAYÚSCULAS sobre cada título, metadatos con "·" en exceso, flechas "→" al final de los botones.
- Colores de datos con significado distinto al de la tabla de la sección 2.
- Widgets sin título, animaciones sin leyenda, textos de paso que no se alcanzan a leer.
- Estilos en línea para anchos (`max-width:none`).
