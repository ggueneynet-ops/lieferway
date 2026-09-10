/** Kitchen gong: stays armed after first unlock so iOS/Chrome do not suspend between strikes. */

let audioCtx: AudioContext | null = null;
let keepAlive: { osc: OscillatorNode; gain: GainNode } | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  return audioCtx;
}

export function unlockKitchenBell() {
  const ctx = getAudioContext();
  if (!ctx) return false;
  if (ctx.state === "suspended") void ctx.resume();
  startKeepAlive();
  return ctx.state === "running";
}

export function startKeepAlive() {
  const ctx = getAudioContext();
  if (!ctx || keepAlive) return;
  void ctx.resume();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 28;
  gain.gain.value = 0.00005;
  osc.connect(gain);
  gain.connect(ctx.destination);
  try {
    osc.start();
    keepAlive = { osc, gain };
  } catch {
    keepAlive = null;
  }
}

export function stopKeepAlive() {
  if (!keepAlive) return;
  try {
    keepAlive.osc.stop();
  } catch {
    /* already stopped */
  }
  try {
    keepAlive.osc.disconnect();
    keepAlive.gain.disconnect();
  } catch {
    /* already disconnected */
  }
  keepAlive = null;
}

/** Deep metallic gong (derin gong): ~90–110 Hz body, long sustain, no thin chime. */
export function playKitchenBell() {
  const ctx = getAudioContext();
  if (!ctx) return;
  void ctx.resume();
  startKeepAlive();
  const now = ctx.currentTime;
  const dur = 1.35;

  const body = ctx.createBiquadFilter();
  body.type = "lowpass";
  body.frequency.value = 720;
  body.Q.value = 0.55;

  const master = ctx.createGain();
  master.gain.value = 5.4;
  const limit = ctx.createDynamicsCompressor();
  limit.threshold.value = -14;
  limit.knee.value = 6;
  limit.ratio.value = 2;
  limit.attack.value = 0.002;
  limit.release.value = 0.28;
  const makeup = ctx.createGain();
  makeup.gain.value = 2.1;
  master.connect(body);
  body.connect(limit);
  limit.connect(makeup);
  makeup.connect(ctx.destination);

  const nLen = Math.floor(ctx.sampleRate * 0.14);
  const noiseBuf = ctx.createBuffer(1, nLen, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < nLen; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / nLen) ** 1.8;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  const strikeLp = ctx.createBiquadFilter();
  strikeLp.type = "lowpass";
  strikeLp.frequency.value = 280;
  strikeLp.Q.value = 0.8;
  const strikeBp = ctx.createBiquadFilter();
  strikeBp.type = "bandpass";
  strikeBp.frequency.value = 110;
  strikeBp.Q.value = 1.4;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, now);
  ng.gain.exponentialRampToValueAtTime(2.4, now + 0.005);
  ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  noise.connect(strikeLp);
  strikeLp.connect(strikeBp);
  strikeBp.connect(ng);
  ng.connect(master);
  noise.start(now);
  noise.stop(now + 0.22);

  // Inharmonic bowl: fundamental ~96 Hz + beating pair, no high bell partials.
  const f0 = 96;
  const partials: [number, number, number][] = [
    [f0, 1.55, dur],
    [f0 * 1.027, 1.15, dur],
    [f0 * 1.52, 0.72, dur * 0.96],
    [f0 * 2.01, 0.48, dur * 0.88],
    [f0 * 2.46, 0.28, dur * 0.72],
    [f0 * 2.92, 0.16, dur * 0.55],
    [f0 * 3.38, 0.09, dur * 0.4],
  ];
  for (const [freq, gain, d] of partials) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(freq, now);
    o.frequency.exponentialRampToValueAtTime(Math.max(70, freq * 0.975), now + d);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gain, now + 0.018);
    g.gain.exponentialRampToValueAtTime(gain * 0.42, now + 0.28);
    g.gain.exponentialRampToValueAtTime(0.0001, now + d);
    o.connect(g);
    g.connect(master);
    o.start(now);
    o.stop(now + d + 0.06);
  }
}
