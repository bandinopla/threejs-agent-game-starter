import { Vector3, type Object3D } from "three";
import type { IUpdatable } from "../IUpdatable";
import { Entity, type EntityEvents } from "./Entity";
import type { PhysicsScene } from "../physics/PhysicsScene";
import type { ColliderHandler } from "../physics/types";
import { Layers } from "../level/Layers";
import { $onStreamEvent } from "../events/events";

export interface ShootableEntityEvents extends EntityEvents {
	gotShot: { rayOrigin:Vector3, rayDirection:Vector3, strength:number }
}

export class ShootableEntity<E extends ShootableEntityEvents = ShootableEntityEvents> extends Entity<E & ShootableEntityEvents> implements IUpdatable {

	private _physicsScene:PhysicsScene|undefined;
	get physicsScene() { return this._physicsScene; }
	set physicsScene( value:PhysicsScene|undefined ) { 
		this._physicsScene = value; 
		if( value ) this.initializeColliders();
	}

	disableRagdoll:VoidFunction|undefined;

	private hitboxes:Object3D[] = [];
	protected isRagdoll = false; 
	private collidersHandlers:ColliderHandler[]|undefined;

	protected setupHitboxes( tmpl:Object3D )
	{
		tmpl.traverse( (o) => {
			if( o.userData.hitbox )
			{
				const hitbox = o.clone();
				this.add(hitbox);
				this.hitboxes.push(hitbox);

				hitbox.userData.onRayHit = this.onRayShotUs.bind(this)
			}
		});

		const localPos = new Vector3();
		const scale = new Vector3();

		//
		// for every hitbox
		//
		this.hitboxes.forEach( (h) => {

			h.layers.disableAll();
			h.layers.enable(Layers.SHOOTABLE);

			if( h.userData.stickto )
			{
				//find this....
				let target : Object3D|undefined;
				this.traverse( (o) => {
					if( o.userData.name === h.userData.stickto )
					{
						target = o;
					}
				});

				if( target )
				{
					target.attach(h);
				}
				else 
				{
					console.warn("No se encontro el target", h.userData.stickto);
				}
			}

			//
			// for the assisted shot event....
			//
			$onStreamEvent("assistedPlayerShot", (ev)=>{
				
				h.getWorldScale(scale);
				ev.shotWorld.worldToLocal(  h.getWorldPosition(localPos)  );

				const inRange = localPos.z>0 && localPos.z<5 && Math.abs(localPos.x) < (ev.thickness+scale.x)

				if( inRange ) {
					this.onRayShotUs(ev.shotWorld.position, ev.shotWorld.getWorldDirection(localPos) , localPos.z);
					return true;
				}
			});
		});
	}

	protected initializeColliders() {
		this.collidersHandlers = this.createPhysicsWrappers()
	 
	}

	update(delta: number): void {

		if( this.isRagdoll ) {
			this.collidersHandlers?.forEach( h => h.syncObject() ); 
		}
		
	}

	protected onRayShotUs( rayOrigin:Vector3, rayDirection:Vector3, rayLength:number ){
		this.isRagdoll = true;

		if( !this.collidersHandlers ) {

			console.warn("You must initialize colliders handlers first")
			return;
		}; 

		const strength = (10 - Math.min(10, rayLength))/10;
 

		// apply shot impulse
		this.collidersHandlers.forEach( h => {
			h.enable(); 

			h.applyImpulseAtPoint(rayDirection.clone().multiplyScalar(strength*.01 ), rayOrigin); 
			
		});

		this.disableRagdoll = () => {
			this.collidersHandlers?.forEach( h => h.disable() ); 
			this.isRagdoll = false;
		};

		this.events.dispatchEvent({
				type:"gotShot",
				rayOrigin,
				rayDirection,
				strength
			});

		//setTimeout( this.reset.bind(this), 5000 );
	}

	/**
	 * This is the place where you create the physical objects that will map to your ragdoll and it's
	 * parts/items... 
	 */
	protected createPhysicsWrappers() : ColliderHandler[] {
		//this is where you create the physics bodies for all the parts of this entity
		throw "Not implemented"
	}

	override reset(): void {
		// this.disableRagdoll?.();
		// this.disableRagdoll = undefined; 
		this.collidersHandlers?.forEach( h => h.reset() );  
		this.isRagdoll = false;
		super.reset();
	}

	override getSnapshot(): any {
		return {
			...super.getSnapshot(),
			isRagdoll: this.isRagdoll,
			collidersState: this.collidersHandlers?.map( h => h.getSnapshot() ),
		}
	}

	override restoreSnapshot( snapshot:any ) {
		super.restoreSnapshot(snapshot);
		this.isRagdoll = snapshot.isRagdoll;
		this.collidersHandlers?.forEach( (h, i) => {

			if( h.obj.visible ) {
				h.restoreSnapshot(snapshot.collidersState[i]);
			}

		} );
	}
}

/**
 * 
 * head: DEF-spine.006
 * neck: DEF-spine.004
 * torso: DEF-spine.002
 * abs: DEF-spine.001,
 * hips: DEF-spine
 * 
 * arms...
 * armL: DEF-upper_arm.L
 * forearmL: DEF-forearm.L
 * handL: DEF-hand.L
 * 
 * armR: DEF-upper_arm.R
 * forearmR: DEF-forearm.R
 * handR: DEF-hand.R
 * 
 * legs...
 * legL: DEF-thigh.L
 * shinL: DEF-shin.L
 * footL: DEF-foot.L
 * 
 * legR: DEF-thigh.R
 * shinR: DEF-shin.R
 * footR: DEF-foot.R
 * 
 */