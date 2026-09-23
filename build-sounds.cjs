#!/usr/bin/env node

// made with claude and fixed with Gemini
// Usage: node build-atlas.js <sounds-folder> <public-output-dir> <ts-output-file>
// Requires: ffmpeg in PATH

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const [, , folder = "./sounds", publicOut = "./public", tsOut = "./src/sound-atlas.ts"] = process.argv;

if (!fs.existsSync(folder)) { console.error(`Folder not found: ${folder}`); process.exit(1); }

fs.mkdirSync(publicOut, { recursive: true });
fs.mkdirSync(path.dirname(tsOut), { recursive: true });

const files = fs.readdirSync(folder).filter(f => f.toLowerCase().endsWith(".mp3")).sort();
if (!files.length) { console.error("No MP3 files found."); process.exit(1); }

// Get duration of each file via ffprobe
function getDuration(filePath) {
	const out = execSync(
		`ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`
	).toString().trim();
	return parseFloat(out);
}

const sprites = {};
let cursor = 0;

const inputArgs = files.map(f => `-i "${path.join(folder, f)}"`).join(" ");
const filterInputs = files.map((_, i) => `[${i}:a]`).join("");
const concatFilter = `"${filterInputs}concat=n=${files.length}:v=0:a=1[out]"`;
const atlasPath = path.join(publicOut, "sound-atlas.ogg");

console.log("Measuring durations...");

// Change SILENCE to be slightly larger if issues persist, 
// but 0.3 is usually plenty if the math is right.
const SILENCE = 0.5;

for (const file of files) {
	const name = path.basename(file, path.extname(file));
	const duration = getDuration(path.join(folder, file));

	// Rounding to 4 decimal places is good, but ensure we don't truncate.
	// We use the raw duration for the sprite, and the cursor tracks the gaps.
	sprites[name] = {
		start: Number(cursor.toFixed(4)),
		duration: Number(duration.toFixed(4))
	};

	// Move cursor by the actual duration plus the silence we are about to inject
	cursor += duration + SILENCE;
	console.log(`  + ${name} (${duration.toFixed(3)}s)`);
}

const filterParts = [];
const inputFlags = [];

files.forEach((f, i) => {
	inputFlags.push(`-i "${path.join(folder, f)}"`);
	// Delay each subsequent file by the accumulated cursor position
	const delayMs = Math.round(sprites[path.basename(f, ".mp3")].start * 1000);
	filterParts.push(`[${i}:a]adelay=${delayMs}|${delayMs}[a${i}];`);
});

const mixFilter = `${filterParts.join("")}${files.map((_, i) => `[a${i}]`).join("")}amix=inputs=${files.length}:dropout_transition=0:normalize=0[out]`;

console.log("Encoding atlas...");
execSync(`ffmpeg -y ${inputFlags.join(" ")} -filter_complex "${mixFilter}" -map "[out]" -c:a libvorbis -q:a 2 -ar 22050 -ac 1 "${atlasPath}"`, { stdio: "inherit" });


const output = `// Auto-generated sound atlas

export type AudipClipName = ${Object.keys(sprites).map(s => `"${s}"`).join("|")};
const _sprites: Record<AudipClipName, { start: number; duration: number }> = ${JSON.stringify(sprites, null, 2)};

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
  _loading = fetch("/sound-atlas.ogg")
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
`;

fs.writeFileSync(tsOut, output);
console.log(`\nAtlas audio: ${atlasPath}`);
console.log(`Atlas TS:    ${tsOut}`);
console.log(`Sounds: ${files.length}`);