import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { CHROME_AT_MS, LABEL_DELAY_MS, introFrame } from '../domain/intro';
import { introClock, introGate, introNow } from '../state/introClock';
import { useHq } from '../state/useHq';
import { FACADE, canvasUrl, drawClouds, drawFacade, drawSkyline } from './facade';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * The opening animation, on screen: a drone climbs the glass tower from the street, floor after floor, with the sky
 * brightening and clouds streaming past. It slows to a stop at the tall lit office floor and flies in through the
 * glass as the 3D office builds itself behind it. The 3D side reads the same clock. Click or press any key to
 * skip. People who ask their system for less motion get only a short fade.
 */
export function Intro() {
  const [alive, setAlive] = useState(introClock.enabled);
  const [textures, setTextures] = useState<CSSProperties>({});
  const world = useRef<HTMLDivElement>(null);
  const tilt = useRef<HTMLDivElement>(null);
  const plane = useRef<HTMLDivElement>(null);
  const ghostA = useRef<HTMLDivElement>(null);
  const ghostB = useRef<HTMLDivElement>(null);
  const skyline = useRef<HTMLDivElement>(null);
  const clouds = useRef<HTMLDivElement>(null);
  const dusk = useRef<HTMLDivElement>(null);
  const sun = useRef<HTMLDivElement>(null);
  const haze = useRef<HTMLDivElement>(null);
  const halo = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const setChromeOn = useHq((s) => s.setChromeOn);
  const setLabelsOn = useHq((s) => s.setLabelsOn);

  // Paint the tower, the city and the clouds once, while the office is still loading. They arrive as CSS variables.
  useEffect(() => {
    if (!introClock.enabled || introClock.reduced) return;
    let cancelled = false;
    // If painting is ever slow, do not make people wait for it for long: start without the tower after a few seconds.
    const giveUp = window.setTimeout(() => introGate.picturesReady(), 4000);
    void Promise.all([canvasUrl(drawFacade()), canvasUrl(drawSkyline()), canvasUrl(drawClouds())]).then(([facade, skylineUrl, cloudsUrl]) => {
      if (cancelled) return;
      setTextures({ '--facade': facade, '--skyline': skylineUrl, '--clouds': cloudsUrl} as CSSProperties);
      // Give the page one frame to put the pictures in place before the clock starts.
      requestAnimationFrame(() => introGate.picturesReady());
    });
    return () => {
      cancelled = true;
      window.clearTimeout(giveUp);
    };
  }, []);

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
        // The tower is scaled so the lit office floor fills about half the height of the screen when the drone arrives.
        const k = Math.min(window.innerHeight / 730, (window.innerWidth * 0.8) / FACADE.focus.w);
        const centerY = lerp(FACADE.startY, FACADE.endY, f.climb);
        const blur = f.speed * 70; // how far the ghost copies trail, to streak the windows when the drone is fast
        const shift = (dy: number) => `scale(${k}) translateY(${FACADE.h / 2 - centerY + dy}px)`;
        set(world.current, 'transform', `translateX(${f.drift}%) rotate(${f.roll}deg) scale(${f.wallScale})`);
        set(world.current, 'opacity', String(f.wallOpacity));
        set(tilt.current, 'transform', `rotateX(${f.tilt}deg)`);
        set(plane.current, 'transform', shift(0));
        set(ghostA.current, 'transform', shift(blur));
        set(ghostA.current, 'opacity', String(f.speed * 0.34));
        set(ghostB.current, 'transform', shift(-blur));
        set(ghostB.current, 'opacity', String(f.speed * 0.26));
        // City and clouds drift past more slowly than the tower, which gives the climb its depth.
        set(skyline.current, 'transform', `translateY(${lerp(-80, 320, f.climb)}px) scale(${k})`);
        set(clouds.current, 'transform', `translateY(${lerp(-1000, 1000, f.climb)}px) scale(${k * 1.25})`);
        set(clouds.current, 'opacity', String(Math.sin(Math.PI * f.climb) * 0.9));
        set(dusk.current, 'opacity', String(1 - f.climb));
        set(sun.current, 'opacity', String(f.climb * 0.9));
        set(haze.current, 'opacity', String((1 - f.climb) * 0.8));
        set(halo.current, 'opacity', String(f.glow * 0.9));
        set(flash.current, 'opacity', String(f.flash));
      }
      if (!chromeShown && ms >= (introClock.reduced ? 0 : CHROME_AT_MS)) {
        chromeShown = true;
        setChromeOn(true);
      }
      if (!f.active) {
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

  const { x, y, w, h } = FACADE.focus;
  return (
    <div className="intro" style={textures} aria-hidden="true">
      <div ref={world} className="climb-world">
        <div className="climb-sky" />
        <div ref={dusk} className="climb-dusk" />
        <div ref={sun} className="climb-sun" style={{ opacity: 0 }} />
        <div ref={skyline} className="climb-skyline" />
        <div className="climb-stage">
          <div ref={tilt} className="climb-tilt">
            <div ref={ghostA} className="climb-plane climb-ghost" />
            <div ref={ghostB} className="climb-plane climb-ghost" />
            <div ref={plane} className="climb-plane">
              <div ref={halo} className="hq-halo" style={{ left: x - 220, top: y - 140, width: w + 440, height: h + 280 }} />
            </div>
          </div>
        </div>
        <div ref={clouds} className="climb-clouds" />
        <div ref={haze} className="climb-haze" />
        <div className="climb-vignette" />
      </div>
      <div ref={flash} className="intro-flash" />
    </div>
  );
}
