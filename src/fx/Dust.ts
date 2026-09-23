import { InstancedMesh, MeshBasicMaterial, Object3D, SphereGeometry, Vector3 } from "three";
import type { IUpdatable } from "../IUpdatable";

type DustConfig = { 
	duration:number

	/**
	 * Minimal distance that needs to occur before spawning
	 */
	minStepDistance:number

	/**
	 * a random position in this ratio will be chosen
	 */
	spawnRadius:number

	startScale:number
}


/**
 * Handles the creation of dust particles using instancedMesh so each dust particle is a 3d mesh.
 * 
 * You add "emitters" and based on how far they move from a throshold, a particle will be instantiated at a random position in the spawnRadius.
 * 
 * The particles will then fade out and move up over a duration.
 */
export class Dust extends InstancedMesh implements IUpdatable {

	private particles:DustParticle[] = []
	private emmiters:DustEmiter[] = []

	constructor() {
		const geo = new SphereGeometry(.1,5,5);
		const mat = new MeshBasicMaterial({color:0xffffff, opacity:0.5, alphaHash:true});
		super(geo, mat, 100);

		for( let i=0; i<this.count; i++ ) {
			const p = new DustParticle(i, this);
			this.particles.push(p);
			this.add(p);
		}

		this.frustumCulled = false;
	}

	update(delta: number): void {

		for(let i=0; i<this.emmiters.length; i++) {
			const emiter = this.emmiters[i];
			emiter.update(delta); 
		}

		for(let i=0; i<this.particles.length; i++) {
			const p = this.particles[i];
			if( p.life > 0 ) {
				p.update(delta)
			}
		}
	}

	addEmiter( obj:Object3D, config:DustConfig ) {
		const emiter = new DustEmiter(obj, config, (pos:Vector3)=>{

			for( let i=0; i<this.particles.length; i++ ) {
				const p = this.particles[i];
				if( p.life <= 0 ) {
 
					p.spawn(pos, config);
					break;
				}
			}

		});

		this.emmiters.push(emiter);
		this.add(emiter);
	}
}

class DustEmiter extends Object3D {
	private currPos = new Vector3();

	constructor( private obj:Object3D, private config:DustConfig , private emitParticle: (pos:Vector3)=>void ) {
		super();

		obj.getWorldPosition(this.position);
	}

	update(delta:number) {
		this.obj.getWorldPosition(this.currPos);

		const dist = this.currPos.distanceTo(this.position);
		if( dist > this.config.minStepDistance ) {
			this.position.copy(this.currPos);
			this.emitParticle(this.currPos);
		}
	}
}

class DustParticle extends Object3D {
	life:number
	config:DustConfig|undefined
	private progress: ((value:number)=>void) | undefined;

	constructor( private index:number, private imesh:InstancedMesh ) {
		super();
		this.kill();
	}

	kill() {
		this.life = 0;
		this.visible = false;

		this.position.y=-100;
		this.updateMatrix();
		this.imesh.setMatrixAt(this.index, this.matrix); 
	}

	spawn( pos:Vector3, config:DustConfig ) {
		this.life = config.duration;
		this.visible = true;
		this.position.copy(pos);

		this.position.x += -config.spawnRadius + Math.random() * config.spawnRadius * 2;
		this.position.z += -config.spawnRadius + Math.random() * config.spawnRadius * 2;
		this.config = config;
		

		const initScale = Math.random()*0.5+0.5 * ( config.startScale || 1 );
		const targetScale = initScale * 0.1;
		const initY = pos.y;
		const targetY = pos.y + .1;

		this.scale.setScalar(initScale);
		this.updateMatrix();

		this.progress = value => {
			this.scale.setScalar(initScale + (targetScale - initScale) * value);
			this.position.y = initY + (targetY - initY) * value;
		}
	}

	update(delta:number) {
		this.life -= delta;

		const progress = 1 - (this.life / this.config.duration);

		this.progress(progress);
		this.updateMatrix();

		if( this.life <= 0 ) {
			this.kill();
		}
		else 
		{
			this.imesh.setMatrixAt(this.index, this.matrix); 
		} 
		
	}
}