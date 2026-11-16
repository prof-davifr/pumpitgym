#!/usr/bin/env bash
# Baixa a biblioteca de detecção de pose e o modelo para vendor/mediapipe,
# assim o jogo funciona sem internet.
set -euo pipefail
cd "$(dirname "$0")/.."
DEST=vendor/mediapipe
VERSAO=${VERSAO:-1.0.1}
MODELOS=https://storage.googleapis.com/mediapipe-models/pose_landmarker

mkdir -p "$DEST/wasm"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "Baixando @mediapipe/tasks-vision@$VERSAO..."
(cd "$TMP" && npm pack "@mediapipe/tasks-vision@$VERSAO" >/dev/null && tar xzf ./*.tgz)
cp "$TMP/package/vision_bundle.mjs" "$DEST/"
cp "$TMP"/package/wasm/vision_wasm_internal.{js,wasm} "$DEST/wasm/"
cp "$TMP"/package/wasm/vision_wasm_nosimd_internal.{js,wasm} "$DEST/wasm/"

echo "Baixando os modelos de pose (normal e preciso)..."
for TIPO in lite full; do
  curl -fsSL "$MODELOS/pose_landmarker_$TIPO/float16/latest/pose_landmarker_$TIPO.task" -o "$DEST/pose_landmarker_$TIPO.task"
done

echo "Pronto: $DEST"
