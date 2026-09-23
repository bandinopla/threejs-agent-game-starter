import { AxesHelper, Mesh, MeshBasicMaterial, SphereGeometry, type Object3D, type Vector3 } from "three";
import type { IInteractable } from "./IInteractable";
import { updatables, type IUpdatable } from "../IUpdatable";
import { InstancesSyncer } from "./InstancesSyncer";
import type { Sensor } from "../physics/PhysicsScene";

export class Door implements IInteractable, IUpdatable {

	private _busy = false;
	private _openPosition:Vector3;
	private _closedPosition:Vector3;
	private _syncer:InstancesSyncer ;
	private cancelCurrentAnim:VoidFunction|undefined;
	 
	private _value = 0;
	private _valueGoal = 0;

	/**
	 * an empty box object used to detect when the area is clear to close the door.
	 */
	private _sensor:Sensor;

	private _timeSinceOpen = 0;
	private _autoCloseDelay = 3; //seconds
	private _canAutoClose = true;


	/**
	 * Obj is a template object containing the visual parts of the door. It is expected to have:
	 * - A parent with a child.userData.doorGoal `embpty obj defining the position/rotation goal for when it is open`
	 * - A parent with a child.userData.sensor `empty obj defining the area to keep clear to close the door`
	 * @param obj 
	 */
	constructor( readonly obj:Object3D ){
		
		requestAnimationFrame(()=>{
			obj.parent!.children.forEach( child => {
				if( child.userData.doorGoal )
				{
					this._openPosition = child.position;
				}
				else if( child.userData.sensor )
				{
					this._sensor = child.userData.sensor as Sensor;
					this._sensor.onExit = (_body, totalInside)=>{
						if(totalInside == 0){
							this._canAutoClose = true; 
							if( this.isOpen ){
								this._timeSinceOpen = 0;
							}
						} 
					}
					this._sensor.onEnter = (_body, totalInside)=>{
						this._canAutoClose = false;
					}
				}
			});

			if(!this._openPosition){
				throw new Error("Door has no goal");
			}

			if(!this._sensor){
				throw new Error("Door has no sensor!");
			}

			this._syncer = new InstancesSyncer(this.obj);
			this._closedPosition = obj.position.clone(); 
		})
		 
	}

	get isOpen() {
		return this._value === 1 && this._valueGoal===1;
	}

	activate( actor:any ):void{
		//if(this._busy) return; 
		//this._busy = true; 
		// updatables.addProgressUpdatable(.3, (progress:number)=>{
		// 	this.obj.position.lerpVectors(this._closedPosition, this._openPosition, progress); 
		// 	this._syncer.sync();
		// });
		this.open();
	}

	open() {
		if( this.isOpen ) return;

		this.cancelCurrentAnim?.();
		this._valueGoal = 1;
		this.cancelCurrentAnim = updatables.add(this); 
	}

	close() {
		if( !this.isOpen ) return;

		this.cancelCurrentAnim?.();
		this._valueGoal = 0; 
		this.cancelCurrentAnim = updatables.add(this);
	}

	update(delta: number): void | false {

		if( this.isOpen && this._timeSinceOpen>-1 )
		{ 
			this._timeSinceOpen += delta;
			if( this._timeSinceOpen > this._autoCloseDelay && this._canAutoClose) {
				this.close();
			} 
			return;
		}


		this._value += ( this._valueGoal>this._value ? 1 : -1 ) * delta * 2;
		if( this._value > 1 ) this._value = 1;
		if( this._value < 0 ) this._value = 0;
		this.obj.position.lerpVectors(this._closedPosition, this._openPosition, this._value); 
		this._syncer.sync();
		if( this._value === this._valueGoal ) {
			if( this.isOpen ) {
				this._timeSinceOpen = 0;
				// will continue keeping this updatable active
			} 
			else 
				{
				this._timeSinceOpen = -1; 
				return false
			}
		};
	}
}