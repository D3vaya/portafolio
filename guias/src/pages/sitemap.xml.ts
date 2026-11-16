import type { APIRoute } from "astro";
import { guides } from "../data/guides";
import { views as ccViews } from "../guides/claude-code/views";
import { views as gitViews } from "../guides/git/views";

/** Sitemap generado al compilar: la biblioteca, cada guía publicada y cada vista de sus guías. */
export const GET: APIRoute = ({ site }) => {
  const lastmod = new Date().toISOString().slice(0, 10);
  const paths = ["/", ...ccViews.map((v) => v.url), ...gitViews.map((v) => v.url)];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${new URL(p, site).href}</loc><lastmod>${lastmod}</lastmod></url>`).join("\n")}
</urlset>
`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
