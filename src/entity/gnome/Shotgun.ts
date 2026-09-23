import { AxesHelper, DoubleSide, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, NearestFilter, Object3D, SRGBColorSpace, Texture, Vector3 } from "three";
import { updatables, type IUpdatable } from "../../IUpdatable";
import { MeshBasicNodeMaterial, UniformNode } from "three/webgpu";
import { float, positionLocal, texture, time, uniform, vec3 } from "three/tsl";
import SoundAtlas from "../../sounds/atlas";
import { ShotgunBlast } from "./ShotgunBlast";
import { findScene } from "../../utils/find-scene";
import { findLevel } from "../../level/findLevel";
import { playSound } from "../../sounds/play-sound";


export class Shotgun implements IUpdatable{
	private muzzle:Object3D;
	private gun:Object3D;
	private life = 0;
	private startTime = uniform(0);	
	private duration = 0.15;
	private blastManager:ShotgunBlast|undefined;

	private shotHoleTextureQuad:Mesh;

	constructor( muzzle:Object3D, gun:Object3D ) {
		this.muzzle = muzzle;
		muzzle.visible = false;
		this.gun = gun; 

		const muzzleMesh = (muzzle as Mesh);
		const flash = (muzzleMesh.material as MeshPhysicalMaterial).map as Texture;

		flash.colorSpace = SRGBColorSpace;
		flash.magFilter = NearestFilter;
		flash.minFilter = NearestFilter;

		const progress = time.sub(this.startTime).mod(this.duration).div(this.duration);

		muzzleMesh.material = new MeshBasicNodeMaterial({
			colorNode: texture(flash).mul(8),
			opacityNode: texture(flash),
			transparent: true, 
			side:DoubleSide,
			positionNode: positionLocal.mul(  progress.mul( time.mul(299).sin() )  )
		})

		muzzleMesh.castShadow = false;
		muzzleMesh.receiveShadow = false;

		const hole = gun.getObjectByName("hole") as Mesh;
		hole.removeFromParent();
		this.shotHoleTextureQuad = hole;
		
	}

	fire() { 
		//this.muzzle.parent!.parent!.parent!.attach(fx)
		if( !this.blastManager )
		{
			this.blastManager = new ShotgunBlast( this.shotHoleTextureQuad );
			findLevel(this.gun)!.add(this.blastManager);
		}

		this.startTime.value = performance.now()/1000;
		this.muzzle.visible = true;
		this.life = this.duration;
		updatables.add(this); 

		playSound("shotgun1" , 1); 

		this.blastManager.fireBlast(12, this.muzzle.getWorldPosition(new Vector3()), this.muzzle.localToWorld(new Vector3(0,1,0)), .2);
	}

	update(delta: number):false|void {
		this.life -= delta;
		if(this.life<=0) {
			this.muzzle.visible = false;
			
			return false;
		}
	}
 
}