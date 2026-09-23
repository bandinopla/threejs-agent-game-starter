import { Box3, Mesh, MeshStandardMaterial, Object3D } from "three";
import { $events } from "../events/events";
import { MeshBasicNodeMaterial } from "three/webgpu";
import { color, mix, texture, vec4 } from "three/tsl";
import { updatables, type IUpdatable } from "../IUpdatable";
import type { MonkeyWorker } from "../entity/monkey/MonkeyWorker";
import { isMobile } from "../utils/isMobile";

export class ApesCounter extends Object3D implements IUpdatable{

	private width:number;

	private ape2icon:Map<MonkeyWorker, ApeIcon> = new Map();

	private removeUpdater:VoidFunction|undefined; 

	constructor( private tmpl:Object3D ){
		super(); 
		tmpl.removeFromParent();
 

		const box3 = new Box3();
		box3.setFromObject(tmpl);
		this.width = box3.max.x - box3.min.x;

		// $events.addEventListener("monkeyShot", (event) => { 
		// 	this.ape2icon.get(event.monkey)!.kill();
		// });

		$events.addEventListener("reset", this.reset.bind(this));

		$events.addEventListener("startGame", () => {
			this.visible = true;
			this.removeUpdater = updatables.add(this);
		});

		$events.addEventListener("playerDied", ()=>{
			this.visible = false;
		})

		

		this.reset();
	}

	reset() {
		this.ape2icon.forEach( (icon) => icon.reset());
		this.visible = false;
		this.removeUpdater?.();
		this.removeUpdater = undefined;
	}

	/** 
	 * @param monkey The "worker" ape slot manager. Since monkeys can be reused, there's a special object to keep the status of a unique worker while the monkey skin is being used elswere.
	 */
	addApe( monkey:MonkeyWorker ) {
		const index = this.children.length;
		const icon = new ApeIcon(this.tmpl , index, monkey.workerType);
		this.add(icon);
		this.ape2icon.set(monkey, icon);

		let w = this.width *.9 ;

		if( isMobile() )
		{
			w *= 2; 
		}

		const newWidth = (this.children.length - 1)* w ;

		this.children.forEach( (c,i) => {
			c.position.x = -newWidth/2 + i * w;
		});

		//console.log("WORKER ADDED")

		//
		// when the monkey is killed...
		//
		monkey.addEventListener("isDead", ()=>{
			this.ape2icon.get(monkey)!.kill();
		});
	}

	update(delta:number) {
		if(!this.visible) return;
		this.ape2icon.forEach( (icon) => {
			icon.update(delta);
		})
	}
}

let deadApeIconMaterial:MeshBasicNodeMaterial|undefined;

class ApeIcon extends Object3D {
	private aliveIcon:Mesh;
	private deadIcon:Mesh;

	//private deadTween:Tween<Vector3>;
	//private idleTween:Tween<Vector3>;
	//private defaultScale:number;

	constructor( tmpl:Object3D, _index:number, type:string ) {
		super(); 
		this.add(tmpl.clone(true)); 


		const workerAliveIcon = this.getObjectByName("worker-alive") as Mesh;
		const workerDeadIcon = this.getObjectByName("worker-dead") as Mesh;

		const porteroAliveIcon = this.getObjectByName("portero-alive") as Mesh;
		const porteroDeadIcon = this.getObjectByName("portero-dead") as Mesh;

		workerAliveIcon.visible = false;
		workerDeadIcon.visible = false;
		porteroAliveIcon.visible = false;
		porteroDeadIcon.visible = false;


		this.aliveIcon = type=="portero" ? porteroAliveIcon : workerAliveIcon;
		this.deadIcon = type=="portero" ? porteroDeadIcon : workerDeadIcon; 

		//this.defaultScale = tmpl.scale.x;

		// dead
		const deadMaterial = (this.deadIcon.material as MeshStandardMaterial) ; 

		if( !deadApeIconMaterial )
		{
			const deadTexture = texture(deadMaterial.map!);
			deadApeIconMaterial = new MeshBasicNodeMaterial({
				colorNode: deadTexture.mul( vec4(mix( color("white") , color("red"), deadTexture.a  ),1) ), //; 
				transparent:true,
				alphaTest:0.1 
			});
			
		}

		this.deadIcon.material = deadApeIconMaterial;
		
		//////deadMaterial.colorNode = deadMaterial.colorNode!.mul( mix( color("white") , color("red"), deadMaterial.colorNode.a  ) ) //; ;

		//const smallScale = this.defaultScale*.85;

		// //tween
		// this.idleTween = new Tween(this.scale) 
		// 	.to({x:smallScale, y:smallScale, z:smallScale}, 1500).delay(10 + this.index * 100).repeat(Infinity).yoyo(true).start();

		// this.deadTween = new Tween(this.children[0].scale) 
		// 	.to({x:smallScale, y:smallScale, z:smallScale}, 500)
		// 	.easing(Easing.Elastic.Out);

		if( isMobile() )
		{
			this.children[0].scale.setScalar(.23);
		}

		this.reset();
	}

	update(_delta:number) {

		// if( this.idleTween.isPlaying() ) this.idleTween.update( );
		// if( this.deadTween.isPlaying() ) this.deadTween.update( );
	}

	reset() {

		console.log("RESTE******")
		this.aliveIcon.visible = true;
		this.deadIcon.visible = false;

		// this.children[0].scale.setScalar(1);
		// this.idleTween.stop().start();
		// this.deadTween.stop();
	}

	kill() { 
		this.aliveIcon.visible = false;
		this.deadIcon.visible = true;

		// this.children[0].scale.setScalar(1.3)
		// this.idleTween.stop();
		// this.deadTween.start();
	}
}