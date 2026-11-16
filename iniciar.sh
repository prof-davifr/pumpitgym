#!/usr/bin/env bash
# Abre o app no computador: sobe um servidor local e abre o Chrome em tela cheia, com câmera e som liberados.
set -euo pipefail
cd "$(dirname "$0")"
PORTA=${PORTA:-8770}

if [ ! -f vendor/mediapipe/pose_landmarker_lite.task ]; then
  echo "Baixando a detecção de pose (precisa de internet)..."
  ./ferramentas/baixar-mediapipe.sh
fi

# Na luz fraca, a exposição automática pode baixar a câmera de 30 para 15 quadros/s, o que atrasa
# a leitura dos movimentos: a taxa de quadros fica fixa.
if command -v v4l2-ctl >/dev/null; then
  for DISPOSITIVO in /dev/video*; do
    v4l2-ctl -d "$DISPOSITIVO" --set-ctrl=auto_exposure=3 >/dev/null 2>&1 || true
    v4l2-ctl -d "$DISPOSITIVO" --set-ctrl=exposure_dynamic_framerate=0 >/dev/null 2>&1 || true
  done
fi

# Só reaproveita um servidor que já serve este app. O app não pode trocar de porta,
# porque os dados salvos no navegador ficam presos a ela.
PAGINA=$(curl -s "http://localhost:$PORTA/index.html" || true)
if [[ "$PAGINA" != *"<title>pumpitgym</title>"* ]]; then
  if curl -s -o /dev/null "http://localhost:$PORTA/"; then
    echo "A porta $PORTA está ocupada por outro programa. Feche esse programa e abra o app de novo." >&2
    exit 1
  fi
  python3 ferramentas/servidor.py "$PORTA" >/dev/null 2>&1 &
  SERVIDOR=$!
  trap 'kill $SERVIDOR 2>/dev/null' EXIT
  sleep 1
fi

NAVEGADOR=$(command -v google-chrome || command -v chromium || command -v chromium-browser || true)
URL="http://localhost:$PORTA/"
if [ -z "$NAVEGADOR" ]; then
  echo "Abra $URL no navegador."
  wait
  exit 0
fi

"$NAVEGADOR" --user-data-dir="$HOME/.cache/pumpitgym" \
  --autoplay-policy=no-user-gesture-required \
  --use-fake-ui-for-media-stream \
  --start-fullscreen --app="$URL" \
  --no-first-run --no-default-browser-check
