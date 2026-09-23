import { AdditiveBlending, BufferAttribute, InstancedBufferAttribute, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, Sprite, Vector3, type Texture } from "three";
import { color, instancedBufferAttribute, texture, time, uv, vec2, vec3,  } from "three/tsl";
import { SpriteNodeMaterial, Node } from "three/webgpu";
import type { IUpdatable } from "../IUpdatable";
import { getSpriteTextureNode } from "../utils/getSpriteTextureNode";

export type EmitterConfig = {
	sizeRandomness:number
	frecuency:number
	scale:number
	duration:number
	durationRandomness:number
	onEmit?:( index:number, position:Vector3, dt:number)=>void
}

const v = new Vector3();

export class SpriteEmitter<CFG extends EmitterConfig = EmitterConfig> extends Sprite implements IUpdatable  {

	private emitters:Emitter[] = [];
	private cursor:number = 0;

	readonly setSpritePosition: (index:number, newPos:Vector3)=>void;
	readonly startSprite: (index:number, duration:number, scale:number)=>void;

	readonly dataAttribute:InstancedBufferAttribute;
	protected dataNode:Node<"vec3">;
	protected progressNode:Node<"float">;

	/**
	 * 
	 * @param spriteTexture If it is a mesh, it is assumed to be a perfect quad that has a material from an atlas texture and it's UVs are inside of an atlas. NOT ROTATED. Else, it is the texture to use itself.
	 * @param poolSize 
	 */
	constructor( spriteTexture:Texture|Mesh, poolSize:number ) {
		const positions = Array.from({length:poolSize*3}, ()=>0);
		const positionAttribute = new InstancedBufferAttribute( new Float32Array( positions ), 3 );

		/**
		 * [ startTime, duration, scaleMult ]
		 */
		const dataAttribute = new InstancedBufferAttribute( new Float32Array( positions ), 3 );
		const dataNode = instancedBufferAttribute<'vec3'>( dataAttribute );
 

		const material = new SpriteNodeMaterial({ 
			sizeAttenuation: true, 
			colorNode: getSpriteTextureNode(spriteTexture),
			positionNode: instancedBufferAttribute<'vec3'>( positionAttribute ) ,
			scaleNode: dataNode.z ,
			//rotationNode: time, 
			blending: AdditiveBlending,
			//opacityNode: smokeProgress.oneMinus().mul( texture(smokeTexture) ),
			depthWrite:false,
			//depthTest:false
			
		} );

		super( material); 
		this.count = poolSize;
		this.frustumCulled = false;
		this.dataAttribute = dataAttribute;
		this.dataNode = dataNode;
		this.progressNode = time.sub( this.dataNode.x ).div( this.dataNode.y ).clamp(0,1);

		this.setSpritePosition = (index:number, newPos:Vector3)=>{
			positionAttribute.setXYZ(index, newPos.x, newPos.y, newPos.z);
			positionAttribute.needsUpdate = true;
		}

		this.startSprite = (index:number, duration:number, scale:number)=>{
			dataAttribute.setX(index, time.value ); //star time
			dataAttribute.setY(index, duration ); //duration
			dataAttribute.setZ(index, scale ); //scale
			dataAttribute.needsUpdate = true;
		}
	}

	register( source:Object3D, config:CFG )
	{
		const emitter = new Emitter( this, source, config );
		this.emitters.push(emitter);
		return ()=>{
			this.emitters = this.emitters.filter( e => e !== emitter );
		};
	}

	update( dt:number ) {
		for( const emitter of this.emitters ) {
			emitter.update( dt );
		}
	} 

	nextCursor() {
		this.cursor = (this.cursor + 1) % this.count;
		return this.cursor;
	}

}

class Emitter<CFG extends EmitterConfig =EmitterConfig> implements IUpdatable {
	
	private lastTime = 0;
	private fixedScale:number;
	private randomPart:number;
	private fixedDuration:number;
	private randomDuration:number;

	constructor( readonly manager:SpriteEmitter, readonly source:Object3D, readonly config:CFG ) {
		const part = this.config.scale * this.config.sizeRandomness;
		this.fixedScale = this.config.scale - part;
		this.randomPart = part ;

		const durPart = this.config.duration * this.config.durationRandomness;
		this.fixedDuration = this.config.duration - durPart;
		this.randomDuration = durPart * 2;
	}

	update( dt:number ) {

		this.lastTime += dt;
		if( this.lastTime < this.config.frecuency ) return;
		this.lastTime = 0; 
		 
		const cursor = this.manager.nextCursor();
		
		v.set(0,0,0);
		this.source.localToWorld(v);
		 
		this.manager.startSprite(cursor, this.fixedDuration + this.randomDuration * Math.random(), this.fixedScale + this.randomPart * Math.random())
		
		this.config.onEmit?.( cursor, v, dt );
		this.manager.setSpritePosition( cursor, v);
		
		
	}
}