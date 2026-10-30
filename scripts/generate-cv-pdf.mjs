import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Link,
  Image,
  StyleSheet,
  Font,
  renderToFile,
} from "@react-pdf/renderer";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { createRequire } from "module";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const cv = JSON.parse(
  readFileSync(join(__dirname, "..", "cv.json"), "utf-8")
);
const publicDir = join(__dirname, "..", "public");

// Paleta "claro técnico" del sitio
const INK = "#15161A";
const MUTED = "#5E626D";
const ACCENT = "#FF5B1F";
const ACCENT_TEXT = "#C2410C";
const LINE = "#DCDDE1";
const PANEL = "#F7F7F8";
// lineHeight por estilo: en Page rompe los textos dinámicos del pie
const LH = 1.4;

// Fuentes estáticas locales (fontkit no instancia los ejes de las variables)
const fontFile = (pkg, file) =>
  require.resolve(`@fontsource/${pkg}/files/${file}`);

Font.register({
  family: "Anybody",
  fonts: [
    { src: fontFile("anybody", "anybody-latin-700-normal.woff"), fontWeight: 700 },
    { src: fontFile("anybody", "anybody-latin-800-normal.woff"), fontWeight: 800 },
  ],
});
Font.register({
  family: "Schibsted",
  fonts: [
    { src: fontFile("schibsted-grotesk", "schibsted-grotesk-latin-400-normal.woff"), fontWeight: 400 },
    { src: fontFile("schibsted-grotesk", "schibsted-grotesk-latin-500-normal.woff"), fontWeight: 500 },
    { src: fontFile("schibsted-grotesk", "schibsted-grotesk-latin-700-normal.woff"), fontWeight: 700 },
  ],
});
// Sin guiones automáticos: las reglas por defecto son de inglés
Font.registerHyphenationCallback((word) => [word]);

