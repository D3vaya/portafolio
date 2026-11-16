/* Tipos de los datos de las vistas «Problemas» y «Estrategias». Sin DOM: se usan en el build y en el navegador. */
import type { Flujo } from "./flujo";
import type { Nodo } from "../anim/_kit";

/** Igual que c() del kit, sin cargar GSAP (estos datos también se leen en el build). */
export const c = (id: string, x: number, y: number, p?: string | string[], extra: Partial<Nodo> = {}): Nodo => ({
  id, x, y, p: p ? (Array.isArray(p) ? p : [p]) : undefined, ...extra,
});

export type Riesgo = "bajo" | "medio" | "alto";

export type Grupo = { id: string; label: string };

/** Un problema común de un flujo de trabajo en equipo y el flujo recomendado para salir de él. */
export type Caso = {
  id: string;
  grupo: string;
  /** Cómo lo diría quien lo busca (es el título h2). */
  q: string;
  /** Lo que ves: una o dos frases. */
  sintoma: string;
  /** Mensaje real de Git o de la plataforma, si lo hay (texto plano). */
  msg?: string;
  /** Por qué pasa (HTML corto). */
  causa: string;
  /** Animación paso a paso del flujo recomendado. */
  flujo: Flujo;
  /** Los comandos del flujo, listos para copiar. */
  comandos: string;
  alternativa?: string;
  prevencion: string;
  riesgo: Riesgo;
  /** Vista de la guía donde se explica a fondo. */
  leccion?: string;
  /** Palabras extra para el buscador. */
  claves?: string;
};

/** Una estrategia de ramas que se usa hoy. */
export type Estrategia = {
  id: string;
  nombre: string;
  idea: string;
  ramas: string;
  libera: string;
  sirve: string;
  noSirve: string;
  problemas: string;
  /** Configuración o comandos clave (bloque de código). */
  clave: string;
  flujo: Flujo;
  fuentes: { t: string; url: string }[];
};
