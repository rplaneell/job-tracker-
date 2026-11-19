import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { CHROME_AT_MS, LABEL_DELAY_MS, TOWER_WINDOW, introFrame, towerScale } from '../domain/intro';
import { introClock, introGate, introNow } from '../state/introClock';
import { useHq } from '../state/useHq';
import { FACADE, canvasUrl, drawClouds, drawFacade, drawInterior, drawSkyline } from './facade';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** How far, in pixels of the painted tower, the drone starts to the left of it. */
const GLIDE_PX = 520;

const root = () => document.documentElement.style;

/**
 * The opening animation, on screen. A drone climbs a glass tower from the street at dusk, coming up its left side, with the sky
 * brightening and clouds streaming past. It slides across to face the big window of the office floor. The real 3D office shows
 * through that window as a side view from the left, and as the tower falls away the view swings round into the normal view.
 *
 * The sky sits behind the 3D office and the tower in front of it, with the window cut out of the tower, so the 3D office is seen
 * through real glass. The 3D side reads the same clock. Click or press any key to skip. People who ask their system for less
 * motion get only a short fade.
 */
export function Intro() {
  const [alive, setAlive] = useState(introClock.enabled);
  const [textures, setTextures] = useState<CSSProperties>({});
  const back = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const tilt = useRef<HTMLDivElement>(null);
  const plane = useRef<HTMLDivElement>(null);
  const backWorld = useRef<HTMLDivElement>(null);
  const backTilt = useRef<HTMLDivElement>(null);
  const backPlane = useRef<HTMLDivElement>(null);
  const ghostA = useRef<HTMLDivElement>(null);
  const ghostB = useRef<HTMLDivElement>(null);
  const skyline = useRef<HTMLDivElement>(null);
  const clouds = useRef<HTMLDivElement>(null);
  const dusk = useRef<HTMLDivElement>(null);
  const sun = useRef<HTMLDivElement>(null);
  const haze = useRef<HTMLDivElement>(null);
  const vignette = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const setChromeOn = useHq((s) => s.setChromeOn);
  const setLabelsOn = useHq((s) => s.setLabelsOn);
  const motion = introClock.enabled && !introClock.reduced;

  // The 3D office is hidden until the window of the tower is in front of it. This runs before the first paint.
  useLayoutEffect(() => {
    if (motion) root().setProperty('--office-opacity', '0');
    return () => {
      root().removeProperty('--office-opacity');
      root().removeProperty('--office-clip');
    };
  }, [motion]);

  // Paint the tower, the city and the clouds once, while the office is still loading. They arrive as CSS variables.
  useEffect(() => {
    if (!motion) return;
    let cancelled = false;
    // If painting is ever slow, do not make people wait for it for long: start without the tower after a few seconds.
    const giveUp = window.setTimeout(() => introGate.picturesReady(), 4000);
    void Promise.all([canvasUrl(drawFacade()), canvasUrl(drawSkyline()), canvasUrl(drawClouds()), canvasUrl(drawInterior())]).then(([facade, skylineUrl, cloudsUrl, interior]) => {
      if (cancelled) return;
      setTextures({ '--facade': facade, '--skyline': skylineUrl, '--clouds': cloudsUrl, '--interior': interior } as CSSProperties);
      // Give the page one frame to put the pictures in place before the clock starts.
      requestAnimationFrame(() => introGate.picturesReady());
    });
    return () => {
      cancelled = true;
      window.clearTimeout(giveUp);
    };
  }, [motion]);

  useEffect(() => {
    if (!introClock.enabled) {
      document.body.dataset.intro = 'done';
      return;
    }
    let raf = 0;
    let labelTimer = 0;
    let chromeShown = false;
    const skip = () => introClock.skip();
    const onKey = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey && !e.altKey) skip();
    };
    const set = (el: HTMLElement | null, prop: 'transform' | 'opacity', value: string) => {
      if (el) el.style[prop] = value;
    };
    const tick = () => {
      const ms = introNow();
      const f = introFrame(ms, introClock.reduced);
      if (veil.current) veil.current.style.opacity = String(f.veil);
      if (!introClock.reduced) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const k = towerScale(w, h);
        const centerY = lerp(FACADE.startY, FACADE.endY, f.climb);
        const glidePx = f.glide * GLIDE_PX * k; // the tower starts off to the right, because the drone is on its left
        const blur = f.speed * 70; // how far the ghost copies trail, to streak the windows when the drone is fast
        const shift = (dy: number) => `translateX(${glidePx}px) scale(${k}) translateY(${FACADE.h / 2 - centerY + dy}px)`;
        const worldMove = `translateX(${f.drift}%) rotate(${f.roll}deg) scale(${f.wallScale})`;
        set(world.current, 'transform', worldMove);
        set(world.current, 'opacity', String(f.wallOpacity));
        // The room behind the office moves exactly as the tower does, so it stays in the window.
        set(backWorld.current, 'transform', worldMove);
        set(backWorld.current, 'opacity', String(f.wallOpacity));
        set(back.current, 'opacity', String(f.wallOpacity));
        set(tilt.current, 'transform', `rotateX(${f.tilt}deg)`);
        set(backTilt.current, 'transform', `rotateX(${f.tilt}deg)`);
        set(plane.current, 'transform', shift(0));
        set(backPlane.current, 'transform', shift(0));
        set(ghostA.current, 'transform', shift(blur));
        set(ghostA.current, 'opacity', String(f.speed * 0.34));
        set(ghostB.current, 'transform', shift(-blur));
        set(ghostB.current, 'opacity', String(f.speed * 0.26));
        // City and clouds drift past more slowly than the tower, which gives the climb its depth.
        set(skyline.current, 'transform', `translateY(${lerp(-80, 320, f.climb)}px) translateX(${glidePx * 0.3}px) scale(${k})`);
        set(clouds.current, 'transform', `translateY(${lerp(-1000, 1000, f.climb)}px) scale(${k * 1.25})`);
        set(clouds.current, 'opacity', String(Math.sin(Math.PI * f.climb) * 0.9));
        set(dusk.current, 'opacity', String(1 - f.climb));
        set(sun.current, 'opacity', String(f.climb * 0.9));
        set(haze.current, 'opacity', String((1 - f.climb) * 0.8));
        set(vignette.current, 'opacity', String(1 - f.climb));

        // The real office shows only through the window, so it is cut to the same rectangle, slightly inside it (the steel frame
        // covers the difference). The rectangle follows the window as the tower slides across and then grows past the screen.
        const s = f.wallScale;
        const cx = w / 2 + glidePx * s;
        const hw = (TOWER_WINDOW.w / 2 - 6) * k * s;
        const hh = (TOWER_WINDOW.h / 2 - 6) * k * s;
        // As the drone zooms out the office is let out of its window: the cut opens up to the whole screen.
        const open = f.release;
        const top = lerp(h / 2 - hh, 0, open);
        const left = lerp(cx - hw, 0, open);
        const right = lerp(w - (cx + hw), 0, open);
        const bottom = lerp(h - (h / 2 + hh), 0, open);
        const covers = top <= 0 && left <= 0 && right <= 0 && bottom <= 0;
        root().setProperty('--office-clip', covers ? 'none' : `inset(${Math.max(0, top)}px ${Math.max(0, right)}px ${Math.max(0, bottom)}px ${Math.max(0, left)}px)`);
        root().setProperty('--office-opacity', String(f.office));
      }
      if (!chromeShown && ms >= (introClock.reduced ? 0 : CHROME_AT_MS)) {
        chromeShown = true;
        setChromeOn(true);
      }
      if (!f.active) {
        root().removeProperty('--office-opacity');
        root().removeProperty('--office-clip');
        setChromeOn(true);
        labelTimer = window.setTimeout(() => setLabelsOn(true), LABEL_DELAY_MS);
        document.body.dataset.intro = 'done';
        setAlive(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', skip);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(labelTimer);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', skip);
    };
  }, [setChromeOn, setLabelsOn]);

  if (!alive) return null;

  if (introClock.reduced) {
    return <div ref={veil} className="intro-veil" aria-hidden="true" />;
  }

  // The size of every painted layer comes from the painting itself, so the two cannot drift apart.
  const planeBox: CSSProperties = { height: FACADE.h, top: -FACADE.h / 2 };
  const interiorBox: CSSProperties = { ...planeBox, backgroundPosition: `${FACADE.window.x}px ${FACADE.window.y}px`, backgroundSize: `${FACADE.window.w}px ${FACADE.window.h}px` };

  return (
    <>
      {/* Behind the 3D office: the sky and the city. */}
      <div ref={back} className="intro-back" style={textures} aria-hidden="true">
        <div className="climb-sky" />
        <div ref={dusk} className="climb-dusk" />
        <div ref={sun} className="climb-sun" style={{ opacity: 0 }} />
        <div ref={skyline} className="climb-skyline" />
        <div ref={backWorld} className="climb-world">
          <div className="climb-stage">
            <div ref={backTilt} className="climb-tilt">
              <div ref={backPlane} className="climb-plane climb-interior" style={interiorBox} />
            </div>
          </div>
        </div>
      </div>
      {/* In front of the 3D office: the tower with its window cut out, the clouds, and the flash. */}
      <div className="intro" style={textures} aria-hidden="true">
        <div ref={world} className="climb-world">
          <div className="climb-stage">
            <div ref={tilt} className="climb-tilt">
              <div ref={ghostA} className="climb-plane climb-ghost" style={planeBox} />
              <div ref={ghostB} className="climb-plane climb-ghost" style={planeBox} />
              <div ref={plane} className="climb-plane" style={planeBox} />
            </div>
          </div>
          <div ref={clouds} className="climb-clouds" />
          <div ref={haze} className="climb-haze" />
          <div ref={vignette} className="climb-vignette" />
        </div>
      </div>
    </>
  );
}
