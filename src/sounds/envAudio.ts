import { AudioListener, Object3D, PositionalAudio, Vector3 } from "three";
import type { AudipClipName } from "./atlas";
import SoundAtlas from "./atlas";
import { GENERAL_VOLUME } from "./general-volume";
import { updatables } from "../IUpdatable";
import { isMobile } from "../utils/isMobile";

export const $audioListener = new AudioListener();

let _buffer: AudioBuffer | null = null;
SoundAtlas.buffer.then(b => { _buffer = b; });

const POOL_SIZE = isMobile()? 8 : 32;
const _v = new Vector3();
const _v2 = new Vector3();

// ── Virtual emitter (lightweight, always exists) ──────────────────────────────

interface VirtualEmitter {
  object: Object3D;
  clip: AudipClipName | AudipClipName[];
  loop: boolean;
  startOffset: number;
  endOffset: number;
  volume: number;
  active: boolean;           // is play() requested
  offset: number;            // playback offset for resuming
  startedAt: number;         // audioContext.currentTime when assigned
  node: PoolNode | null;     // currently assigned real node, if any
  distance: number;
  needsPlay: boolean;
}

// ── Real audio node (scarce) ──────────────────────────────────────────────────

interface PoolNode {
  sound: PositionalAudio;
  emitter: VirtualEmitter | null;
}

const poolNodes: PoolNode[] = Array.from({ length: POOL_SIZE }, () => ({
  sound: new PositionalAudio($audioListener),
  emitter: null,
}));

const emitters: VirtualEmitter[] = [];

// ── Scheduler (runs every frame) ─────────────────────────────────────────────

function distanceTo(object: Object3D): number {
  object.getWorldPosition(_v);
  $audioListener.getWorldPosition(_v2);
  return _v.distanceTo(_v2);
}

function detachNode(node: PoolNode) {
  if (!node.emitter) return;
  const e = node.emitter;

  // Save playback offset so we can resume later
  const elapsed = $audioListener.context.currentTime - e.startedAt;
  const clip = resolveClip(e.clip);
  e.offset = (e.startOffset + elapsed) % clip.duration;

  node.sound.stop();

  
  e.object.remove(node.sound);
  e.node = null;
  node.emitter = null;
}

function attachNode(node: PoolNode, emitter: VirtualEmitter) {
  node.emitter = emitter;
  emitter.node = node;
  emitter.startedAt = $audioListener.context.currentTime;

  const sound = node.sound;
  emitter.object.add(sound);
  sound.setDistanceModel("linear");
  sound.setRefDistance(emitter.distance);
  sound.setMaxDistance(emitter.distance * 10);
  sound.setRolloffFactor(2);

  playNode(node, emitter);
//   console.log("PLAY")
//   if (!_buffer) return;
//   if (!sound.buffer) sound.setBuffer(_buffer); 

//     const clip = resolveClip(emitter.clip);
//     const startTime = clip.start + emitter.offset;
//     const duration = clip.duration - emitter.endOffset;

//     sound.stop();
//     sound.setLoop(emitter.loop);
//     if (emitter.loop) {
//       sound.setLoopStart(clip.start + emitter.startOffset);
//       sound.setLoopEnd(clip.start + emitter.startOffset + duration);
//       sound.duration = undefined;
//     } else {
//       sound.duration = duration - emitter.offset;
//     }
//     sound.offset = startTime;
//     sound.play();
//     sound.setVolume(emitter.volume * GENERAL_VOLUME);
	

}

function playNode(node: PoolNode, emitter: VirtualEmitter) {
  const sound = node.sound;
  if (!_buffer) return;
  if (!sound.buffer) sound.setBuffer(_buffer);

  const clip = resolveClip(emitter.clip);
  const startTime = clip.start + emitter.offset;
  const duration = clip.duration - emitter.endOffset;

  sound.stop();
  sound.setLoop(emitter.loop);
  if (emitter.loop) {
    sound.setLoopStart(clip.start + emitter.startOffset);
    sound.setLoopEnd(clip.start + emitter.startOffset + duration);
    sound.duration = undefined;
  } else {
    sound.duration = duration - emitter.offset;
  }
  sound.offset = startTime;
  sound.play();
  sound.setVolume(emitter.volume * GENERAL_VOLUME);
  emitter.startedAt = $audioListener.context.currentTime;
  emitter.needsPlay = false;
}

updatables.add({
  update(_dt: number) {
    const ctx = $audioListener.context;
    if (ctx.state === 'suspended') ctx.resume();

    const active = emitters.filter(e => e.active);
    active.sort((a, b) => distanceTo(a.object) - distanceTo(b.object));

    const toAssign = active.slice(0, POOL_SIZE);
    const toEvict  = active.slice(POOL_SIZE); 
	

    // Detach emitters that are now too far
    for (const e of toEvict) {
      if (e.node) detachNode(e.node);
    }

    // Assign nodes to nearest emitters that lack one
    for (const e of toAssign) {
      if (e.node) {
		  if (e.needsPlay) { playNode(e.node, e); e.needsPlay = false; }
		  continue;
		}

      // Find a free node
      let node = poolNodes.find(n => !n.emitter) ?? null;

      // Or steal from the farthest assigned emitter beyond our range
      if (!node) {
        const farthestAssigned = toAssign
          .filter(x => x.node && x !== e)
          .sort((a, b) => distanceTo(b.object) - distanceTo(a.object))[0];
        if (farthestAssigned?.node && distanceTo(farthestAssigned.object) > distanceTo(e.object)) {
          node = farthestAssigned.node;
          detachNode(node);
        }
      }

      if (node) attachNode(node, e);
    }
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveClip(name: AudipClipName | AudipClipName[]) {
  return SoundAtlas.getClip(
    Array.isArray(name) ? name[Math.floor(Math.random() * name.length)] : name
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface AudioEmitterObject {
  play(clip: AudipClipName | AudipClipName[], loop?: boolean, startOffset?: number, endOffset?: number): void;
  stop(): void;
  setVolume(volume: number): void;
  getVolume(): number;
}

export function createAudioEmitterOnObject(object: Object3D, distance: number = 10, enableDetune = false): AudioEmitterObject  {
  const emitter: VirtualEmitter = {
    object, clip: '' as AudipClipName, loop: false,
    startOffset: 0, endOffset: 0, volume: 1,
    active: false, offset: 0, startedAt: 0, node: null,
	distance,
	needsPlay: false,
  };
  emitters.push(emitter);

  return {
    play(clip, loop = false, startOffset = 0, endOffset = 0) {
      emitter.clip = clip;
      emitter.loop = loop;
      emitter.startOffset = startOffset;
      emitter.endOffset = endOffset;
      emitter.offset = startOffset;
      emitter.active = true;
	  emitter.needsPlay = true;
    },
    stop() {
      emitter.active = false;
      if (emitter.node) detachNode(emitter.node);
    },
    setVolume(v) {
      emitter.volume = v;
      emitter.node?.sound.setVolume(v * GENERAL_VOLUME);
    },
    getVolume() { return emitter.volume; },
  };
}