// react-pdf descompone el texto (NFD) y luego dibuja mal los acentos combinantes.
// Se recompone cada letra + marca en su glifo precompuesto (á, é, ñ...) como una ligadura.
async function patchAccents() {
  const fontReq = createRequire(require.resolve("@react-pdf/renderer"));
  const fontkitCjs = createRequire(fontReq.resolve("@react-pdf/font"))
    .resolve("fontkit");
  const fontkit = await import(pathToFileURL(join(dirname(fontkitCjs), "module.mjs")).href);
  const sample = fontkit.openSync(fontFile("anybody", "anybody-latin-700-normal.woff"));
  let proto = Object.getPrototypeOf(sample);
  while (proto && !Object.hasOwn(proto, "layout")) proto = Object.getPrototypeOf(proto);
  const layout = proto.layout;
  proto.layout = function (...args) {
    const run = layout.apply(this, args);
    const glyphs = [];
    const positions = [];
    run.glyphs.forEach((glyph, i) => {
      const prev = glyphs.length - 1;
      const isMark = glyph.codePoints.length === 1 && /\p{M}/u.test(String.fromCodePoint(glyph.codePoints[0]));
      if (prev >= 0 && isMark) {
        const codePoints = [...glyphs[prev].codePoints, ...glyph.codePoints];
        const composed = String.fromCodePoint(...codePoints).normalize("NFC");
        if ([...composed].length === 1 && this.hasGlyphForCodePoint(composed.codePointAt(0))) {
          const merged = this.glyphForCodePoint(composed.codePointAt(0));
          merged.codePoints = codePoints;
          glyphs[prev] = merged;
          return;
        }
      }
      glyphs.push(glyph);
      positions.push(run.positions[i]);
    });
    run.glyphs = glyphs;
    run.positions = positions;
    return run;
  };
}
// Si cambia la estructura interna de react-pdf, se genera igual (con acentos desplazados)
await patchAccents().catch((err) => console.warn(`Parche de acentos omitido: ${err.message}`));

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingBottom: 48,
    paddingHorizontal: 44,
    fontFamily: "Schibsted",
    fontSize: 9.5,
    color: INK,
    backgroundColor: "#FFFFFF",
  },
  link: { color: INK, textDecoration: "none" },

  header: { flexDirection: "row", alignItems: "flex-start", gap: 20 },
  headerMain: { flex: 1 },
  accentBar: { width: 44, height: 5, backgroundColor: ACCENT, marginBottom: 10 },
  name: {
    fontFamily: "Anybody",
    fontWeight: 800,
    fontSize: 34,
    lineHeight: 0.98,
    letterSpacing: -1.2,
  },
  label: { fontSize: 11, fontWeight: 500, marginTop: 10, color: INK, lineHeight: LH },
  contact: { flexDirection: "row", flexWrap: "wrap", columnGap: 14, rowGap: 2, marginTop: 8 },
  contactItem: { fontSize: 9, color: MUTED, textDecoration: "none", lineHeight: LH },
  photo: { width: 78, height: 78, borderRadius: 10, objectFit: "cover" },

  summary: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: INK,
    fontSize: 9.5,
    lineHeight: 1.45,
  },

  section: { marginTop: 14 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionBar: { width: 16, height: 4, backgroundColor: ACCENT },
  sectionTitle: { fontFamily: "Anybody", fontWeight: 800, fontSize: 15, letterSpacing: -0.4 },

  specialties: { flexDirection: "row", gap: 10 },
  specialty: { flex: 1, backgroundColor: PANEL, borderRadius: 6, padding: 10, borderTopWidth: 3, borderTopColor: ACCENT },
  specialtyTitle: { fontFamily: "Anybody", fontWeight: 700, fontSize: 12.5, letterSpacing: -0.3 },
  specialtyLead: { fontSize: 9, color: MUTED, marginTop: 2, marginBottom: 6, lineHeight: LH },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  chip: {
    fontSize: 9,
    lineHeight: 1.2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 0.75,
    borderColor: "#C9CBD1",
    backgroundColor: "#FFFFFF",
  },
  chipMaster: { backgroundColor: INK, borderColor: INK, color: "#ECEDEF", fontWeight: 500 },
  chipMedio: { color: MUTED, borderColor: LINE },
  otherSkills: { flexDirection: "row", marginTop: 8, gap: 8 },
  otherLabel: { width: 78, fontWeight: 700, fontSize: 9, lineHeight: LH },
  otherText: { flex: 1, fontSize: 9, color: MUTED, lineHeight: LH },
  legend: { flexDirection: "row", gap: 10, marginLeft: "auto", alignItems: "center" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendText: { fontSize: 8, color: MUTED },
  legendSwatch: { width: 8, height: 8, borderRadius: 2, borderWidth: 0.75 },

  job: { flexDirection: "row", gap: 12 },
  rail: { width: 30, alignItems: "center" },
  logoTile: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 0.75,
    borderColor: LINE,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  logo: { width: 22, height: 22, objectFit: "contain" },
  logoInitial: { fontFamily: "Anybody", fontWeight: 800, fontSize: 12, color: MUTED },
  railLine: { flexGrow: 1, width: 1, backgroundColor: LINE, marginTop: 4 },
  jobBody: { flex: 1, paddingBottom: 10 },
  jobHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 2 },
  jobCompany: { fontFamily: "Anybody", fontWeight: 700, fontSize: 12.5, letterSpacing: -0.3 },
  jobDate: { fontSize: 9, color: MUTED, lineHeight: LH },
  jobTitle: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", columnGap: 8, flex: 1 },
  jobPosition: { fontSize: 9.5, fontWeight: 700, color: ACCENT_TEXT, lineHeight: LH },
  jobSummary: { fontSize: 9, color: "#2E3038", lineHeight: LH },
  bullets: { marginTop: 3 },
  bullet: { flexDirection: "row", gap: 6, fontSize: 9, lineHeight: LH },
  bulletMark: { width: 4, height: 4, backgroundColor: ACCENT, marginTop: 4.5 },
  bulletText: { flex: 1 },

  grid: { flexDirection: "row", gap: 10 },
  card: { flex: 1, borderWidth: 0.75, borderColor: LINE, borderRadius: 6, padding: 9 },
  cardTitle: { fontFamily: "Anybody", fontWeight: 700, fontSize: 12.5, letterSpacing: -0.3 },
  cardText: { fontSize: 9, color: "#2E3038", marginTop: 2, lineHeight: LH },
  cardMeta: { fontSize: 9, color: MUTED, lineHeight: LH },
  cardLink: { fontSize: 9, color: ACCENT_TEXT, textDecoration: "none", marginTop: 4, fontWeight: 500, lineHeight: LH },

  certs: { flexDirection: "row", flexWrap: "wrap", columnGap: 16, rowGap: 6 },
  cert: { width: "48.4%", borderLeftWidth: 2, borderLeftColor: ACCENT, paddingLeft: 7 },
  entryTitle: { fontSize: 9.5, fontWeight: 700, color: INK, lineHeight: LH },
  eduItem: { flex: 1, width: "auto" },
  langItem: { flex: 0.7, width: "auto" },
  certName: { fontSize: 9.5, fontWeight: 500, color: INK, textDecoration: "none", lineHeight: LH },

  footer: {
    position: "absolute",
    bottom: 22,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: MUTED,
    borderTopWidth: 0.75,
    borderTopColor: LINE,
    paddingTop: 6,
  },
});

