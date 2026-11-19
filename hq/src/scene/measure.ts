import { AnimationMixer, Box3, type AnimationClip, type Object3D } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * How to size and place a model so it stands on the floor at its spot, at the wanted height. It is measured on a separate copy
 * that is not placed anywhere, in the pose it stands in, so the numbers describe only the model (not where it is in the office).
 */
export function measureModel(scene: Object3D, animations: AnimationClip[], height: number, poseSuffix: string): { scale: number; offset: [number, number, number] } {
  const probe = clone(scene);
  const pose = animations.find((a) => a.name.endsWith(poseSuffix));
  if (pose) new AnimationMixer(probe).clipAction(pose).play().getMixer().update(0.05);
  probe.updateMatrixWorld(true);
  const box = new Box3().setFromObject(probe, true);
  const h = box.max.y - box.min.y;
  if (!(h > 0.05)) return { scale: 1, offset: [0, 0, 0] };
  return { scale: height / h, offset: [-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2] };
}
