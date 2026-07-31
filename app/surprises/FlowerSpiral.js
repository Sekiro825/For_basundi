'use client';
import { useEffect, useState } from 'react';

const FLOWER_IMAGES = [
  '/assets/flowers/rose.png?v=2',
  '/assets/flowers/sunflower.png?v=2',
  '/assets/flowers/daisy.png?v=2',
  '/assets/flowers/orchid.png?v=2',
  '/assets/flowers/tulip.png?v=2',
  '/assets/flowers/lotus.png?v=2',
  '/assets/flowers/hibiscus.png?v=2',
  '/assets/flowers/dahlia.png?v=2',
  '/assets/flowers/marigold.png?v=2',
  '/assets/flowers/plumeria.png?v=2',
];

export default function FlowerSpiral({ onSpiralBloomComplete }) {
  const [flowers, setFlowers] = useState([]);
  const [ambientFlowers, setAmbientFlowers] = useState([]);

  useEffect(() => {
    // Generate 140 spiral flowers with tight angular and radial steps to eliminate gaps between spirals
    const numSpiral = 140;
    const spiralList = [];
    
    for (let i = 0; i < numSpiral; i++) {
      const img = FLOWER_IMAGES[i % FLOWER_IMAGES.length];
      const angle = i * 0.22; // Tighter spiral turns
      const radius = 10 + i * 5.2; // Tighter distance gradient so flowers overlap along spiral arms
      
      spiralList.push({
        id: `spiral-${i}`,
        src: img,
        style: {
          '--start-rot': `${angle}rad`,
          '--end-rot': `${angle + Math.PI * 1.6}rad`,
          '--dist': `${radius.toFixed(1)}px`,
          '--scale': `${0.65 + (i / numSpiral) * 0.85}`,
          '--delay': `${(i * 0.03).toFixed(2)}s`,
          '--float-dur': `${3.5 + (i % 5) * 0.6}s`,
        }
      });
    }

    // Generate dense 15x18 grid (270 flowers) to completely blanket and cover the ENTIRE background screen
    const rows = 15;
    const cols = 18;
    const ambientList = [];
    let index = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const baseTop = (r / (rows - 1)) * 100;
        const baseLeft = (c / (cols - 1)) * 100;
        
        // Organic jitter to keep it natural while densely packing flowers
        const offsetTop = ((index * 13 + r * 7) % 7) - 3;
        const offsetLeft = ((index * 17 + c * 11) % 7) - 3;
        
        const top = Math.max(-2, Math.min(102, baseTop + offsetTop));
        const left = Math.max(-2, Math.min(102, baseLeft + offsetLeft));
        
        const img = FLOWER_IMAGES[index % FLOWER_IMAGES.length];
        const size = 68 + (index % 6) * 16; // 68px to 148px (large overlapping flowers)
        const rotation = ((index * 37) % 80) - 40; // -40deg to +40deg
        
        // Smooth outwards spreading bloom delay
        const distFromCenter = Math.sqrt(Math.pow(r - rows / 2, 2) + Math.pow(c - cols / 2, 2));
        const delay = 0.05 + distFromCenter * 0.12 + (index % 9) * 0.03;
        const floatDur = 3.0 + (index % 6) * 0.6;
        
        ambientList.push({
          id: `ambient-${index}`,
          src: img,
          style: {
            top: `${top.toFixed(1)}%`,
            left: `${left.toFixed(1)}%`,
            width: `${size}px`,
            height: `${size}px`,
            '--initial-rot': `${rotation}deg`,
            '--delay': `${delay.toFixed(2)}s`,
            '--float-dur': `${floatDur.toFixed(2)}s`,
          }
        });
        index++;
      }
    }
    
    setFlowers(spiralList);
    setAmbientFlowers(ambientList);

    // Trigger Big Bouquet modal after spiral bloom completes (4.5 seconds)
    const timer = setTimeout(() => {
      if (onSpiralBloomComplete) onSpiralBloomComplete();
    }, 4500);
    
    return () => clearTimeout(timer);
  }, [onSpiralBloomComplete]);

  return (
    <div className="flower-spiral-container">
      {/* Full-screen dense blanket of 270 background flowers */}
      {ambientFlowers.map((f) => (
        <div key={f.id} className="ambient-screen-flower" style={f.style}>
          <img src={f.src} alt="Covering flower" />
        </div>
      ))}

      {/* Tightly packed continuous 140 spiral flowers */}
      {flowers.map((f) => (
        <div key={f.id} className="spiral-flower" style={f.style}>
          <img src={f.src} alt="Spiral flower" />
        </div>
      ))}
    </div>
  );
}

