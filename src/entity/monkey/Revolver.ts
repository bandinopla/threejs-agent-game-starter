import { AxesHelper, InstancedMesh, Layers, MeshPhysicalMaterial, NearestFilter, Object3D, SRGBColorSpace, Vector3, type Mesh } from "three";
import { findScene } from "../../utils/find-scene";
import { updatables, type IUpdatable } from "../../IUpdatable";
import { $events, $streamEvent } from "../../events/events";
import { findRaycastSolver } from "../../level/IRaycastSolver";
import { Layers as GameLayers } from "../../level/Layers";
import { MeshBasicNodeMaterial } from "three/webgpu";
import { color, mix, texture, time } from "three/tsl";
import { createAudioEmitterOnObject, type AudioEmitterObject } from "../../sounds/envAudio";

export class Revolver implements IUpdatable {

	private bullet:Mesh;
	private bullets:Bullet[] = [];
	private ibullet:InstancedMesh;
	private _clearUpdate:VoidFunction|undefined;
	private _bulletLayer:Layers;
	private audio:AudioEmitterObject;

	constructor( readonly root:Object3D )
	{
		this._bulletLayer = new Layers();
		this._bulletLayer.set(GameLayers.WALLS); 

		this.audio = createAudioEmitterOnObject(this.root, 3);

		root.traverse((obj) => {
			if(obj.userData.bullet) {
				this.bullet = obj as Mesh;
				this.setupBulletMaterial(this.bullet.material as MeshPhysicalMaterial);
				obj.visible = false;
			}
		});

		$events.addEventListener("reset", this.reset.bind(this));

		$events.addEventListener("startGame", ()=>{ 

			this.lazyInitBullets();

			// start updating the bullets
			this._clearUpdate = updatables.add(this);
		});
	}

	private setupBulletMaterial( material:MeshPhysicalMaterial ) {
		if( material.map )
		{
			material.map.colorSpace = SRGBColorSpace;
			material.map.minFilter = NearestFilter;
			material.map.magFilter = NearestFilter;
			material.map.needsUpdate = true; 

			this.bullet.material = new MeshBasicNodeMaterial({
				colorNode: texture(material.map).mul( mix(color("#fffffff") , color("#00f7ff"), time.mul(50).sin().add(1).div(2)))
			});
		}
	}

	private lazyInitBullets() {
		if( this.ibullet ) return;

		const scene = findScene(this.root);

		this.ibullet = new InstancedMesh(this.bullet.geometry, this.bullet.material, 100);
		this.ibullet.frustumCulled = false;

		for(let i=0; i<this.ibullet.count; i++) { 
			const bullet = new Bullet(i, this.ibullet);
			this.bullets.push(bullet); 
		} 
		
		scene.add(this.ibullet);
	}

	shoot( targetPos:Vector3, yOffset:number=0 ) {
		
		const shootTarget = targetPos.clone();
		shootTarget.y += yOffset;
		const bulletWorldPos = this.bullet.getWorldPosition(new Vector3());
		const dir = bulletWorldPos.clone().sub(shootTarget).normalize().negate();

		$events.dispatchEvent({type:"spawnSmoke", position:bulletWorldPos });

		this.audio.play("revolver-shot", false, 0.2, 0.1);

		const solver = findRaycastSolver(this.bullet);

		if( solver )
		{
			const hit = solver.shootRay(bulletWorldPos, dir, this._bulletLayer.mask);
			if( hit ){
				  
				const distance = hit.distance;
				const freeBullet = this.bullets.find( b => b.available );

				if( freeBullet ) { 
					freeBullet.shoot( this.bullet, dir, distance, ()=>{

						// on hit wall / end of distance....

						$events.dispatchEvent({
							type:"addBulletHoleAt",
							position:hit.point,
							normal:hit.normal
						})

					})
				}


			}
		} 
	}

	update(delta: number): void {
		for( const bullet of this.bullets ) {
			if( bullet.visible ) {
				bullet.update(delta);
			}
		}
		this.ibullet.instanceMatrix.needsUpdate = true;
	}

	reset() {
		this.bullets.forEach( b => b.kill() );
		this._clearUpdate?.();
	}
}

class Bullet extends Object3D implements IUpdatable {
	direction = new Vector3();
	speed = 10;
	distance = 0;

	private audio:AudioEmitterObject;
	private _available = true;
	get available() { return this._available ; }

	private onDistanceReached:VoidFunction|undefined;
	private _moving:boolean;

	constructor(readonly index:number, private imesh:InstancedMesh ){
		super();  
		this.position.y = -1000;
		this.updateMatrix()
		imesh.setMatrixAt(index, this.matrixWorld);
		this.visible = false;
		imesh.add( this )
		this.audio = createAudioEmitterOnObject(this, 2);
		this._available = true;
	}	
 

	shoot( bullet:Mesh, dir:Vector3, distance:number, onDistanceReached?:VoidFunction ) {

		this.distance = distance;
		this.onDistanceReached = onDistanceReached;

		// forward dir is... Y (or Z....)
		this.direction.copy(dir)
		
		bullet.getWorldPosition(this.position);
		bullet.getWorldQuaternion(this.quaternion);
		bullet.getWorldScale(this.scale);
		
		//look at in same direction as dir
		this.lookAt(this.position.x- dir.x, this.position.y - dir.y, this.position.z - dir.z)

		this.visible = true;
		this.updateMatrix();
		this.imesh.setMatrixAt(this.index, this.matrix); 

		this._moving = true; 
	}

	private onHitSomething( flesh:boolean = false) {
 
		this._moving = false;
		this.audio.play("bullet-hit-wall"); 

		const y = this.position.y;
		this.position.y = -1000;
		this.updateMatrix();
		this.imesh.setMatrixAt(this.index, this.matrix);

		this.position.y = y;

		setTimeout(() => this.kill(), 1000);
	}

	update(delta: number): void { 
 
		if(!this._moving) return;

		const step = delta * this.speed;
		this.distance -= step;
		if( this.distance <= 0 ) { 

			this.onHitSomething( false );
			this.onDistanceReached?.();
		
			return;
		}
		this.position.addScaledVector(this.direction, step  );
		this.updateMatrix();
		this.imesh.setMatrixAt(this.index, this.matrix); 

		$streamEvent({
			type:"bullet",
			worldPos:this.position.clone(),
			onHit:()=>{
				this.onHitSomething( true ); 
			}
		});
	}

	kill() {
		this.visible = false;
		this.position.y = -1000;
		this.updateMatrix();
		this.imesh.setMatrixAt(this.index, this.matrix);
		this.onDistanceReached = undefined;
		this.audio.stop();
		this._available = true;
		this._moving = false;
	}
}