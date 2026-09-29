// Detects someone *blowing* at the microphone, not just "it got loud".
//
// Approach (credit: the idea is described in 0x000NULL/candlelight; this is an
// independent implementation): a frame counts as breath only when
//   1. its loudness is well above the room's own noise floor (measured first),
//   2. most of its energy sits in the low band (wind noise on a mic is bass-heavy),
//   3. its spectrum is flat/noisy — speech and singing are tonal and score low,
// and it has to be sustained for a few frames so claps and coughs don't count.
//
// Privacy: audio frames are analysed and discarded. Nothing is recorded or sent.

const TUNE = {
  fftSize: 1024,
  smoothing: 0.5,
  calibrateMs: 1000,
  lowBandHz: 500,
  topHz: 7000,
  minLowShare: 0.5,
  minFlatness: 0.24,
  floorMultiplier: 2.6,
  minGate: 0.014,
  fullRms: 0.17,
  sustainFrames: 4,
  graceMs: 180,
};

export function micSupported() {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    !!navigator.mediaDevices?.getUserMedia &&
    !!(window.AudioContext || window.webkitAudioContext)
  );
}

function reasonFor(err) {
  if (typeof window !== 'undefined' && !window.isSecureContext) return 'insecure';
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'denied';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'nodevice';
    case 'NotReadableError':
      return 'busy';
    default:
      return 'failed';
  }
}

export function createBlowDetector({ onLevel, onCalibrated } = {}) {
  let ctx = null;
  let stream = null;
  let analyser = null;
  let freq = null;
  let wave = null;
  let raf = 0;
  let running = false;

  let calibrateUntil = 0;
  let floorTotal = 0;
  let floorFrames = 0;
  let floor = 0.004;
  let streak = 0;
  let lastHit = 0;

  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);

    analyser.getByteTimeDomainData(wave);
    let sq = 0;
    for (let i = 0; i < wave.length; i++) {
      const v = (wave[i] - 128) / 128;
      sq += v * v;
    }
    const rms = Math.sqrt(sq / wave.length);

    if (now < calibrateUntil) {
      floorTotal += rms;
      floorFrames++;
      onLevel?.(0);
      return;
    }
    if (floorFrames) {
      floor = Math.max(0.002, floorTotal / floorFrames);
      floorFrames = 0;
      onCalibrated?.();
    }

    analyser.getFloatFrequencyData(freq);
    const binHz = ctx.sampleRate / TUNE.fftSize;
    const lowEnd = Math.max(2, Math.round(TUNE.lowBandHz / binHz));
    const top = Math.min(freq.length - 1, Math.round(TUNE.topHz / binHz));

    let sum = 0;
    let low = 0;
    let logSum = 0;
    for (let i = 1; i <= top; i++) {
      const mag = freq[i] === -Infinity ? 0 : 10 ** (freq[i] / 20);
      sum += mag;
      if (i <= lowEnd) low += mag;
      logSum += Math.log(mag + 1e-10);
    }
    const lowShare = sum > 0 ? low / sum : 0;
    const flatness = sum > 0 ? Math.exp(logSum / top) / (sum / top) : 0;

    const gate = Math.max(floor * TUNE.floorMultiplier, TUNE.minGate);
    const breathy = rms > gate && lowShare > TUNE.minLowShare && flatness > TUNE.minFlatness;
    // A hard, close blow can clip the mic and look less "flat" — accept it on sheer bass energy.
    const gust = rms > 0.22 && lowShare > 0.62;

    if (breathy || gust) {
      streak++;
      lastHit = now;
    } else if (now - lastHit > TUNE.graceMs) {
      streak = 0;
    }

    let level = 0;
    if (streak >= TUNE.sustainFrames) {
      level = Math.min(1, Math.max(0, (rms - gate) / Math.max(1e-6, TUNE.fullRms - gate)));
      level = Math.sqrt(level);
    }
    onLevel?.(level);
  }

  return {
    async start() {
      if (running) return;
      if (!micSupported()) {
        const e = new Error('Microphone unavailable');
        e.reason = typeof window !== 'undefined' && !window.isSecureContext ? 'insecure' : 'unsupported';
        throw e;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
          video: false,
        });
        const AC = window.AudioContext || window.webkitAudioContext;
        ctx = new AC();
        if (ctx.state === 'suspended') await ctx.resume();
        analyser = ctx.createAnalyser();
        analyser.fftSize = TUNE.fftSize;
        analyser.smoothingTimeConstant = TUNE.smoothing;
        ctx.createMediaStreamSource(stream).connect(analyser);
        freq = new Float32Array(analyser.frequencyBinCount);
        wave = new Uint8Array(analyser.fftSize);

        running = true;
        calibrateUntil = performance.now() + TUNE.calibrateMs;
        floorTotal = 0;
        floorFrames = 0;
        streak = 0;
        raf = requestAnimationFrame(frame);
      } catch (err) {
        this.stop();
        const e = new Error('Microphone unavailable');
        e.reason = reasonFor(err);
        throw e;
      }
    },

    stop() {
      running = false;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      if (ctx && ctx.state !== 'closed') ctx.close().catch(() => {});
      stream = null;
      ctx = null;
      analyser = null;
      onLevel?.(0);
    },

    get running() {
      return running;
    },
  };
}
