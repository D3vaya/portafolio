import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  // El CSS va incrustado en el HTML: evita una petición que bloquea el primer render
  build: { inlineStylesheets: "always" },
});
