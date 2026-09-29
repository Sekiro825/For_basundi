'use client';

import { useEffect } from 'react';
import { ScrollTrigger } from '../lib/gsap';
import { buildSong } from '../lib/musicBox';
import { birthday } from '../birthdayConfig';
import Hero from './celebration/Hero';
import Orbit from './celebration/Orbit';
import Roses from './celebration/Roses';
import Memories from './celebration/Memories';
import Reasons from './celebration/Reasons';
import Letter from './celebration/Letter';
import Finale from './celebration/Finale';

export default function Celebration({ music, onReplay }) {
  useEffect(() => {
    music.play({ song: buildSong(birthday.nameSyllables), tempo: 76, gain: 0.4, loop: true, gap: 3 });

    // Pins are measured on mount; re-measure once fonts and images settle.
    const refresh = () => ScrollTrigger.refresh();
    const timer = setTimeout(refresh, 700);
    document.fonts?.ready.then(refresh);
    window.addEventListener('load', refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('load', refresh);
    };
  }, [music]);

  return (
    <div className="cel-root">
      <Hero />
      <Orbit />
      <Roses />
      <Memories memories={birthday.memories} />
      <Reasons />
      <Letter />
      <Finale music={music} onReplay={onReplay} />
    </div>
  );
}
