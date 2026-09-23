import { DoubleSide, InstancedMesh, Matrix4, Mesh, Object3D, PlaneGeometry, Scene, Texture, Vector3 } from "three";
import { findRaycastSolver } from "../../level/IRaycastSolver";
import { $events, $streamEvent } from "../../events/events";
import { getSpriteTextureNode } from "../../utils/getSpriteTextureNode";
import { MeshBasicNodeMaterial } from "three/webgpu";
import { max, step } from "three/tsl";

const v = new Vector3();
const spreadV = new Vector3();
const instanceMatrix = new Matrix4();

const MAX = 1100;

export class ShotgunBlast extends InstancedMesh {
	 
	private dummy = new Object3D();
	private cursor = 0; 

	constructor( holeTexture:Texture|Mesh ) {

		const colorNode = getSpriteTextureNode(holeTexture);
		
		super(new PlaneGeometry(.1,.1), new MeshBasicNodeMaterial({
			 
			side:DoubleSide, 
			colorNode: colorNode.rgb,
			opacityNode: step(0.0001, max(colorNode.r, max(colorNode.g, colorNode.b))),
			alphaTest: 0.01, 
			transparent:true, 
		}), MAX);

		this.frustumCulled = false;
		
		this.add( this.dummy )

		// --------

		//---------
		$events.addEventListener("reset", ()=>{
			this.reset();
		})

		$events.addEventListener("addBulletHoleAt", (e)=>{
			this.addBulletHoleAt(e.position, e.normal);
		})

		this.reset();
	}

	reset() {
		this.cursor = 0;
		//reset all instances...
		this.dummy.position.set(0,-1000,0);	
		this.dummy.updateMatrix();
		for(let i = 0; i < MAX; i++) {
			this.setMatrixAt(i, this.dummy.matrix);
		}
		this.instanceMatrix.needsUpdate = true;
	}

	fireBlast( total:number, origin:Vector3, end:Vector3, spread:number ) {

		const scene = this.parent! as Scene; 

		// guarantee shot 
		this.dummy.position.copy(origin);
		this.dummy.lookAt(end);  


		for(let i = 0; i < total; i++) {

			let spreadRadius = spreadV.set( Math.random() - .5, Math.random() - .5, Math.random() - .5 ).normalize().multiplyScalar(spread);

 
			let aimPos = v.copy(end);
			
			if( i>0 )
			{
				aimPos.add(spreadRadius);
			}

			// this.dummy.position.copy(aimPos);
			// this.dummy.lookAt(origin);
			// this.dummy.updateMatrix();
			// this.setMatrixAt(i, this.dummy.matrix);
			// this.instanceMatrix.needsUpdate = true;

			const solver = findRaycastSolver(this);
			 
			const rayDir = aimPos.sub(origin).normalize();
			const hit = solver?.shootRay(origin, rayDir);


			if( i==0 )
			{
				$streamEvent({
					type:"assistedPlayerShot", 
					shotWorld: this.dummy,
					thickness: .2, 
				});
			}
			

			if( hit ) {
				 
				const position = hit.point; 
				const normal = hit.normal; 


				if( hit.object.userData.onRayHit )
				{
					hit.object.userData.onRayHit(origin, rayDir, hit.distance);
					continue;
				}

 
				this.addBulletHoleAt(position, normal);

			}	
			
		}

		$events.dispatchEvent({type:"spawnSmoke", position:origin });
		

	}

	private addBulletHoleAt( position:Vector3, normal:Vector3 ) {

		const instanceIndex = this.cursor;
		this.cursor = (this.cursor + 1) % MAX;
			
		this.dummy.position.copy(position) ; 
		this.dummy.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), normal);
		this.dummy.translateZ(0.001+0.00001*instanceIndex)
		this.dummy.updateMatrix();

		this.setMatrixAt(instanceIndex, this.dummy.matrix);
		this.instanceMatrix.needsUpdate = true;
	}
}