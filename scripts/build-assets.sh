#!/usr/bin/env bash
# Optimises approved source models into public/assets (what the app serves).
# Folders under assets-src/models/ikea-personal-use are deliberately NOT processed:
# those models are for personal planning only and must never be shipped.
set -euo pipefail
cd "$(dirname "$0")/.."

opt() { # opt <input> <output>
  mkdir -p "$(dirname "$2")"
  npx --no-install gltf-transform optimize "$1" "$2" \
    --prune-attributes false --compress meshopt --texture-compress webp --texture-size 1024 >/dev/null 2>&1 \
    && echo "ok   $2" || echo "FAIL $2"
}

# Poly Haven models (CC0): category is the folder name under polyhaven/
for f in assets-src/models/polyhaven/*/*/*.gltf; do
  cat=$(basename "$(dirname "$(dirname "$f")")"); id=$(basename "$f" .gltf)
  opt "$f" "public/assets/$cat/$id.glb"
done

# Khronos sample models (CC0 or CC BY, credits in assets-src/LICENSES.md)
for n in GlamVelvetSofa SheenWoodLeatherSofa SheenChair ChairDamaskPurplegold; do
  opt "assets-src/models/khronos/$n.glb" "public/assets/furniture/$n.glb"
done
for n in IridescenceLamp AnisotropyBarnLamp LightsPunctualLamp; do
  opt "assets-src/models/khronos/$n.glb" "public/assets/decorations/$n.glb"
done

# Own nature models (trees and shrubs)
for f in assets-src/models/nature-own/*.glb; do
  opt "$f" "public/assets/environments/nature/$(basename "$f")"
done

# Poly Haven textures and HDRIs are already web ready: copy as is.
for d in assets-src/textures/polyhaven/*/; do
  mkdir -p "public/assets/textures/$(basename "$d")" && cp "$d"*.jpg "public/assets/textures/$(basename "$d")/"
done
mkdir -p public/assets/environments && cp assets-src/environments/polyhaven/*.hdr public/assets/environments/
echo done
