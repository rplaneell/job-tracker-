export interface Credit {
  file: string;
  title: string;
  author: string;
  url: string;
  use: string;
}

/** One entry per file in public/models. A test fails if a model has no credit. */
export const CREDITS: Credit[] = [
  {
    file: 'office.glb',
    title: 'Isometric office',
    author: 'Companion_Cube',
    url: 'https://sketchfab.com/3d-models/isometric-office-d31464eed8044190911b221648aca432',
    use: 'The office building',
  },
  {
    file: 'manager.glb',
    title: 'Business Female_3_ Low Poly Style',
    author: 'POLYTRICITY',
    url: 'https://sketchfab.com/3d-models/business-female-3--low-poly-style-187cc3d5af4341d58615d7201f49ecab',
    use: 'The Office Manager',
  },
  {
    file: 'goblin.glb',
    title: 'Low Poly Goblin (Rigged)',
    author: 'Yanez Designs',
    url: 'https://sketchfab.com/3d-models/low-poly-goblin-rigged-7dc07eff136d4725ac6d1d5001656182',
    use: 'The Scouting goblins',
  },
];
