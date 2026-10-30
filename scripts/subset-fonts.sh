#!/usr/bin/env bash
# Recorta las fuentes variables a los caracteres y rangos que usa el sitio.
# Requiere fonttools con brotli (pip install fonttools brotli).
# Volver a correr si el contenido usa caracteres fuera del conjunto de abajo.
set -euo pipefail

cd "$(dirname "$0")/.."
OUT=src/assets/fonts
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# ASCII imprimible, letras y signos del español y tipografía común
UNICODES="U+0020-007E,U+00A0,U+00A1,U+00BF,U+00E1,U+00E9,U+00ED,U+00F3,U+00FA,U+00FC,U+00F1,U+00C1,U+00C9,U+00CD,U+00D3,U+00DA,U+00DC,U+00D1,U+00AB,U+00BB,U+00B0,U+00B7,U+00A9,U+00AE,U+00BA,U+00AA,U+00D7,U+2013-2014,U+2018-201D,U+2022,U+2026,U+20AC,U+2122,U+2191-2193"
FEATURES="kern,liga,calt,mark,mkmk,tnum,lnum,case"

subset() {
  local src=$1 name=$2 axes=$3
  fonttools varLib.instancer "$src" $axes -o "$TMP/$name.ttf" --quiet
  pyftsubset "$TMP/$name.ttf" \
    --unicodes="$UNICODES" \
    --layout-features="$FEATURES" \
    --no-hinting \
    --flavor=woff2 \
    --output-file="$OUT/$name.woff2"
  echo "$OUT/$name.woff2 $(wc -c < "$OUT/$name.woff2") bytes"
}

subset node_modules/@fontsource-variable/anybody/files/anybody-latin-wdth-normal.woff2 anybody "wght=500:900 wdth=50:150"
subset node_modules/@fontsource-variable/schibsted-grotesk/files/schibsted-grotesk-latin-wght-normal.woff2 schibsted "wght=400:800"
