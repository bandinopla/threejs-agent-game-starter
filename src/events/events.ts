import { Camera, EventDispatcher, Object3D, Vector3 } from "three";
import type { Monkey } from "../entity/monkey/Monkey";
import type { RetroWindow } from "../ui/RetroWindow";
import type { Entity } from "../entity/Entity";
import type { MonkeyWorker } from "../entity/monkey/MonkeyWorker";
import type { FairyDustConfig } from "../fx/FairyDustManager";
import type { EmitterConfig } from "../fx/SpriteEmitter";


export const $events = new EventDispatcher<GameEvents>();

export interface GameEvents {
	monkeyShot: {
		monkey:Monkey
	},

	startIntroWhenReady: {
		onReady: (value:unknown)=>void
	},
	
	reset: {}
	startPreIntro: {},
	startIntro: {},
	startGame: {},
	introDone: {},

	fadeToBlackThen: {

		fromBlack?:boolean,
		/**
		 * function to call after fade to black
		 * @returns Nothing or a promise that once resolved, the fade to white will start
		 */
		callback: ()=>void|Promise<void>
	},

	requestCursor: {
		container:Object3D,
		camera:Camera
	},

	releaseCursor: {},

	requestWindow: {
		newHost:Object3D,
		camera:Camera,
		name:string,
		getRef?:(w:RetroWindow)=>void
	},

	addBulletHoleAt: {
		position:Vector3,
		normal:Vector3
	},

	spawnSmoke: {
		position:Vector3,
	},

	firstKill: {},
	allWorkersDead: {},
	startSpawningEnemies: {},

	bullet: {
		worldPos:Vector3, 
		onHit:()=>void
	},

	playerDied: {
		entity:Entity
	},

	allMonkeysAreDead: {},

	playerKilledCameraAnimEnded: {},


	/**
	 * When the player shoots, from the pointof the origin of the gun an Object3D will be placed and oriented inthe shot's direction.
	 * Any hit box that lands inside this world's X range, should be hit.
	 * 
	 * hitboxes should listen to this stream event and calculate their world to local position and check if the X is in range.
	 */
	assistedPlayerShot: {
		shotWorld:Object3D

		/**
		 * on the X axis, anything in range of [ -thickness, thickness ] should be hit
		 */
		thickness:number
	},

	getWorkerMonkeyNearMe: {
		me:Object3D,

		/**
		 * if monkey's local position in "me" is less than this then it will reply.
		 */
		localRatio:number,

		imNearYou: (monkey:MonkeyWorker)=>void
	},

	registerFairyDustEmiter: {
		source:Object3D,
		config: Partial<Omit<FairyDustConfig, "onEmit">>,
		unregisterRef: ( unregister:VoidFunction ) =>void
	},

	gnomeIsHome: {}
	
}

export type StreamedEvent = {
	type:keyof GameEvents 
} & GameEvents[keyof GameEvents];


class StreamedEventListener {
	next:StreamedEventListener|undefined;
	constructor( readonly type:string, readonly callback:( event:any )=>void|boolean ) {}

	stream( event:StreamedEvent ) {

		let moveNext = true;
		if( event.type === this.type ) {
			const res = this.callback(event);
			if( typeof res === "boolean" ) moveNext = res;
		}
		if( moveNext ) this.next?.stream(event);
	}

	remove( listener:StreamedEventListener ) {
		if( this.next== listener ) {
			this.next = listener.next;
			return;
		}
		this.next?.remove(listener);
	}

	append( listener:StreamedEventListener ) {
		if( this.next ) this.next.append(listener);
		else this.next = listener;
	}
 
}


const $streamEventListeners = new StreamedEventListener("", ()=>true);


/**
 * 
 * @param type 
 * @param callback if callabck returns FALSE the event will stop propagation. 
 * @returns 
 */
export const $onStreamEvent = <T extends keyof GameEvents> ( type:T, callback:( ev:GameEvents[T] )=>void|boolean ) => {
	const listener = new StreamedEventListener(type, callback);

	$streamEventListeners.append(listener)

	return ()=>$streamEventListeners.remove(listener);
}


export const $streamEvent = ( event:StreamedEvent ) => {
 
	$streamEventListeners.stream(event)
}
 

