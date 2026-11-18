// Downloads CC0 assets from Poly Haven (https://polyhaven.com/license) into assets-src/.
// Every file is checked against the MD5 checksum the Poly Haven API publishes, and the
// author, source link and licence are written to assets-src/polyhaven-sources.json
// so they can be copied into assets-src/LICENSES.md.
//
// Usage: node scripts/fetch-polyhaven.mjs
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const API = 'https://api.polyhaven.com';
const OUT = 'assets-src';

// Edit this list to change what gets downloaded. Categories match public/assets/<category>.
const MANIFEST = {
  models: {
    furniture: [
      'metal_office_desk',
      'modern_arm_chair_01',
      'modern_wooden_cabinet',
      'modern_coffee_table_01',
      'sofa_03',
      'steel_frame_shelves_03',
      'round_wooden_table_01',
    ],
    decorations: [
      'potted_plant_01',
      'potted_plant_02',
      'potted_plant_04',
      'desk_lamp_arm_01',
      'modern_ceiling_lamp_01',
    ],
    props: [
      'classic_laptop',
      'clipboard',
      'office_notepads',
      'stationery_supplies',
      'television_02',
      'projector_screen',
      'CoffeeCart_01',
    ],
  },
  textures: ['beige_wall_001', 'brushed_concrete', 'brick_wall_001'],
  hdris: ['blocky_photo_studio', 'brown_photostudio_02'],
};

const sources = [];

async function getJson(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`${path} returned ${res.status}`);
  return res.json();
}

async function download(url, md5, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const actual = createHash('md5').update(buf).digest('hex');
  if (md5 && actual !== md5) throw new Error(`Checksum mismatch for ${url}`);
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, buf);
}

async function record(id, kind, category) {
  const info = await getJson(`/info/${id}`);
  sources.push({
    id,
    kind,
    category,
    name: info.name,
    authors: Object.keys(info.authors ?? {}),
    source: `https://polyhaven.com/a/${id}`,
    licence: 'CC0 1.0 (public domain), https://polyhaven.com/license',
    polycount: info.polycount ?? null,
    date: new Date().toISOString().slice(0, 10),
  });
}

for (const [category, ids] of Object.entries(MANIFEST.models)) {
  for (const id of ids) {
    try {
      const files = await getJson(`/files/${id}`);
      const gltf = files.gltf?.['1k']?.gltf;
      if (!gltf) throw new Error('no 1k glTF available');
      const dir = join(OUT, 'models', 'polyhaven', category, id);
      await download(gltf.url, gltf.md5, join(dir, `${id}.gltf`));
      for (const [rel, f] of Object.entries(gltf.include ?? {})) {
        await download(f.url, f.md5, join(dir, rel));
      }
      await record(id, 'model', category);
      console.log(`ok   model   ${category}/${id}`);
    } catch (e) {
      console.log(`FAIL model   ${category}/${id}: ${e.message}`);
    }
  }
}

for (const id of MANIFEST.textures) {
  try {
    const files = await getJson(`/files/${id}`);
    const dir = join(OUT, 'textures', 'polyhaven', id);
    for (const map of ['Diffuse', 'nor_gl', 'arm']) {
      const f = files[map]?.['1k']?.jpg;
      if (!f) throw new Error(`missing ${map} 1k jpg`);
      await download(f.url, f.md5, join(dir, `${id}_${map}_1k.jpg`));
    }
    await record(id, 'texture', 'textures');
    console.log(`ok   texture ${id}`);
  } catch (e) {
    console.log(`FAIL texture ${id}: ${e.message}`);
  }
}

for (const id of MANIFEST.hdris) {
  try {
    const files = await getJson(`/files/${id}`);
    const f = files.hdri?.['1k']?.hdr;
    if (!f) throw new Error('missing 1k hdr');
    await download(f.url, f.md5, join(OUT, 'environments', 'polyhaven', `${id}_1k.hdr`));
    await record(id, 'hdri', 'environments');
    console.log(`ok   hdri    ${id}`);
  } catch (e) {
    console.log(`FAIL hdri    ${id}: ${e.message}`);
  }
}

await writeFile(join(OUT, 'polyhaven-sources.json'), JSON.stringify(sources, null, 2) + '\n');
console.log(`\n${sources.length} assets recorded in ${OUT}/polyhaven-sources.json`);
