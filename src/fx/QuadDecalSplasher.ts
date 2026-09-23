import { InstancedMesh, Matrix4, Vector3 } from "three"; 
import { Object3D, type Material, type NodeMaterial } from "three/webgpu";
import { MeshBasicMaterial, PlaneGeometry } from "three";
import type { IUpdatable } from "../IUpdatable";
import { findRaycastSolver } from "../level/IRaycastSolver";
import { $events } from "../events/events";
import { OnlyWallsLayer } from "../level/Layers";
import type { Entity } from "../entity/Entity";

export interface SplashConfig {
	duration:number;
	ratio:number;
	frecuency?:number
}

/**
 * this class will use a raycast to place a quad at the hit position.
 * 
 * It will use a random rotation and scale to make it look random.
 */
export class QuadDecalSplasher extends InstancedMesh implements IUpdatable {

	/**
	 * these are objects in charge of emiting the decals every so often...
	 */
	private emitters:QuadEmitter[] = [];

	/**
	 * these are the actual decals
	 */
	private decals:QuadDecal[] = [];

	constructor( count:number, material:Material ) {
		const geo = new PlaneGeometry(1,1);
		super(geo, material, count);

		this.receiveShadow = true;

		this.frustumCulled = false;

		for( let i=0; i<count; i++ ) {
			const e = new QuadDecal(i, this);
			this.decals.push(e);
			this.add(e);
			e.kill();
		}

		// reset
		$events.addEventListener("reset", () => {
			this.emitters.forEach(emitter => emitter.kill());
			this.decals.forEach(decal => decal.kill());

		});
	}

	update(dt:number) {

		for( const emitter of this.emitters ) {
			if( !emitter.visible ) continue;
			emitter.update(dt, this.emitDecal );
		}
		
	}

	private emitDecal = ( wPos:Vector3, normal:Vector3, config:SplashConfig ) => {
		const decal = this.decals.find(d=>!d.visible);

		if( decal )
		{ 
			decal.spawnAt( wPos, normal, config );
		}
	} 
	

	/**
	 * Create a source for emiting decals....
	 * @param source 
	 * @param config 
	 */
	emitFrom( source:Object3D, config:SplashConfig, entity?:Entity ) {
		//find free emitter
		let emiter = this.emitters.find(em=>!em.visible);
		if( !emiter ) {
			//emiter.spawnAt( source, config );
			emiter = new QuadEmitter( source, config );
			this.emitters.push(emiter);
			this.add(emiter);
		}
		else 
		{
			emiter.wakeUp(source, config);
		}

		if( entity )
		{
			const onEntityResetted = ()=>{
				emiter.kill();
				entity.events.removeEventListener("reset", onEntityResetted);
			}
			entity.events.addEventListener("reset", onEntityResetted);
		}
	}
	
}


const DOWN = new Vector3(0,-1,0);


/**
 * This objects is in charge of emitting the decals
 * This one by default will shoot rays downwards
 * TODO. maybe do something to change emission behaviour?
 */
class QuadEmitter extends Object3D { 
	life:number;
	t:number;

	constructor( private source:Object3D, private config:SplashConfig ) {
		super();
		this.life = config.duration;
		this.visible = true;  
		this.t = 0; 
	}

	wakeUp( source:Object3D, config:SplashConfig ) {
		this.source = source;
		this.config = config;
		this.life = config.duration;
		this.visible = true;  
		this.t = 0; 
	}

	kill() {
		this.life = 0;
		this.visible = false; 
	}

	update( delta:number, emit:( wPos:Vector3, normal:Vector3, config:SplashConfig)=>void ) {
		 
		this.life -= delta;
		this.t += delta; 

		this.source.getWorldPosition(this.position);
		this.position.y += .5;

		if( this.life <= 0 ) {
			this.kill();
			return;
		}

		if( this.t >= this.config.frecuency ) {
			this.t = 0; 
			
			const solver = findRaycastSolver( this.source);
			const hit = solver?.shootRay( this.position, DOWN, OnlyWallsLayer.mask ); 

			if( hit ) {
				const position = hit.point;
				const normal = hit.normal; 

				emit( position, normal, this.config ) 
			}
		} 
	}
 
	
}


/**
 * This is the decal itself. 
 
 */
class QuadDecal extends Object3D {
	constructor(readonly index:number, readonly imesh:InstancedMesh ){
		super();
		this.visible = false;
	}

	spawnAt( wPos:Vector3, normal:Vector3, config:SplashConfig ) {
		this.position.copy(wPos);
		this.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), normal);

		this.translateZ( 0.001+0.0001*this.index );
		this.translateX(Math.random()*config.ratio*(Math.random()>0.5?1:-1));
		this.translateY(Math.random()*config.ratio*(Math.random()>0.5?1:-1));
		


		this.rotateZ(Math.random()*Math.PI*2);
		this.updateMatrix();
		this.imesh.setMatrixAt(this.index, this.matrix);
		//this.imesh.instanceMatrix.needsUpdate = true;
		this.visible = true;
	}

	kill() {
		this.visible = false;
		this.position.set(0,-100,0);
		this.quaternion.set(0,0,0,1);
		this.updateMatrix();
		
		this.imesh.setMatrixAt(this.index, this.matrix);
		//this.imesh.instanceMatrix.needsUpdate = true;
	}
}