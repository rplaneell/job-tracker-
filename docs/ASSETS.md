# 3D asset workflow

## Folders

Runtime files (served to the browser) live in `public/assets/`: `characters`, `buildings`, `furniture`, `decorations`, `textures`, `environments`, `animations`, `ui`.

Raw and unoptimised originals live in `assets-src/` and are never shipped.

## Licence checklist (do this before adding any file)

1. Find the licence on the page you got the model from.
2. Prefer CC0 (public domain). CC BY is fine if you credit the author. Avoid anything labelled non commercial, no derivatives, or "editorial use only".
3. Record the file, author, source link, licence and date in `assets-src/LICENSES.md`.
4. If you cannot find a clear licence, do not use the file.

Sources to check (each model still needs its own licence read): Kenney (CC0 packs), Quaternius (CC0), Poly Pizza (mixed, check each), Sketchfab (mixed, check each, filter by downloadable and licence), polyhaven.com (CC0 textures and HDRIs).

## Pipeline

1. Put the original in `assets-src/models/`.
2. Optimise: `npm run assets:optimize -- assets-src/models/desk.glb public/assets/furniture/desk.glb`. This deduplicates, prunes, resizes textures and compresses.
3. Generate a component: `npm run gltf -- public/assets/furniture/desk.glb --types --transform --output src/scene/environment/generated/Desk.tsx`. The `--types` flag gives you typed node names. Generated files go in a `generated/` folder (excluded from Prettier).
4. Wrap the generated component in a hand written component with props. Never edit generated files by hand.

## Optimisation targets

* Use GLB (one binary file) rather than loose GLTF.
* Keep each prop under about 50k triangles, characters under about 30k.
* Textures: 1024 pixels for props, 2048 at most for hero items. Prefer KTX2 or WebP compression.
* Share materials between props, and use instancing (`<Instances>` from drei) for repeated items such as chairs and plants.
* Bake lighting and shadows where possible instead of many real time lights.
* Preload only what the first view needs (`useGLTF.preload`).

## Characters

* Rig once (humanoid skeleton), reuse the same animation clips (idle, walk, sit, type, wave) across all characters.
* Load clips with drei `useAnimations`. Clone skinned models with `SkeletonUtils.clone` (from `three/examples/jsm/utils/SkeletonUtils.js`) so several copies animate independently.
* Wrap in a single `<Character model= animation= />` component under `src/scene/characters/`.
