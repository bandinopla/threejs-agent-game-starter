import type { AudipClipName } from "./atlas";
import SoundAtlas from "./atlas";
import { GENERAL_VOLUME } from "./general-volume";

export async function playSound(name: AudipClipName, volume: number = 1, onFinish?:()=>void) {
	return SoundAtlas.play(name, volume * GENERAL_VOLUME, onFinish);
}