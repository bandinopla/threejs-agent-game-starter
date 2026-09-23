import { AdditiveBlending, InstancedBufferAttribute, Mesh, Object3D, Sprite, Texture, Vector3 } from "three";
import { $events } from "../events/events";
import { color, float, instancedBufferAttribute, pow, texture, time, uniform, vec3 } from "three/tsl";
import { SpriteNodeMaterial } from "three/webgpu";
import { getSpriteTextureNode } from "../utils/getSpriteTextureNode";

const TOTAL = 10;
export class Smoke extends Sprite {
 
	private cursor = 0;
	private dummy = new Object3D();
	spawnSmoke: ( position:Vector3 ) => void;

	constructor( smokeTexture:Texture|Mesh )
	{
		const positions = Array.from({length:TOTAL*3}, ()=>0);
		const positionAttribute = new InstancedBufferAttribute( new Float32Array( positions ), 3 );
		const timeAttribute = new InstancedBufferAttribute( new Float32Array( Array.from({length:TOTAL}, ()=>0) ), 1 );

		const lifespan = uniform(.6);

		let elapsed = time.sub( instancedBufferAttribute<"float">( timeAttribute )  )
		let progress = elapsed.div( lifespan ).clamp(0,1);
		let smokeProgress = elapsed.div( lifespan.mul(2) ).clamp(0,1);

		progress = pow(progress, float(0.2));
		smokeProgress = pow(smokeProgress, float(0.2));
		
		const material = new SpriteNodeMaterial({ 
			sizeAttenuation: true, 
			colorNode:color(0xffffff).mul(3),
			positionNode: instancedBufferAttribute( positionAttribute ).add(vec3(0,progress.mul(0.1),0)),
			scaleNode: smokeProgress.mul(2) ,
			rotationNode: time, 
			blending: AdditiveBlending,
			opacityNode: smokeProgress.oneMinus().mul( getSpriteTextureNode(smokeTexture) ),
			depthWrite:false,
			//depthTest:false
		} )

		super( material); 
		this.count = TOTAL;
		this.frustumCulled = false;

		$events.addEventListener("spawnSmoke", (e)=>{
			this.spawnSmoke(e.position); 
		})

		this.spawnSmoke = ( position:Vector3 ) => { 
			 
			positionAttribute.setXYZ(this.cursor, position.x, position.y, position.z);
			positionAttribute.needsUpdate = true;

			timeAttribute.setX(this.cursor, time.value);
			timeAttribute.needsUpdate = true;

			this.cursor = (this.cursor + 1) % this.count; 
		}

		
	}
 
}