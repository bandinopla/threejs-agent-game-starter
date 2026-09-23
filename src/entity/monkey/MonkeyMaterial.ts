import { color, frontFacing, mix, texture, uniform, vec3 } from "three/tsl";
import { DoubleSide, LinearFilter, Mesh, MeshPhysicalMaterial, MeshPhysicalNodeMaterial, Object3D, SkinnedMesh, SRGBColorSpace, UniformNode } from "three/webgpu";
import { createBurnMask } from "../../fx/burnt";
import { Tween } from "three/examples/jsm/libs/tween.module.js";
import { updatables } from "../../IUpdatable";
import { getAtlasTextureOverlay } from "../../utils/getSpriteTextureNode";

export class MonkeyMaterial extends MeshPhysicalNodeMaterial {

	readonly isDeadUniform: UniformNode<"float",number>;
	readonly burntProgress: UniformNode<"float",number>;

	constructor( monkeyScene:Object3D, isWorker:boolean ){

		const mesh = monkeyScene.getObjectByName("ape") as SkinnedMesh;
		const colorTexture = (mesh.material as MeshPhysicalMaterial).map!;

		colorTexture.magFilter = LinearFilter;
		colorTexture.minFilter = LinearFilter;
		colorTexture.colorSpace = SRGBColorSpace;

		const monkeyQuad = monkeyScene.getObjectByName("Plane008") as Mesh;
		const monkeyBloodQuad = monkeyScene.getObjectByName("monkey-blood") as Mesh;
		const monkeyTatoosQuad = monkeyScene.getObjectByName("monkey-tatoos") as Mesh;
 
		const bloodyTextureNode = getAtlasTextureOverlay(monkeyQuad, monkeyBloodQuad);
		const tatoosTextureNode = getAtlasTextureOverlay(monkeyQuad, monkeyTatoosQuad);
		const isDeadUniform = uniform(0);
		const isWorkerUniform = uniform(isWorker?1:0);	

		const bloodTexture = mix( vec3(1,1,1), bloodyTextureNode, isDeadUniform );
		const tatoos = mix( tatoosTextureNode, color("#ffffff"), isWorkerUniform );

		const burnt = createBurnMask(); 
		

		super({
			colorNode: mix(  color("#000000"), texture( colorTexture ).mul( tatoos ).mul( bloodTexture ), frontFacing.toFloat() ),
			roughnessNode: mix( vec3(1,1,1), bloodyTextureNode, isDeadUniform ),
			alphaTest:0.5,
			transparent:true,
			opacityNode: mix( vec3(1,1,1), burnt.mask , isDeadUniform ),
			side:DoubleSide
		})

		this.burntProgress = burnt.progressUniform;
		this.isDeadUniform = isDeadUniform;
	}

	bleed() {
		this.isDeadUniform.value = 1;
	}

	triggerDead( onComplete?:VoidFunction ) {
		this.isDeadUniform.value = 1;
		this.burntProgress.value = 0;

		const tween = new Tween(this.burntProgress)
			.to({value:1}, 5000)
			.onComplete(()=>{
				removeTween()
				onComplete?.();
			})
			.start();

		const removeTween = updatables.add({
			update:(delta:number)=>{ 
				tween.update(); 
			}
		});
	}

	reset() {
		this.isDeadUniform.value = 0;
	}
}	