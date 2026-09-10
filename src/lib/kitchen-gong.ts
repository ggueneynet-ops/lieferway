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

/** Loud, deep metallic gong (~1.2s). Safe to call from a timer if keep-alive is running. */
export function playKitchenBell() {
  const ctx = getAudioContext();
  if (!ctx) return;
  void ctx.resume();
  startKeepAlive();
  const now = ctx.currentTime;
  const dur = 1.22;

  const master = ctx.createGain();
  master.gain.value = 4.2;
  const limit = ctx.createDynamicsCompressor();
  limit.threshold.value = -16;
  limit.knee.value = 4;
  limit.ratio.value = 2.2;
  limit.attack.value = 0.001;
  limit.release.value = 0.22;
  const makeup = ctx.createGain();
  makeup.gain.value = 1.85;
  master.connect(limit);
  limit.connect(makeup);
  makeup.connect(ctx.destination);

  const nLen = Math.floor(ctx.sampleRate * 0.12);
  const noiseBuf = ctx.createBuffer(1, nLen, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < nLen; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / nLen) ** 1.4;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  const low = ctx.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = 420;
  low.Q.value = 0.7;
  const bang = ctx.createBiquadFilter();
  bang.type = "bandpass";
  bang.frequency.value = 220;
  bang.Q.value = 1.1;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, now);
  ng.gain.exponentialRampToValueAtTime(1.8, now + 0.004);
  ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
  noise.connect(low);
  low.connect(bang);
  bang.connect(ng);
  ng.connect(master);
  noise.start(now);
  noise.stop(now + 0.18);

  const partials: [number, number, number, OscillatorType][] = [
    [52, 1.35, dur, "sine"],
    [78, 0.95, dur * 0.98, "sine"],
    [104, 0.62, dur * 0.92, "triangle"],
    [156, 0.42, 1.05, "sine"],
    [208, 0.28, 0.92, "sine"],
    [312, 0.18, 0.72, "sine"],
    [416, 0.12, 0.55, "sine"],
    [624, 0.07, 0.38, "sine"],
    [832, 0.04, 0.26, "sine"],
  ];
  for (const [freq, gain, d, type] of partials) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, now);
    o.frequency.exponentialRampToValueAtTime(Math.max(36, freq * 0.97), now + d);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gain, now + 0.012);
    g.gain.exponentialRampToValueAtTime(gain * 0.35, now + 0.22);
    g.gain.exponentialRampToValueAtTime(0.0001, now + d);
    o.connect(g);
    g.connect(master);
    o.start(now);
    o.stop(now + d + 0.05);
  }
}
