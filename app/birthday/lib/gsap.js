'use client';

import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { SplitText } from 'gsap/SplitText';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { CustomEase } from 'gsap/CustomEase';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger, MotionPathPlugin, DrawSVGPlugin, CustomEase);
  ScrollTrigger.config({ ignoreMobileResize: true });
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export { gsap, useGSAP, SplitText, ScrollTrigger };
