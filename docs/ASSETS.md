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

## What is in public/assets right now (46 models, 22 MB)

| Folder | Contents |
| --- | --- |
| furniture | 11 models: office desk, arm chair, cabinet, coffee table, round table, steel shelves, 3 sofas, 2 chairs |
| decorations | 8 models: 3 potted plants, desk lamp, ceiling lamp, 3 decorative lamps |
| props | 7 models: laptop, clipboard, notepads, stationery, TV, projector screen, coffee cart |
| environments/nature | 19 own trees and shrubs (holm oak, Aleppo pine, rosemary, kermes oak, juniper, broom) |
| environments | 2 studio lighting maps (HDR files) for the Environment lighting helper |
| textures | 3 wall and floor material sets (colour, normal and ARM maps, where ARM packs occlusion, roughness and metalness) |
| buildings, characters, animations, ui | Empty. See "Still missing" below |

All models are optimised (meshopt geometry compression, WebP textures at most 1024 pixels) and were each loaded in a real browser to confirm they work. Real sizes are in metres.

## Commands

* `npm run assets:fetch` downloads the CC0 Poly Haven set listed in `scripts/fetch-polyhaven.mjs` (edit the list to add more).
* `npm run assets:build` optimises every approved source model into `public/assets`.
* After any new optimisation, validate with `npx gltf-transform validate file.glb`. If it reports a texture coordinate error, keep `--prune-attributes false` (already set in the build script).
* Load compressed models with drei `useGLTF`, which already includes the meshopt decoder.

## Restricted models

The 13 IKEA models stay on the local disk only (see `assets-src/LICENSES.md`). They are not in Git and not in the app.

## Still missing

* **Characters.** No licensed, rigged and animated character was reachable from this environment (Kenney and Poly Pizza block it, Quaternius downloads were not reachable). Download on your own computer, check the licence, and drop the file into `assets-src/models/`. Good candidates to check: the Quaternius animated character and universal animation packs (CC0), Kenney character packs (CC0), and Mixamo (free with an Adobe account, but its terms are royalty free, not CC0, so read them). A humanoid skeleton with idle, walk, sit, type and wave clips is what the app needs.
* **Building shell.** The headquarters itself will be modelled or sourced later.
