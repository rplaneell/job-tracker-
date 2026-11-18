import { Color, Material, MeshStandardMaterial, Object3D } from 'three';

/**
 * The Job HQ palette: warm white, sage green, soft blue and a little orange.
 * The office model arrived with dark mahogany and forest green, so its materials are recoloured here,
 * by name, without touching the model file. Colours are sRGB hex.
 */
export const FLAT: Record<string, string> = {
  Wall_material: '#b5c8b1', // sage walls
  Baseboard_material: '#9fbad2', // soft blue trim
  Pam_desk: '#6f9a86', // reception desk
  wood: '#c99d6e', // oak
  'wood.002': '#d9b384',
  wood_4: '#a67d57',
  'wood.004': '#b98b5e',
  floor: '#a39384', // edge of the floor slab
  Grey_shelfes: '#8c98a3',
  OfficeChair_Modern: '#a8856a',
};

/** Textured wood keeps its grain, but loses the red and gains light. */
export const GRADED = ['floor.001', 'wood.005'];

const GRADE = /* glsl */ `
  float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
  diffuseColor.rgb = mix(vec3(lum), diffuseColor.rgb, 0.42) * vec3(2.55, 2.25, 1.9);
`;

function grade(material: MeshStandardMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>\n${GRADE}`);
  };
  material.customProgramCacheKey = () => 'hq-grade';
  material.needsUpdate = true;
}

export function applyPalette(root: Object3D): void {
  const seen = new Set<Material>();
  root.traverse((o) => {
    const mesh = o as { material?: Material | Material[] };
    if (!mesh.material) return;
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      if (seen.has(m)) continue;
      seen.add(m);
      const std = m as MeshStandardMaterial;
      if (std.name in FLAT) {
        std.color = new Color(FLAT[std.name]);
        std.metalness = 0;
        std.needsUpdate = true;
      } else if (GRADED.includes(std.name)) {
        grade(std);
      }
    }
  });
}
