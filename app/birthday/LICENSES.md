# Third-party credits for the birthday surprise

## faahim/happy-birthday (MIT)

`app/scenes/Story.js` is adapted from the animation timeline in
https://github.com/faahim/happy-birthday (ported from TimelineMax to GSAP 3,
restyled, and personalised).

```
MIT License

Copyright (c) 2024 faahim

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Ideas borrowed (no code copied)

- Breath detection in `app/lib/blowDetector.js` follows the approach described in
  https://github.com/0x000NULL/candlelight (loudness over a calibrated noise
  floor + low-band energy share + spectral flatness + a sustain window). It is an
  independent implementation.
- Scene/section ideas (config-driven greeting, fireworks, balloons) were inspired
  by https://github.com/fajarghifar/happybirthday (MIT).

## Libraries

- GSAP 3 + plugins (SplitText, ScrollTrigger, MotionPath, DrawSVG): GSAP Standard "no charge" license, https://gsap.com/standard-license
- canvas-confetti: ISC
- fireworks-js: MIT