const h = React.createElement;
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function formatDate(dateStr, fallback = "Presente") {
  if (!dateStr) return fallback;
  const [year, month] = dateStr.split("-");
  return month ? `${MONTHS[parseInt(month, 10) - 1]} ${year}` : year;
}

const range = (start, end) => `${formatDate(start)} – ${formatDate(end)}`;
const prettyUrl = (url) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

function resolveImage(imagePath) {
  if (!imagePath) return null;
  // react-pdf no renderiza SVG: se usa el PNG con el mismo nombre si existe
  const filePath = join(publicDir, imagePath.replace(/\.svg$/, ".png"));
  return /\.(png|jpe?g)$/i.test(filePath) && existsSync(filePath) ? filePath : null;
}

// Agrupa skills en las dos especialidades del sitio y un resto compacto
const LEVEL_ORDER = { Master: 0, Avanzado: 1, Medio: 2 };
const FRONTEND_ORDER = ["Next JS", "React", "TypeScript", "JavaScript", "Astro", "HTML", "CSS", "Tailwind", "Gatsby JS", "GraphQL", "Angular", "Vue JS", "Svelte", "Figma"];
const TOOLING = /^(AWS|Git)/;

function groupSkills(skills) {
  const seen = new Set();
  const unique = skills.filter((s) => !seen.has(s.name) && seen.add(s.name));
  const byLevel = (a, b) => (LEVEL_ORDER[a.level] ?? 3) - (LEVEL_ORDER[b.level] ?? 3);
  const ai = unique.filter((s) => s.keywords?.includes("IA")).sort(byLevel);
  const frontend = FRONTEND_ORDER.map((n) => unique.find((s) => s.name === n)).filter(Boolean);
  const taken = new Set([...ai, ...frontend].map((s) => s.name));
  const rest = unique.filter((s) => !taken.has(s.name));
  // El resto va en una línea: backend por nivel y luego cloud/herramientas
  const other = [
    ...rest.filter((s) => !TOOLING.test(s.name)).sort(byLevel),
    ...rest.filter((s) => TOOLING.test(s.name)),
  ];
  return { ai, frontend, other };
}

const { basics, work, education, skills, projects = [], languages, certificates } = cv;
const skillGroups = groupSkills(skills);
const profileImage = resolveImage(basics.image);
// El rol más reciente va completo; el resto se resume en sus primeras frases
const sentences = (text, count) =>
  text.split(/(?<=[.!?])\s+/).slice(0, count).join(" ");
const summaryFor = (job, index) =>
  index === 0 ? job.summary : sentences(job.summary, index < 5 ? 2 : 1);

