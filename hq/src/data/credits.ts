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
    title: 'Ape-like Goblin (Gameready)',
    author: 'Livagof',
    url: 'https://sketchfab.com/3d-models/ape-like-goblin-gameready-573e13159e7a4b2cad3fe34a1c754dcc',
    use: 'The Scouting goblins',
  },
  {
    file: 'cv_tailor.glb',
    title: 'Low poly ordinary man in shirt and pants',
    author: 'Agor_2012',
    url: 'https://sketchfab.com/3d-models/low-poly-ordinary-man-in-shirt-and-pants-f658b9e1bb324f2ab1e9f00d7d6b4065',
    use: 'The CV Tailor',
  },
  {
    file: 'linkedin_host.glb',
    title: 'Casual NPC Woman | Free Low-Poly 3D Model',
    author: 'Stas_SayHallo',
    url: 'https://sketchfab.com/3d-models/casual-npc-woman-free-low-poly-3d-model-48902da4e3f8494b80e349a3cb819385',
    use: 'The LinkedIn desk host',
  },
];
