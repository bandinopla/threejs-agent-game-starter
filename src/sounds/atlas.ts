// Auto-generated sound atlas

export type AudipClipName = "annoying-chimp"|"arcade-die"|"bullet-hit-wall"|"chichinnnn"|"click-btn"|"close-door"|"distant-hammering-1"|"distant-hammering-2"|"distant-hammering-3"|"distant-hammering-4"|"elevator-alarm"|"elvino"|"fairydust-loop"|"flag-selection"|"gnome-die"|"hammer-1"|"hammer-2"|"hammer-3"|"hammer-4"|"hammer"|"jump"|"land"|"lolloop"|"man-die"|"mouse-click"|"nokia-ringtone"|"revolver-shot"|"ringring"|"shotgun1"|"shotgun2"|"sierra"|"silence-loop"|"squeeze-toy"|"step1"|"step2"|"step3"|"step4"|"step5"|"taladro"|"theme-intro"|"theme-loop"|"win"|"window-open";
const _sprites: Record<AudipClipName, { start: number; duration: number }> = {
  "annoying-chimp": {
    "start": 0,
    "duration": 6.408
  },
  "arcade-die": {
    "start": 6.908,
    "duration": 3.5004
  },
  "bullet-hit-wall": {
    "start": 10.9084,
    "duration": 0.9404
  },
  "chichinnnn": {
    "start": 12.3488,
    "duration": 1.7763
  },
  "click-btn": {
    "start": 14.6251,
    "duration": 0.209
  },
  "close-door": {
    "start": 15.3341,
    "duration": 0.984
  },
  "distant-hammering-1": {
    "start": 16.8181,
    "duration": 13.512
  },
  "distant-hammering-2": {
    "start": 30.8301,
    "duration": 7.464
  },
  "distant-hammering-3": {
    "start": 38.7941,
    "duration": 7.8
  },
  "distant-hammering-4": {
    "start": 47.0941,
    "duration": 7.128
  },
  "elevator-alarm": {
    "start": 54.7221,
    "duration": 4.296
  },
  "elvino": {
    "start": 59.5181,
    "duration": 16.4571
  },
  "fairydust-loop": {
    "start": 76.4753,
    "duration": 5.538
  },
  "flag-selection": {
    "start": 82.5132,
    "duration": 0.418
  },
  "gnome-die": {
    "start": 83.4312,
    "duration": 0.576
  },
  "hammer-1": {
    "start": 84.5072,
    "duration": 0.792
  },
  "hammer-2": {
    "start": 85.7992,
    "duration": 0.792
  },
  "hammer-3": {
    "start": 87.0912,
    "duration": 0.6
  },
  "hammer-4": {
    "start": 88.1912,
    "duration": 0.552
  },
  "hammer": {
    "start": 89.2432,
    "duration": 1.071
  },
  "jump": {
    "start": 90.8142,
    "duration": 0.504
  },
  "land": {
    "start": 91.8182,
    "duration": 0.209
  },
  "lolloop": {
    "start": 92.5272,
    "duration": 33.3584
  },
  "man-die": {
    "start": 126.3855,
    "duration": 3.3437
  },
  "mouse-click": {
    "start": 130.2292,
    "duration": 0.216
  },
  "nokia-ringtone": {
    "start": 130.9452,
    "duration": 3.1608
  },
  "revolver-shot": {
    "start": 134.606,
    "duration": 2.3771
  },
  "ringring": {
    "start": 137.4831,
    "duration": 1.5935
  },
  "shotgun1": {
    "start": 139.5766,
    "duration": 1.9853
  },
  "shotgun2": {
    "start": 142.0619,
    "duration": 1.4367
  },
  "sierra": {
    "start": 143.9986,
    "duration": 12
  },
  "silence-loop": {
    "start": 156.4986,
    "duration": 21.504
  },
  "squeeze-toy": {
    "start": 178.5026,
    "duration": 0.432
  },
  "step1": {
    "start": 179.4346,
    "duration": 0.4702
  },
  "step2": {
    "start": 180.4048,
    "duration": 0.4702
  },
  "step3": {
    "start": 181.375,
    "duration": 0.3918
  },
  "step4": {
    "start": 182.2669,
    "duration": 0.4441
  },
  "step5": {
    "start": 183.211,
    "duration": 0.3657
  },
  "taladro": {
    "start": 184.0767,
    "duration": 13.512
  },
  "theme-intro": {
    "start": 198.0887,
    "duration": 24.32
  },
  "theme-loop": {
    "start": 222.9087,
    "duration": 13.7927
  },
  "win": {
    "start": 237.2013,
    "duration": 2.064
  },
  "window-open": {
    "start": 239.7653,
    "duration": 0.5224
  }
};

let _ctx: AudioContext | null = null;
let _buffer: AudioBuffer | null = null;
let _loading: Promise<AudioBuffer> | null = null;

function getContext(): AudioContext {
  if (!_ctx) _ctx = new AudioContext();
  return _ctx;
}

async function load(): Promise<AudioBuffer> {
  if (_buffer) return _buffer;
  if (_loading) return _loading;
  _loading = fetch("./sound-atlas.ogg")
    .then(r => r.arrayBuffer())
    .then(data => getContext().decodeAudioData(data))
    .then(buf => _buffer = buf );
  return _loading;
}

const SoundAtlas = {

  getClip( name:AudipClipName ){
    const sprite = _sprites[name];
    if (!sprite) throw new Error("Sound not found: " + name);
    return sprite;
  },
  get buffer(): Promise<AudioBuffer> {
    return load();
  },
  async preload(): Promise<void> {
    await load();
  },
  async play(name: AudipClipName, volume: number = 1, onFinish?:()=>void) {
    await load();
    const sprite = _sprites[name];
    if (!sprite) throw new Error("Sound not found: " + name);
    const ctx = getContext();
    const gain = ctx.createGain();
    gain.gain.value = Math.max(0, Math.min(1, volume));
    gain.connect(ctx.destination);
    const source = ctx.createBufferSource();
    source.buffer = _buffer!;
    source.connect(gain);
    source.start(0, sprite.start, sprite.duration);
	if( onFinish )
	{
		source.onended = onFinish;
	}
	return source;
  },
  list(): string[] { return Object.keys(_sprites); }
};

export default SoundAtlas;
