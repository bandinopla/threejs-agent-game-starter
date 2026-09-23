import type { AudipClipName } from "../../sounds/atlas";
import type { AudioEmitterObject } from "../../sounds/envAudio";

export class MobilePhone {
	private callTimeout:number | null = null;

	constructor( readonly audio:AudioEmitterObject )
	{

	}	

	stop() {
		if( this.callTimeout ) {
			clearTimeout(this.callTimeout);
			this.callTimeout = null;
		}
		this.audio.stop();
	}

	start( loopThisClip?: AudipClipName) {

		this.stop();
		
		if( loopThisClip )
			this.audio.play(loopThisClip, true);
		else
			this.scheduleCall(true);
	}

	private scheduleCall( immediate:boolean = false ) {
		const delay = immediate ? 0 : Math.random() * 4000 + 4000;
		this.callTimeout = window.setTimeout(() => {
			this.audio.play( Math.random()>0.5? "ringring" : "nokia-ringtone", false);
			this.scheduleCall();
		}, delay);
	}
}