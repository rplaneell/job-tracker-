import { useEffect, useRef, useState } from 'react';
import { CHROME_AT_MS, LABEL_DELAY_MS, introFrame } from '../domain/intro';
import { introClock, introNow } from '../state/introClock';
import { useHq } from '../state/useHq';

/**
 * The opening animation, on screen: a wooden door in a sage green wall. It swings open, the wall grows past the camera, and
 * the 3D office builds itself behind it. The 3D side reads the same clock. Click or press any key to skip.
 * People who ask their system for less motion get only a short fade.
 */
export function Intro() {
  const [alive, setAlive] = useState(introClock.enabled);
  const wall = useRef<HTMLDivElement>(null);
  const door = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const setChromeOn = useHq((s) => s.setChromeOn);
  const setLabelsOn = useHq((s) => s.setLabelsOn);

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
    const tick = () => {
      const ms = introNow();
      const f = introFrame(ms, introClock.reduced);
      if (wall.current) {
        wall.current.style.transform = `scale(${f.wallScale})`;
        wall.current.style.opacity = String(f.wallOpacity);
      }
      if (door.current) door.current.style.transform = `rotateY(${f.doorAngle}deg)`;
      if (glow.current) glow.current.style.opacity = String(f.glow);
      if (flash.current) flash.current.style.opacity = String(f.flash);
      if (veil.current) veil.current.style.opacity = String(f.veil);
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

  return (
    <div className="intro" aria-hidden="true">
      <div ref={wall} className="intro-wall">
        <div className="intro-part intro-top" />
        <div className="intro-part intro-left" />
        <div className="intro-part intro-right" />
        <div className="intro-part intro-floor" />
        <div className="intro-doorway">
          <div ref={glow} className="intro-glow" />
          <div ref={door} className="intro-door">
            <div className="intro-inset intro-inset-top" />
            <div className="intro-inset intro-inset-bottom" />
            <div className="intro-plaque">HQ</div>
            <div className="intro-knob" />
          </div>
        </div>
      </div>
      <div ref={flash} className="intro-flash" />
    </div>
  );
}
