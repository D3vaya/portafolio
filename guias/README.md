# guias.jcayala.dev

Sitio de guías de aprendizaje. Proyecto Astro independiente dentro del repo del portafolio.

```bash
cd guias
pnpm install
pnpm dev        # http://localhost:4322
pnpm build
```

## Sistema de diseño: "Placa"

Las guías comparten la marca de jcayala.dev. Los estilos viven en `src/styles/guias.css` (base y componentes) y
`src/styles/placa.css` (identidad, siempre activa con `data-identidad="placa"` en `<html>`).

- **Color**: gris perla, grafito y una señal naranja eléctrica (`--signal: #ff5b1f`), reservada para la interfaz y lo
  activo. Dentro de las animaciones y widgets cada color tiene un significado fijo: verde = permitido o leído,
  ámbar = costo, escritura o advertencia, rojo-magenta = error o bloqueado, lila = herramientas u otro agente.
- **Tipografía**: Anybody (titulares, condensada y pesada), Schibsted Grotesk (lectura e interfaz) y JetBrains Mono (código).
- **Placas**: todo lo interactivo (animaciones, simuladores, widgets) va sobre grafito con grilla de puntos, en los tres
  temas. Se lee en claro y se experimenta en la placa.
- **Temas de lectura** (menú Aa): Perla, Arena y Grafito, más cinco tamaños de texto. Las claves internas siguen siendo
  `papel`, `sepia` y `noche` para no perder la preferencia guardada.
- **Pistas de circuito**: separadores entre lecciones, índice lateral con nodos que se iluminan y barra de progreso
  como una señal.

## Animaciones (escenas)

`src/scripts/escena.ts` es el marco común: título, controles (anterior, reproducir, siguiente, repetir), puntos de
progreso, avance automático al entrar en pantalla y respeto por "reducir movimiento". Cada animación es un archivo en
`src/guides/<guía>/anim/<nombre>.ts` (con su `<nombre>.css`) que exporta una `Escena` con `steps` y `go(i, instant)`.
Para usarla en una lección basta con `<div data-escena="<nombre>"></div>`: `anim/index.ts` la carga bajo demanda.

Componentes que puede usar cualquier guía (clases): `article.lesson`, `.lnum`, `.simple`, `.tip` / `.tip.warn`,
`.code` + `.ch` + `pre`, `table.ref`, `.btn` / `.btn.pri`, `.wd` (widget), `.chip`, `.quiz`, `.done-btn`, `kbd.k`.

## Agregar una guía

1. Agrega la entrada en `src/data/guides.ts` con sus colores (`accent` y `cover`).
2. Crea `src/pages/<slug>/index.astro` usando `Base` con `accent={guide.accent}`, una `header.readerbar` y
   `ReaderMenu` (ver `claude-code/index.astro`).
3. Escribe las lecciones con las clases de arriba. Si la guía necesita widgets propios, ponlos en
   `src/guides/<slug>/` (ver `claude-code/` como ejemplo).

La guía de Claude Code viene de un artifact de claude.ai: `content.html` y `app.js` son su contenido y su lógica,
`legacy.css` son sus estilos originales remapeados a los tokens (en la capa `legacy`, así el sistema compartido
siempre gana) y `guide.css` son los ajustes propios.

Cada vista de la guía tiene su propia URL (`/claude-code/`, `/claude-code/basico/`, … `/claude-code/novedades/`),
generada por `src/pages/claude-code/[...view].astro` a partir de `views.ts`, que corta `content.html` por vista y
define el título de cada página. `app.js` es uno solo para todas las vistas: los widgets de vistas que no están en la
página reciben un objeto vacío (`GHOST`) y los módulos de las secciones de referencia salen antes si su vista no está.
Los enlaces antiguos (`/claude-code/#hooks`) redirigen a la URL nueva.

La guía de Git (`/git/`, `/git/basico/` … `/git/glosario/`) usa la misma estructura con código propio en
`src/guides/git/`: `content.html` (lecciones y vistas), `views.ts`, `app.js` (progreso, quizzes y widgets),
`anim/` (escenas sobre el kit de grafos `_kit.ts`), `lab.ts` (el laboratorio: un repositorio simulado donde se escriben
comandos de Git y el grafo cambia en vivo), `hero.ts` (el grafo animado de la portada) y `casos/` (problemas comunes en equipo y estrategias de ramas,
escritos como datos con su animación). Ver DESIGN.md §6.1, §6.2 y §6.3.

## SEO

- `public/robots.txt` y `src/pages/sitemap.xml.ts` (el sitemap se genera al compilar con todas las vistas).
- Cada página tiene título y descripción propios, imagen para compartir (`public/og*.png`, 1200×630) y datos
  estructurados: `WebSite` + `ItemList` en la biblioteca, `Course` en el inicio de la guía y `TechArticle` +
  `BreadcrumbList` en cada vista.

## Despliegue en Vercel

1. En Vercel, crea un proyecto nuevo desde el repo `D3vaya/portafolio`.
2. En **Root Directory** elige `guias`. Framework: Astro.
3. En **Domains**, agrega `guias.jcayala.dev`.
4. En tu DNS, crea un registro `CNAME` de `guias` hacia `cname.vercel-dns.com` (si el dominio ya usa los
   nameservers de Vercel, se configura solo).

El portafolio sigue siendo su propio proyecto con Root Directory en la raíz; los dos se despliegan desde el mismo repo.
