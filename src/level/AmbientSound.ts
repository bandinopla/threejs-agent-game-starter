import { Audio, Object3D, PositionalAudio } from "three";
import type { AudipClipName } from "../sounds/atlas";
import { createAudioEmitterOnObject, type AudioEmitterObject } from "../sounds/envAudio";
import { $events } from "../events/events";

export class AmbientSound extends Object3D {
	
	private audio:AudioEmitterObject;
	
	constructor( private soundName: AudipClipName, scale:number = 1, volume:number = 1 ){
		super();
		this.audio = createAudioEmitterOnObject(this, scale);
		this.audio.setVolume(volume);
		$events.addEventListener("startGame", this.start);
	}

	private start = () => {
		this.audio.play(this.soundName, true);
	}
}