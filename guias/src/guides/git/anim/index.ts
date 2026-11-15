// Monta las animaciones (escenas) de la guía de Git que estén en la página actual.
// Cada archivo de esta carpeta exporta una Escena; su nombre de archivo es el valor de data-escena.
// Se cargan bajo demanda: cada página descarga solo sus escenas y un error queda aislado en la suya.
import { montar, type Escena } from "../../../scripts/escena";

const mods = import.meta.glob<Record<string, unknown>>(["./*.ts", "!./index.ts", "!./_*.ts"]);

document.querySelectorAll<HTMLElement>("[data-escena]").forEach(async (el) => {
  const load = mods[`./${el.dataset.escena}.ts`];
  if (!load) return;
  try {
    const mod = await load();
    const e = Object.values(mod).find((v): v is Escena => !!v && typeof v === "object" && "steps" in v && "go" in v);
    if (e) montar(el, e);
  } catch (err) {
    console.warn("[escena]", el.dataset.escena, err);
  }
});
