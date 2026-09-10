/** Kitchen alert: stays armed after first unlock so iOS/Chrome do not suspend between pulses. */

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

/**
 * Short kitchen emergency whoop: rise then fall, ~0.6s, then the board repeats it.
 * Piercing midrange (not a long police wail).
 */
export function playKitchenBell() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const audio = ctx;
  void audio.resume();
  startKeepAlive();
  const now = audio.currentTime;
  const dur = 0.62;
  const lo = 740;
  const hi = 1280;

  const hp = audio.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 420;
  hp.Q.value = 0.7;

  const peak = audio.createBiquadFilter();
  peak.type = "peaking";
  peak.frequency.value = 980;
  peak.Q.value = 1.1;
  peak.gain.value = 6;

  const master = audio.createGain();
  master.gain.value = 1;
  const limit = audio.createDynamicsCompressor();
  limit.threshold.value = -12;
  limit.knee.value = 4;
  limit.ratio.value = 3;
  limit.attack.value = 0.003;
  limit.release.value = 0.12;
  const makeup = audio.createGain();
  makeup.gain.value = 2.6;
  master.connect(hp);
  hp.connect(peak);
  peak.connect(limit);
  limit.connect(makeup);
  makeup.connect(audio.destination);

  const env = audio.createGain();
  env.gain.setValueAtTime(0.0001, now);
  env.gain.exponentialRampToValueAtTime(0.9, now + 0.018);
  env.gain.setValueAtTime(0.9, now + 0.5);
  env.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  env.connect(master);

  function sweep(type: OscillatorType, detune: number, level: number) {
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type;
    o.detune.value = detune;
    o.frequency.setValueAtTime(lo, now);
    o.frequency.linearRampToValueAtTime(hi, now + 0.26);
    o.frequency.linearRampToValueAtTime(lo, now + 0.54);
    g.gain.value = level;
    o.connect(g);
    g.connect(env);
    o.start(now);
    o.stop(now + dur + 0.04);
  }

  sweep("sawtooth", 0, 0.38);
  sweep("square", 9, 0.16);
  sweep("triangle", -7, 0.22);
}
