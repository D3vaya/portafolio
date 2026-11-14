# guias.jcayala.dev

Sitio de guías de aprendizaje. Proyecto Astro independiente dentro del repo del portafolio.

```bash
cd guias
pnpm install
pnpm dev        # http://localhost:4322
pnpm build
```

## Sistema de diseño: "Lector"

Leer una guía se siente como leer un libro en un e-reader. Todo vive en `src/styles/guias.css`.

- **Temas de lectura** (menú Aa): Papel, Sepia y Noche, más cinco tamaños de texto. Se guardan en el navegador.
  Si el lector no eligió, se usa Papel o Noche según el sistema.
- **Tipografía**: Literata para leer y para los títulos, Geist para la interfaz y Geist Mono para el código.
- **Columna de lectura** centrada (~66 caracteres). Widgets, tablas y código pueden salir de la columna hasta 880 px.
- **Capítulos**: cada lección abre con letra capitular y las separa un `⁂`.
- **Barra superior** que se esconde al leer, **panel de contenido** lateral y **barra de progreso** inferior
  con la lección actual, los minutos restantes y el porcentaje del nivel.
- **Color**: cada guía tiene un acento (`accent.light`, `accent.sepia`, `accent.dark`) para enlaces y progreso,
  y una portada propia (`cover.bg`, `cover.ink`) en `src/data/guides.ts`.
- El código y las terminales usan una superficie de grafito en los tres temas.

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