function splitName(name) {
  const words = name.split(" ");
  const half = Math.ceil(words.length / 2);
  return [words.slice(0, half).join(" "), words.slice(half).join(" ")];
}

function SectionTitle(title, extra) {
  return h(
    View,
    { style: styles.sectionHead, minPresenceAhead: 60 },
    h(View, { style: styles.sectionBar }),
    h(Text, { style: styles.sectionTitle }, title),
    extra || null
  );
}

function Chip(skill) {
  return h(
    Text,
    {
      key: skill.name,
      style: [
        styles.chip,
        skill.level === "Master" && styles.chipMaster,
        skill.level === "Medio" && styles.chipMedio,
      ].filter(Boolean),
    },
    skill.name
  );
}

function Specialty(title, lead, items) {
  return h(
    View,
    { style: styles.specialty },
    h(Text, { style: styles.specialtyTitle }, title),
    h(Text, { style: styles.specialtyLead }, lead),
    h(View, { style: styles.chips }, ...items.map(Chip))
  );
}

function LegendItem(label, swatch) {
  return h(
    View,
    { key: label, style: styles.legendItem },
    h(View, { style: [styles.legendSwatch, swatch] }),
    h(Text, { style: styles.legendText }, label)
  );
}

function Job(job, index) {
  const logo = resolveImage(job.image);
  const isLast = index === work.length - 1;
  const showHighlights = index === 0 && job.highlights?.length;
  const summary = summaryFor(job, index);
  return h(
    View,
    { key: `${job.name}-${job.startDate}`, style: styles.job, wrap: false },
    h(
      View,
      { style: styles.rail },
      h(
        View,
        { style: styles.logoTile },
        logo
          ? h(Image, { style: styles.logo, src: logo })
          : h(Text, { style: styles.logoInitial }, job.name.replace(/[^A-Za-z]/g, "").charAt(0))
      ),
      isLast ? null : h(View, { style: styles.railLine })
    ),
    h(
      View,
      { style: styles.jobBody },
      h(
        View,
        { style: styles.jobHead },
        h(
          View,
          { style: styles.jobTitle },
          job.url
            ? h(Link, { src: job.url, style: [styles.link, styles.jobCompany] }, job.name)
            : h(Text, { style: styles.jobCompany }, job.name),
          h(Text, { style: styles.jobPosition }, job.position)
        ),
        h(Text, { style: styles.jobDate }, range(job.startDate, job.endDate))
      ),
      h(Text, { style: styles.jobSummary }, summary),
      showHighlights
        ? h(
            View,
            { style: styles.bullets },
            ...job.highlights.map((text, i) =>
              h(
                View,
                { key: i, style: styles.bullet },
                h(View, { style: styles.bulletMark }),
                h(Text, { style: styles.bulletText }, text)
              )
            )
          )
        : null
    )
  );
}

function Product(project) {
  return h(
    View,
    { key: project.name, style: styles.card, wrap: false },
    h(Text, { style: styles.cardTitle }, project.name),
    h(Text, { style: styles.cardText }, project.description),
    project.url
      ? h(Link, { src: project.url, style: styles.cardLink }, prettyUrl(project.url))
      : null
  );
}

function Certificate(cert) {
  const meta = [cert.issuer, cert.date ? formatDate(cert.date) : null].filter(Boolean).join(", ");
  return h(
    View,
    { key: cert.name, style: styles.cert, wrap: false },
    cert.url
      ? h(Link, { src: cert.url, style: styles.certName }, cert.name)
      : h(Text, { style: styles.certName }, cert.name),
    h(Text, { style: styles.cardMeta }, meta)
  );
}

const contactItems = [
  basics.email && { label: basics.email, src: `mailto:${basics.email}` },
  basics.phone && { label: basics.phone, src: `tel:${basics.phone.replace(/\s/g, "")}` },
  basics.location && { label: `${basics.location.city}, ${basics.location.region}` },
  // Usuario visible solo si es un handle (sin espacios)
  ...(basics.profiles || []).map((p) => ({
    label: p.username && !/\s/.test(p.username) ? `${p.network} @${p.username}` : p.network,
    src: p.url,
  })),
].filter(Boolean);

