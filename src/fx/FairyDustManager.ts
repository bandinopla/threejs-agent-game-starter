import type { Mesh, Object3D, Texture, Vector3 } from "three";
import { SpriteEmitter, type EmitterConfig } from "./SpriteEmitter";
import { $events } from "../events/events";
import { updatables, type IUpdatable } from "../IUpdatable";
import type { SpriteNodeMaterial,Node, TextureNode  } from "three/webgpu";
import { color, float, hue, instanceIndex, time, vec3,  } from "three/tsl";

export type FairyDustConfig = { 
	radius:number
	radiusRandomness:number
} & EmitterConfig;

export class FairyDustManager extends SpriteEmitter<FairyDustConfig> {
	
	constructor( sparkTexture:Texture|Mesh ) {
		super(sparkTexture, 100);


		// 
		const m = this.material as SpriteNodeMaterial;
		const posNode = m.positionNode as Node<"vec3">;  
 

		//const colorTint = hue(color("red"), time.mul(10).add( instanceIndex ) ) ;
		 

		//m.colorNode = m.colorNode.mul( colorTint ).mul( 4 );
		m.colorNode = m.colorNode.mul( 3 );


		m.scaleNode = (m.scaleNode as Node<"float">).mul( this.progressNode.oneMinus() );

		$events.addEventListener("registerFairyDustEmiter", ( event ) => {
  
			const radius = event.config.radius ?? .4;
			const radiusRandomness = event.config.radiusRandomness ?? 0.5;

			const variantRadius = radius * radiusRandomness;
			const fixedRadius = radius - variantRadius;
			const randomRadius = variantRadius ;

			const remover = this.register( event.source, {
				frecuency:0.06,
				sizeRandomness:0.5,
				scale:0.2,
				duration:.5,
				durationRandomness:.3,
				radius,
				radiusRandomness,
				...event.config,
				onEmit:( index, position, dt )=>{ 
					

					const emitRadiusX = fixedRadius + randomRadius * Math.random();
					const emitRadiusY = fixedRadius + randomRadius * Math.random();
					const emitRadiusZ = fixedRadius + randomRadius * Math.random();
					
					position.x += -emitRadiusX + emitRadiusX * 2 * Math.random();
					position.y += -emitRadiusY + emitRadiusY * 2 * Math.random();
					position.z += -emitRadiusZ + emitRadiusZ * 2 * Math.random();

				}
			} )
			event.unregisterRef( remover );
		});

		updatables.add(this);
	}  
	
}

