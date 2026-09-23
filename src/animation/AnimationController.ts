import {
    AnimationMixer,
    AnimationClip,
    AnimationAction,
    LoopOnce,
    LoopRepeat,
	type Event,
	AnimationUtils,
	AdditiveAnimationBlendMode,
	type AnimationMixerEventMap,
	EventDispatcher,
} from "three";

type PlayOptions = {
    onClipEndOrLoop?: VoidFunction;
    startTime?: number;
	randomStartTime?:boolean;
    loop?: boolean;
	additive?:boolean
	channel?:string
	timeScale?:number
	force?:boolean
};

export type AnimationClipEvent = {
	clipEvent: {
		name:string;
		clip:AnimationClip
	}
}

export class AnimationController extends EventDispatcher<AnimationClipEvent> {
	private isPaused = false; 
    private mixer: AnimationMixer;
    private clips: Record<string, AnimationClip>; 
    
	private additiveClips:Record<string, AnimationClip> = {};
	private currentActions:Record<string, AnimationAction> = {};
	private cleanupActions:Record<string, () => void> = {};

	disabled = false;

	private clipFrameActions:Map<string, {time:number, eventName:string, wasExecuted:boolean }[]> = new Map();


	/**
	 * Handler of an animation mixer...
	 * 
	 * @param mixer 
	 * @param clips 
	 * @param fps the one used when authoring the clips
	 */
    constructor(mixer: AnimationMixer, clips: Record<string, AnimationClip>, private fps = 24) {

		super();

        this.mixer = mixer;
        this.clips = clips;

		//
		// define the frame events....  if the clip has userData  event:name = frame 
		//
		for( let [clipName, clip] of Object.entries(clips) ) {

			this.clipFrameActions.set(clipName, []);

			for( let prop in clip.userData ) {
				if( prop.startsWith("event:") )
				{
					const [_, eventName ] = prop.split(":");
					const frame = parseInt( clip.userData[prop] as string );
					const time = frame / this.fps;
					
					this.clipFrameActions.get(clipName)?.push({
						time,
						eventName,  
						wasExecuted:false
					});

					////console.log("Event created: ", eventName, time, frame);
				}
			}
		}


		const onActionReachesEnd =  ( ev:Event<"finished" | "loop", AnimationMixer> & {action:AnimationAction} ) => {
 
			const clipName = ev.action.getClip().name;
			
			if( this.clipFrameActions.has(clipName) ) {
				this.clipFrameActions.get(clipName)?.forEach( (frameAction) => {
					frameAction.wasExecuted = false;
				});
			}

		}

		this.mixer.addEventListener("loop", onActionReachesEnd);
		this.mixer.addEventListener("finished", onActionReachesEnd);
    }

    update(delta: number) { 

		if( this.disabled ) { 
			return;
		};

        this.mixer.update(delta);  

		//
		// scan for frame events...
		//
		for (const channelName in this.currentActions) {
			const action = this.currentActions[channelName];
			const clip = action.getClip();
			const list = this.clipFrameActions.get(clip.name);
			if (!list) continue;

			const t = action.time;

			for (let i = 0; i < list.length; i++) {
				const fa = list[i];
				if (fa.wasExecuted) continue;
				if (fa.time > t) break;

				fa.wasExecuted = true;
				this.dispatchEvent({
					type: "clipEvent",
					name: fa.eventName,
					clip 
				});
			}
		} 

    }

	private getAdditiveClip(clipName:string) {
		if(this.additiveClips[clipName]) return this.additiveClips[clipName];

		const clip = this.clips[clipName];
		if(!clip) return null;

		const newClip = clip.clone();
		newClip.name = clipName + "_additive";
		this.additiveClips[clipName] = newClip;
		
		AnimationUtils.makeClipAdditive(newClip, 0 );

		newClip.blendMode = AdditiveAnimationBlendMode;

		return newClip;
	}

    gotoAndPlay(clipName: string, options?: PlayOptions) {

        const clip = options?.additive ? this.getAdditiveClip(clipName) : this.clips[clipName];
		
        if (!clip) return;

		let channelName = options?.channel || "default";

		if( this.currentActions[channelName]?.getClip()==clip && !options?.force ) { 
			return;
		}

        if (this.cleanupActions[channelName]) {
            this.cleanupActions[channelName]();
            delete this.cleanupActions[channelName];
        } 

        const action = this.mixer.clipAction(clip);
			  //action.stop();
			  action.reset();
			  action.paused = false; 

        if (this.currentActions[channelName] && this.currentActions[channelName] !== action) {

			if( options.startTime==0 || options?.force )
			{
				this.currentActions[channelName].stop();
			}
			else 
			{ 
				this.currentActions[channelName].crossFadeTo(action, 0.2 );
			}
        } 

        action.time = options?.randomStartTime ? Math.random() * clip.duration : options?.startTime || 0; 
		action.timeScale = options?.timeScale || 1;
		 

        if (options?.loop === false) {
            action.setLoop(LoopOnce, 1);
            action.clampWhenFinished = true;
        } else {
			action.clampWhenFinished = false;
            action.setLoop(LoopRepeat, Infinity);
        }

        if (options?.onClipEndOrLoop) {
            const handler = ( ev:Event<"finished" | "loop", AnimationMixer> ) => {
                options.onClipEndOrLoop?.();

				if( ev.type === "finished") {
					this.cleanupActions[channelName]?.();
					delete this.cleanupActions[channelName];
				}
            };

            this.mixer.addEventListener("finished", handler);
            this.mixer.addEventListener("loop", handler);

            this.cleanupActions[channelName] = () => {
                this.mixer.removeEventListener("finished", handler);
                this.mixer.removeEventListener("loop", handler);
            };
        }
 
        this.currentActions[channelName] = action;
        this.isPaused = false;
		action.play();

		return action;
    }

    gotoAndStop(clipName: string, options?: PlayOptions) {
        const clip = this.clips[clipName];
        if (!clip) {
			console.warn("Animation clip not found: " + clipName);
			return;
		};

		let channelName = options?.channel || "default";

		if (this.cleanupActions[channelName]) {
            this.cleanupActions[channelName]();
            delete this.cleanupActions[channelName];
        }

        const action = this.mixer.clipAction(clip);

        if (this.currentActions[channelName] && this.currentActions[channelName] !== action) {
            this.currentActions[channelName].crossFadeTo(action, 0.2, true);
        }

        action.reset();
        action.time = options?.startTime || 0;
        action.play();
        action.paused = true;

        this.currentActions[channelName] = action;
        this.isPaused = true;

		return action;
    }
 
}