const CVDocument = () =>
  h(
    Document,
    { title: `CV ${basics.name}`, author: basics.name, subject: basics.label, language: "es" },
    h(
      Page,
      { size: "A4", style: styles.page },

      // Pie
      h(
        View,
        { style: styles.footer, fixed: true },
        h(Text, null, basics.name),
        h(Text, { render: ({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}` })
      ),

      // Encabezado
      h(
        View,
        { style: styles.header },
        h(
          View,
          { style: styles.headerMain },
          h(View, { style: styles.accentBar }),
          ...splitName(basics.name).map((line) => h(Text, { key: line, style: styles.name }, line)),
          h(Text, { style: styles.label }, basics.label),
          h(
            View,
            { style: styles.contact },
            ...contactItems.map((item) =>
              item.src
                ? h(Link, { key: item.label, src: item.src, style: styles.contactItem }, item.label)
                : h(Text, { key: item.label, style: styles.contactItem }, item.label)
            )
          )
        ),
        profileImage ? h(Image, { style: styles.photo, src: profileImage }) : null
      ),

      h(Text, { style: styles.summary }, basics.summary),

      // Especialidades
      h(
        View,
        { style: styles.section, wrap: false },
        SectionTitle(
          "Especialidades",
          h(
            View,
            { style: styles.legend },
            LegendItem("Dominio", { backgroundColor: INK, borderColor: INK }),
            LegendItem("Avanzado", { backgroundColor: "#FFFFFF", borderColor: "#B5B8BF" }),
            LegendItem("Intermedio", { backgroundColor: "#FFFFFF", borderColor: LINE })
          )
        ),
        h(
          View,
          { style: styles.specialties },
          Specialty("Frontend", "Next.js primero, performance web y micro-frontends.", skillGroups.frontend),
          Specialty("IA y agentes", "Harnesses, contexto, herramientas y evaluación.", skillGroups.ai)
        ),
        skillGroups.other.length
          ? h(
              View,
              { style: styles.otherSkills },
              h(Text, { style: styles.otherLabel }, "Backend y cloud"),
              h(Text, { style: styles.otherText }, skillGroups.other.map((s) => s.name).join(", "))
            )
          : null
      ),

      // Experiencia
      h(View, { style: styles.section }, SectionTitle("Experiencia"), ...work.map(Job)),

      // Productos propios
      projects.length
        ? h(
            View,
            { style: styles.section, wrap: false },
            SectionTitle("Productos"),
            h(View, { style: styles.grid }, ...projects.map(Product))
          )
        : null,

      // Educación e idiomas
      h(
        View,
        { style: styles.section, wrap: false },
        SectionTitle("Educación e idiomas"),
        h(
          View,
          { style: styles.grid },
          ...education.map((edu) =>
            h(
              View,
              { key: `${edu.institution}-${edu.area}`, style: [styles.cert, styles.eduItem] },
              h(Text, { style: styles.entryTitle }, edu.area),
              h(Text, { style: styles.cardMeta }, edu.institution),
              h(Text, { style: styles.cardMeta }, range(edu.startDate, edu.endDate))
            )
          ),
          languages?.length
            ? h(
                View,
                { style: [styles.cert, styles.langItem] },
                ...languages.map((lang) =>
                  h(
                    View,
                    { key: lang.language },
                    h(Text, { style: styles.entryTitle }, lang.language),
                    h(Text, { style: styles.cardMeta }, lang.fluency)
                  )
                )
              )
            : null
        )
      ),

      // Certificaciones
      certificates?.length
        ? h(
            View,
            { style: styles.section },
            SectionTitle("Certificaciones"),
            h(View, { style: styles.certs }, ...certificates.map(Certificate))
          )
        : null
    )
  );

const outputPath = join(publicDir, "cv-juan-carlos-ayala.pdf");
await renderToFile(h(CVDocument), outputPath);
console.log(`CV PDF generated: ${outputPath}`);
