import { OrthographicCamera, Object3D, Scene, Mesh, Vector3, MeshStandardMaterial, AxesHelper,  } from "three";
import { checker, color, float, mix, mx_noise_float, pass, positionLocal, rotate, screenUV, texture, time, uniform, uv, vec2, vec3, vec4 } from "three/tsl";
import { type RenderPipeline, type Node, MeshBasicNodeMaterial } from "three/webgpu";
import { updatables, type IUpdatable } from "../IUpdatable"; 
import type { Joystick } from "../input/Joystick";
import type { GameButtons,  } from "../input/Buttons";
import { Button } from "./Button";
import { $events } from "../events/events";
import { RetroWindow } from "./RetroWindow";
import { $lang } from "../i18n/i18n";
import { Easing, Tween } from "three/examples/jsm/libs/tween.module.js";
import { TextMesh } from "./TextMesh";
import { showCredits } from "./credits"; 
import { playSound } from "../sounds/play-sound";
import { isMobile } from "../utils/isMobile";

export class MainMenuScene extends Scene implements IUpdatable{
	readonly camera:OrthographicCamera;
	private visibilityValue = uniform(1, "float"); 
	private root:Object3D;
	private buttons:Button[] = [];
	private window:RetroWindow;
	private stopMainTheme:VoidFunction|undefined;
	
	constructor( assets:Object3D, _input:Joystick<GameButtons> ){
		super();

		this.background = null;

		this.camera = new OrthographicCamera(-1,1,1,-1,0.1,100);
		this.camera.position.set(0,0,1);
		this.add(this.camera); 
 

		this.root = new Object3D();
		this.add( this.root );

		 
		let currentSound:AudioBufferSourceNode|undefined;
		const loopTheme = async ()=>{
			if(!currentSound) return;
			currentSound = await playSound("theme-loop", 1, loopTheme)
		}
		const startGameTheme = async ()=>{
			currentSound = await playSound("theme-intro", 1, loopTheme) 
		}
		this.stopMainTheme = ()=>{
			currentSound?.stop();
			currentSound = undefined;
		}
		
		
		this.root.add( assets.getObjectByName("main-menu")! ); 
		this.traverse( child=>{
			if( child.userData.button )
			{
				(child.userData.button as Button).camera = this.camera;
			}
		})

		this.setupCover();
 

		const onResize = () => {
			const aspect = window.innerWidth / window.innerHeight
			this.camera.left = -aspect
			this.camera.right = aspect
			this.camera.top = 1
			this.camera.bottom = -1
			this.camera.updateProjectionMatrix()  
		}

		window.addEventListener('resize', onResize)

		onResize(); 

		//---------------------- setup buttons
		assets.traverse( child => {

			if( child.userData.button )
			{ 
				this.buttons.push( child.userData.button as Button); 
			}
			
		});

		//---
		const scamWindow = this.getObjectByName("scamWindow")!.userData.window as RetroWindow;
		this.window = this.getObjectByName("introWindow")!.userData.window as RetroWindow;

		this.window.setText("title", $lang("main-menu-win-title") )
		this.window.setText("btnStartLabel", $lang("btnStartLabel") )
		this.window.setText("btnLore", $lang("btnLore") )
		this.window.setText("btnCredits", $lang("btnCredits") )

		this.window.onButtonPress("start-game", ()=>this.startGame());
		this.window.onButtonPress("btnTheScam", ()=>{

			const origin = this.getObjectByName("thescam")!;

			this.window.releaseCursor();
			scamWindow.requestCursor( this.camera );

			updatables.tween(new Tween(this.camera.position).to({ y: origin.position.y }, 500).easing(Easing.Elastic.Out).start());

		});
		this.window.onButtonPress("btnCredits", ()=>{

			this.window.releaseCursor();
			showCredits( () => {
				this.window.requestCursor( this.camera );
			} )
		});

		//---
		
		const textMesh = new TextMesh($lang("theScamText"), 62, "#ffffff", true);	
		this.getObjectByName("theScamText")!.add(textMesh);

		scamWindow.onButtonPress("btnUnderstood", ()=>{
			scamWindow.releaseCursor();
			this.window.requestCursor( this.camera );
			updatables.tween(new Tween(this.camera.position).to({ y: 0 }, 500).easing(Easing.Elastic.Out).start());

		})
		
		

		// ---- RESET ----

		const reset = ()=>{
			this.add( this.root ); 
			this.add( TextMesh.atlas );
			this.window.requestCursor( this.camera );
			this.visibilityValue.value = 1; 
			startGameTheme();
			console.log("START MAIN MENU")
		}

		$events.addEventListener("reset", reset);

		//reset(); 

		this.root.removeFromParent();
		this.visibilityValue.value = 0; 

		$events.addEventListener("introDone", () => {
			reset();
		})
	}
 

	appendToPipeline( pipeline:RenderPipeline ) {
		let scenePass = pass( this, this.camera ).toVec4();


		let checkerScale = 15;
		let speedMul = float(0.1);
		let scrollStep = vec2( time.mul(float(.2).mul(speedMul)), time.mul(float(0.2).mul(speedMul)) )
		let loopingCheckerboard = checker( rotate(screenUV.add(scrollStep).mul(vec2(1, window.innerHeight / window.innerWidth)).mul(checkerScale), .2) )

	 

		let sceneOut = mix( mix( color("#242e63"), color("#222222"), loopingCheckerboard  ), scenePass.rgb, scenePass.a);

	 

		//
		pipeline.outputNode = mix( pipeline.outputNode as Node<"vec4">, sceneOut, this.visibilityValue ); 
		console.log("APPENDED MAIN MENU PIPELINE")
	 
	}

	private startGame() {  
 
		this.window.releaseCursor();  


		$events.dispatchEvent({
			type:"fadeToBlackThen",
			callback:()=>{
				this.stopMainTheme?.();
				this.root.removeFromParent();
				this.visibilityValue.value = 0; 

				$events.dispatchEvent({
					type:"startIntro", 
				})
			}
		})

	}

	update(_delta:number) { 
	}

	private setupCover() {
		const cover = this.getObjectByName("cover") as Mesh;
		 
		const coverMaterial = (cover.material as MeshStandardMaterial);
		const coverTexture = coverMaterial.map!;
 
		cover.userData.uGhostMult = new Vector3(0.1,0,4);

		const cover2 = this.getObjectByName("coverB") as Mesh; 
 
		cover2.userData.uGhostMult = new Vector3(.5,.5,.2);

		//-----------------
		const textureNode = texture(coverTexture); 
		const ghostMult = uniform(new Vector3())

		textureNode.onObjectUpdate( ({ object }) => {  
			ghostMult.value = object!.userData.uGhostMult;
		})
		
		const speed = float(20);
		const noise = mx_noise_float(uv().mul(2).add(time.mul(speed),0), 1) 
		//const mask = uv().y.mul(noise) // smoothstep(0 , 1, length(uv().sub(1))).oneMinus().mul(noise); 
 
		const noiseX = noise.mul(0.004)
		const noiseY = noise.mul(0.004)

		const coverNodeMaterial = new MeshBasicNodeMaterial();

		coverNodeMaterial.positionNode = positionLocal.add( vec3( noiseX, 0, noiseY) )

		const uvOffset = noise.mul(0.01);
		const ghost = textureNode.sample( uv().add(vec2(uvOffset,uvOffset))) 
		coverNodeMaterial.colorNode = textureNode.add( vec4(ghost.mul(ghostMult).rgb, 0))

		//---------------- 
 
		cover.material = coverNodeMaterial;
		cover2.material = coverNodeMaterial;
 
	}
}