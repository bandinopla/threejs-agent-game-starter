import { DRACOLoader, GLTFLoader, KTX2Loader, type GLTF } from "three/examples/jsm/Addons.js";
import type { AppBuilder } from "./type";
import { AmbientLight, Color, FogExp2, FrontSide, LoadingManager, Mesh, MeshStandardMaterial, NearestFilter, Object3D, PerspectiveCamera, Quaternion, ReinhardToneMapping, Scene, SpotLight, Texture, Vector3 } from "three";
import { Joystick } from "./input/Joystick";
import { createGameButtons, type GameButtons,  } from "./input/Buttons";
import { KeyboardJoystickController } from "./input/KeyboardJoystickController";
import { PhysicsScene } from "./physics/PhysicsScene";
import { Level } from "./level/Level";
import { MobileControls } from "./input/MobileControls";
import { setupPostProcessing } from "./postprocessing/setupPostProcessing";
import { LightsManager } from "./level/LightsManager";
import { isMobile } from "./utils/isMobile";
import { Door } from "./level/Door";
import { updatables } from "./IUpdatable";
import { WebGPURenderer } from "three/webgpu";
import { OrbitCamera } from "./camera/OrbitCamera";
import { Gnome } from "./entity/gnome/Gnome";
import { preRecordedPath } from "./ai/PreRecordedPath";
import { buildPathGraph } from "./ai/PathFinding";  
import { UIScene } from "./ui/uiScene";
import { $audioListener } from "./sounds/envAudio";
import { Dust } from "./fx/Dust";
import { BloodSplash } from "./fx/BloodSplash";
import { CameraBrain } from "./camera/CameraBrain";
import type { IntroState } from "./entity/gnome/state/IntroState";
import { $events } from "./events/events";
import { MainMenuScene } from "./ui/mainMenuScene";
import { MobileUIFixer } from "./ui/MobileUIFixer";
import { appendTelonPass } from "./fx/Telon";
import { AdminOfficeScene } from "./level/AdminOfficeScene";
import { lightManager } from "./level/LightManager";
import { Smoke } from "./fx/Smoke";
import { MonkeysManager } from "./entity/monkey/MonkeysManager";
import SoundAtlas from "./sounds/atlas";
import { ElevatorHandler } from "./level/ElevatorHandler";
import { FairyDustManager } from "./fx/FairyDustManager";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { spinner } from "./ui/Spinner";
import { LangSelectionScreen } from "./ui/LangSelectionScreen";
import { setLang } from "./i18n/i18n";
import { DisclaimerScreen } from "./ui/DisclaimerScreen";
import { playSound } from "./sounds/play-sound";
import { TextMesh } from "./ui/TextMesh";
import RAPIER from "@dimforge/rapier3d";
import { Tracker } from "./tracker";

const stats = new Stats();  
//document.body.appendChild(stats.dom);

let weAreOnMobile = isMobile(); 


export const GnomeVsMonkeysApp : AppBuilder = async (renderer, scene, camera) => {

	scene.background = new Color(0);;
	renderer.autoClear = false; 

	const loadManager = new LoadingManager();

	const ldr = new GLTFLoader(loadManager);

	//add draco from cdn
	ldr.setDRACOLoader(new DRACOLoader().setDecoderPath("https://www.gstatic.com/draco/v1/decoders/"));
	//ldr.setKTX2Loader(new KTX2Loader().setTranscoderPath("https://cdn.jsdelivr.net/npm/three@0.181.2/examples/jsm/libs/basis/").detectSupport(renderer));

	const ktx2Loader = new KTX2Loader()
    .setTranscoderPath("https://cdn.jsdelivr.net/npm/three@0.181.2/examples/jsm/libs/basis/");

	ktx2Loader.detectSupport(renderer);
	ldr.setKTX2Loader(ktx2Loader);

	await Tracker.init();

	Tracker.loadingStarted();

	
	const [ levelScene, gnomeScene, monkeyScene, uiSceneAssets, ratScene] = await Promise.all([
 
		ldr.loadAsync("level.packed.glb"),   
		ldr.loadAsync("gnome.packed.glb"), 
		ldr.loadAsync("monkey.packed.glb"), 
		ldr.loadAsync("ui.packed.glb"),
		ldr.loadAsync("rat.packed.glb"),
		SoundAtlas.preload(),

		//@ts-ignore
		RAPIER.init(),
		 
	])  ;

	console.log("ALL LAODED")

	Tracker.loadingFinished();

	// new OrbitControls(camera, renderer.domElement);
	// scene.add(new AmbientLight(0xffffff, 1))
	// scene.add( monkeyScene.scene)
	// scene.add(camera) 
	// scene.fog = null 
	// return (delta )=>{

	// }

	TextMesh.initialize(((uiSceneAssets.scene.getObjectByName("font-atlas")! as Mesh).material as MeshStandardMaterial).map as Texture, true)


	const input = new Joystick(createGameButtons());
	const uiInput = new Joystick(createGameButtons()); 

	if( weAreOnMobile ) {
		/* mobile controls */ new MobileControls(input, renderer.domElement);
		/* mobile controls */ new MobileControls(uiInput, renderer.domElement, false);
 

	} else { 
		/* hoop keyboard input */ new KeyboardJoystickController(input, renderer.domElement);
		/* hoop keyboard input */ new KeyboardJoystickController(uiInput, renderer.domElement);
	}

	
	//camera.position.set(0,0,2)

	const uiScene = new UIScene(renderer, uiSceneAssets.scene, uiInput)
	updatables.add(uiScene);

	uiScene.add( TextMesh.atlas );

	const langSelectionScreen = new LangSelectionScreen(uiInput, uiSceneAssets, uiScene.camera);
	uiScene.add(langSelectionScreen);

	uiScene.background = new Color(0);

	let gameLoop:((delta:number)=>true|void)|undefined;

	langSelectionScreen.onLangSelected = async (lang)=>{
		setLang(lang);
		uiScene.background = null;
		uiScene.initializeWindows();
 
		requestAnimationFrame(async ()=>{

			// initialize the game then...
			GnomeVsMonkeysGame(renderer, scene, camera, [levelScene, gnomeScene, monkeyScene, uiSceneAssets, ratScene], uiInput, input, uiScene)
			
			// switch the game loop
			.then( (loop)=> { gameLoop = loop; } );   

		}); 
	
	}

	// requestAnimationFrame(()=>{
	// 	scene.add( levelScene.scene )  
	// 	scene.add(new AmbientLight(0xffffff, 1))
	// 	gameLoop = delta => {
	// 		renderer.render(scene, camera);
	// 	}
	// })
 

	return ( delta )=> {

		renderer.clear(); // clear once

		uiInput.update(delta); 
		updatables.update(delta);

		if( gameLoop ) 
		{
			return gameLoop(delta);
		}
 
		renderer.render(uiScene, uiScene.camera);
		return true;
	}
}

const GnomeVsMonkeysGame = async (renderer:WebGPURenderer, scene:Scene, camera:PerspectiveCamera, assets:GLTF[],uiInput:Joystick<GameButtons>, input:Joystick<GameButtons>, uiScene:UIScene) => {


	// const postfx2 = setupPostProcessing(renderer, scene, camera, uiScene, uiScene.camera);
	// scene.add( assets[0].scene )
	// scene.add(new AmbientLight(0xffffff, 1))
	// appendTelonPass(postfx2.renderPipeline);
	// return delta => {
	// 	postfx2.render();
	// } 

	//renderer.setPixelRatio(0.85)

	// 	const tex = await new EXRLoader().loadAsync("vat_positions.exr");
	// tex.magFilter = NearestFilter;
	// tex.minFilter = NearestFilter;
	// 	const plane = new Mesh(new PlaneGeometry(1,1), new MeshBasicMaterial({map:tex}));
	// 	gameRoot.add(plane);
	 

	// 	new OrbitControls(camera, renderer.domElement);

	// 	return delta => {

	// 	}

	camera.fov = 83;
	camera.add( $audioListener );
	camera.far = 22;

	
	
   
	const gameRoot = new Object3D();
	scene.add(gameRoot);

	//
	
	$events.addEventListener("startIntroWhenReady", (ev)=>{
		scene.add(gameRoot);
		camera.position.set(0,4000,0)
		renderer.compile(scene, camera).then(()=>{

			ev.onReady(true); 

			// DEVELOPMENT START-FLOW SWITCH:
			// Enable exactly one type. See docs/development-start-flow.md.
			// Keep startPreIntro enabled for the complete release flow.
			$events.dispatchEvent({
				type:"startPreIntro"
				//type:"startIntro"
				//type:"startGame"
				//type:"introDone"
			});
 
		});
	});
 

	$events.addEventListener("startPreIntro", (ev)=>{
		cameraBrain.follow = adminOfficeScene.camera; 

		//
		// add the skip intro window in the ui layer
		//
		$events.dispatchEvent({
			type:"requestWindow",
			name:"skipIntro",
			newHost:uiScene.root,
			camera:uiScene.camera,
			getRef:(w)=>{
				
				w.onButtonPress("skipIntro", ()=>adminOfficeScene.skipIntro());

				adminOfficeScene.onSkipIntro = ()=>w.close();

			}
		});

	});  

	$events.addEventListener("firstKill", (ev)=>{

		//console.log("FIRST KILL!!!!!")
		updatables.timeout(2,()=>{
				$events.dispatchEvent({
				type:"requestWindow",
				name:"firstKillWindow",
				newHost:uiScene.root,
				camera:uiScene.camera,
				getRef:(w)=>{

					playSound("chichinnnn")
					
					w.onButtonPress("btnOk", ()=>{

						w.close()
						$events.dispatchEvent({type:"startSpawningEnemies"});
					}); 

				}
			});
		});

		Tracker.firstKill();
	});

	$events.addEventListener("requestCursor", (ev)=>{
		input.block();
	});

	$events.addEventListener("releaseCursor", (ev)=>{
		input.unblock();
	});

	$events.addEventListener("playerKilledCameraAnimEnded", (ev)=>{
		$events.dispatchEvent({
			type:"requestWindow",
			name:"gameLostWindow",
			newHost:uiScene.root,
			camera:uiScene.camera,
			getRef:(w)=>{
				
				w.onButtonPress("btnOk", ()=>{
						w.close();
						$events.dispatchEvent({
							type:"fadeToBlackThen",
							callback: ()=>{
								$events.dispatchEvent({type:"reset"}); 
							}
						})
					}); 

				

			}
		})
	});

	const triggerPlayerWonWindow = ()=>{
		updatables.timeout(2,()=>{

			playSound("win");

			$events.dispatchEvent({
				type:"requestWindow",
				name:"gameWonWindow",
				newHost:uiScene.root,
				camera:uiScene.camera,
				getRef:(w)=>{
					
					
					w.onButtonPress("btnBackToMenu", ()=>{
						w.close();
						$events.dispatchEvent({
							type:"fadeToBlackThen",
							callback: ()=>{
								$events.dispatchEvent({type:"reset"}); 
							}
						})
					});

					w.onButtonPress("btnContinue", ()=>{
						w.close(); 
					});

				}
			});
		});

		Tracker.playerWon(); 
	}

	$events.addEventListener("allMonkeysAreDead", triggerPlayerWonWindow );

	$events.addEventListener("gnomeIsHome", ()=>{
		input.block();

		$events.dispatchEvent({
			type:"fadeToBlackThen",
			callback: ()=>{
				$events.dispatchEvent({type:"reset"}); 
			}
		});

		Tracker.playerGotHome();
		Tracker.gameStopped();

	});

	$events.addEventListener("startIntro", () => {
		uiScene.add(TextMesh.atlas)	
		Tracker.gameStarted();
	});

	$events.addEventListener("playerDied",()=>{
		Tracker.playerDied();
		Tracker.gameStopped();
	})

	// $events.addEventListener("introDone", () => {
	// 	requestAnimationFrame(()=>{
	// 		renderer.compile(uiScene, uiScene.camera);
	// 	})
	// })

	// window.addEventListener("keydown", (ev)=>{ 
	// 	if( ev.key == "r" ){
	// 		// $events.dispatchEvent({
	// 		// 	type:"reset"
	// 		// });
	// 		$events.dispatchEvent({
	// 			type:"allMonkeysAreDead"
	// 		});
	// 	}
	// });

	//-------------------------------------------------------------------------------------

	gameRoot.add(camera)

	
	scene.fog = new FogExp2(0, 0.15);
	scene.add(new AmbientLight(0xffffff, 0.4))
	renderer.toneMapping = ReinhardToneMapping;
	renderer.toneMappingExposure = 1.5 ; 
	
	//return ()=>{};
 
	//flashlightTexture

	const [ levelScene, gnomeScene, monkeyScene, uiSceneAssets, ratScene] = assets ;
 

	// repositions elements for mobile screen size
	new MobileUIFixer( uiSceneAssets.scene, uiSceneAssets.animations); 

	// new OrbitControls(camera, renderer.domElement);
	// scene.add(new AmbientLight(0xffffff, 1))
	// scene.add( uiSceneAssets.scene.getObjectByName("cover") )
	// scene.add(camera)
	// scene.add(new AxesHelper(10))
	// scene.fog = null 
	// return (delta )=>{

	// }




	const level = new Level(levelScene.scene, true );  


	const worldScene = new PhysicsScene();

    
	 
	const mainMenuScene = new MainMenuScene(uiSceneAssets.scene, uiInput)
	updatables.add(mainMenuScene); 

	// SCENE-LEVEL EFFECT SERVICES
	// Create reusable/pool-backed effect managers here, attach them to gameRoot
	// (or level when they need level-local raycasts), and register CPU-driven
	// managers with updatables. Trigger them through typed $events, explicit
	// emitter registration, or entity events wired below. See
	// docs/effects-and-audio.md before adding a new effect system.

	const sparkQuad = (gnomeScene.scene.getObjectByName("spark")! as Mesh); 
 
 
	const fairyDustManager = new FairyDustManager(sparkQuad);
	gameRoot.add(fairyDustManager);
	
	const smoke = new Smoke(gnomeScene.scene.getObjectByName("smoke")! as Mesh); 
	gameRoot.add(smoke);

	const dust = new Dust();
	updatables.add(dust);
	gameRoot.add(dust);

	const bloodSplash = new BloodSplash( monkeyScene.scene.getObjectByName("Plane001")! as Mesh );
	updatables.add(bloodSplash); 

	const orbitCam = new OrbitCamera({ height:1, distance:3, collidersLayer:2, headBob:true }, input, worldScene);
	const cameraBrain = new CameraBrain(camera, levelScene.animations.filter(c=>c.name.startsWith("camera-")), orbitCam);
	updatables.add(cameraBrain); 

	const adminOfficeScene = new AdminOfficeScene(ratScene, input);
	gameRoot.add(adminOfficeScene);


	const doors : Door[] = [];
	const lightsManager = new LightsManager(3, camera, 300);

	gameRoot.add(lightsManager); 
	level.add(bloodSplash);


	gnomeScene.scene.traverse((obj) => {
		if(obj instanceof Mesh) { 

			if( !weAreOnMobile ) {
				obj.castShadow = true;
				obj.receiveShadow = true;
			} 

			if( obj.material.map ) {
				obj.material.side = FrontSide
				obj.material.map.magFilter = NearestFilter;
				obj.material.map.minFilter = NearestFilter;
				obj.material.generateMipmaps = false;
			}
		}
	})

	monkeyScene.scene.traverse((obj) => {
		if(obj instanceof Mesh) {
			if( !weAreOnMobile ) {
				obj.castShadow = true;
				obj.receiveShadow = true;
			} 
		}
	})


	const path = preRecordedPath.map( pos=>new Vector3(pos[0],pos[1],pos[2]) );
	const pathFinder = buildPathGraph(path, .1);

	//pathFinder.addDebugToScene(scene); 



	level.onLevelIntantianted = ()=>{  
		let workersSpawns:Object3D[] = [];
		let chasersSpawns:Object3D[] = [];

		level.traverse((child) => {
 

		    if (child.userData.collider) {
		        worldScene.addCollider( child ); 
		    }
			else if( child.userData?.spawn=="player") {
				gnome.position.copy(child.position);
				gnome.position.y+=.1;
				gnome.updatePosition = true;
				gnome.rememberStartPosition(child); 
			}
			else if( child.userData?.spawn=="skeleton") {
				workersSpawns.push(child);
			}
			else if( child.userData?.spawn=="portero") {
				workersSpawns.push(child);
			}
			else if( child.userData?.spawn=="enemy") {
				chasersSpawns.push(child);
			}

			if( child.userData.pointLight ){
				lightsManager.addLight(child);
			}
			else if( child.userData.door ){
				child.userData.door = new Door(child);
				doors.push(child.userData.door);
			}
			else if( child.userData.doorCollider )
			{
				const col = worldScene.addCollider( child );
				child.userData.interactable = child.parent!.userData.door;

				const wPos = new Vector3();
				const wRot = new Quaternion();
				child.userData.syncInstance = ()=>{
					child.getWorldPosition(wPos);
					child.getWorldQuaternion(wRot);
					col.setTranslation(wPos);
					col.setRotation(wRot);
				}
			}
			else if( child.userData.sensor )
			{
				const col = worldScene.addSensor( child );
			}
			else if( child.userData.elevator )
			{
				new ElevatorHandler(child)
			}
		});

		level.signsReader.uiScene = uiScene;
		level.signsReader.reader = gnome;

		const monkeysManager = new MonkeysManager(camera, level, worldScene, gnome, monkeyScene, pathFinder, chasersSpawns, workersSpawns);

		level.add(monkeysManager); 

		//
		// ui only counts workers
		//
		monkeysManager.workerMonkeys.forEach( worker => { 
			uiScene.apesCounter.addApe(worker);  
		});

		//
		// bloof on get shot...
		//
		[...monkeysManager.chasers, ...monkeysManager.workers].forEach( monkey => {
			monkey.events.addEventListener("gotShot", e => {   
 
				bloodSplash.emitFrom( monkey.torso, { duration:4, ratio:.3, frecuency: .2 }, monkey );

			})
		})

		// skeletonSpawns.forEach( spawn => {
 
		// 	const rig = new Monkey( monkeyScene.scene , monkeyScene.animations, pathFinder);
 
		// 	rig.target = gnome ;
		// 	rig.setSpawn(spawn)
			
		// 	level.add(rig);
		// 	updatables.add(rig);
 
		// 	rig.physicsScene = worldScene;
		// 	uiScene.apesCounter.addApe(rig);

		// 	//
		// 	// when the monkey is shot...
		// 	//
		// 	rig.events.addEventListener("gotShot", e => { 
		// 		bloodSplash.emitFrom( rig.torso, { duration:4, ratio:.3, frecuency: .2 });
		// 	});
		 
		// });

		// Create one shadow-casting spotlight for the whole game. It normally follows
		// the gameplay camera, but cutscenes can temporarily borrow it through
		// lightManager.borrow() instead of allocating another shadow map.
		const l = new SpotLight(0xffffff, 63,121, 1, 1, .6);
	 
		l.castShadow = true;
		l.shadow.mapSize.width = weAreOnMobile ? 512 : 1024;
		l.shadow.mapSize.height = weAreOnMobile ? 512 : 1024;
		l.shadow.camera.near =0.01;
		l.shadow.camera.far = 24; 
		l.shadow.bias = -0.0001; 
		l.shadow.camera.updateProjectionMatrix();
		l.map = ((levelScene.scene.getObjectByName("flashlight")! as Mesh).material as MeshStandardMaterial).map;  

		camera.position.copy( gnome.position);
		camera.quaternion.copy( gnome.quaternion);
		camera.translateZ(-1)
		camera.position.y += 1;
		camera.lookAt(gnome.position)

		l.position.copy(camera.position)
		
		l.quaternion.copy(camera.quaternion)
		l.target.position.copy( gnome.position )
		
		gameRoot.add(l);  
		gameRoot.add(l.target);

		camera.attach(l)
		camera.attach(l.target)
		l.position.z =  .1;
		l.position.x =  .1; 

		// Capture this camera-relative transform as the light's permanent home.
		lightManager.setLight(l)

		//----------------------------------------------
		gameRoot.removeFromParent();
	}

	gameRoot.add(level);   

	const gnome = new Gnome( gnomeScene.scene.getObjectByName("rig")!, input, camera, {
		clips: {
			idle:gnomeScene.animations.find(c=>c.name=="idle")!,
			run:gnomeScene.animations.find(c=>c.name=="run")!,
			jump:gnomeScene.animations.find(c=>c.name=="jump")!,
			shoot:gnomeScene.animations.find(c=>c.name=="shoot")!,
			die:gnomeScene.animations.find(c=>c.name=="die")!
		}
	} ); 

	gnome.events.addEventListener("gotShot", ev=> {
		 
		bloodSplash.emitFrom( gnome.headBone, { duration:.3, ratio:.3, frecuency: .1 }, gnome);
		 
	});

	//setup the initial intro state...
	(gnome.states.getState("intro") as IntroState).setup( levelScene.scene.getObjectByName("startPosition")!.position, levelScene.animations.find(c=>c.name=="camera-intro")! )
	
	worldScene.add(gnome);
 
	updatables.add(gnome);
	dust.addEmiter( gnome , { 
		duration:.3,
		minStepDistance:.15,
		spawnRadius:.15,
		startScale:2
	});

	
	orbitCam.target = gnome;
	updatables.add(orbitCam);
	gameRoot.add(orbitCam)
	level.add(gnome)

	// the main input system used by the game 
 

	//const player = new ThirdViewPlayer(gnomeScene.scene, input); 
	 
	 
	//orbitCam.vcamera.add(l);  
	//orbitCam.add(l.target);   
 

	
 
	//const posRecorder = new PositionRecorder(gnome, .2);  
	

	const postfx = setupPostProcessing(renderer, scene, camera, uiScene, uiScene.camera);

	mainMenuScene.appendToPipeline(postfx.renderPipeline);
 
	appendTelonPass(postfx.renderPipeline);

	//--------------------------------------------------------------
	requestAnimationFrame(()=>{
		$events.dispatchEvent({
			type:"fadeToBlackThen",
			fromBlack:true,
			callback:()=>{
 

				const disclaimer = new DisclaimerScreen();
				uiScene.add(disclaimer);

				//
				// show the disclaimer for a few seconds....
				//
				setTimeout(()=>{
					

					$events.dispatchEvent({
						type:"fadeToBlackThen", 
						callback:()=>{
							disclaimer.removeFromParent();
							uiScene.add( spinner );
							spinner.scale.setScalar(.2)


								//
								// sow the spinner for a few seconds...
								//
								setTimeout(()=>{
 
									//
									// compile the shaders then...
									//
									$events.dispatchEvent({
										type:"startIntroWhenReady",
										onReady:()=>{ 
											
											//
											// start the intro...
											//
											$events.dispatchEvent({
												type:"fadeToBlackThen",
												fromBlack:true,
												callback:()=>{
													spinner.removeFromParent();
												}
											});
										 
										}
									});

								},400)
						 
						}
					});
				}, 3000);

				// 
			}
		})
	})
 
 
	//----------- 
	  
	return (delta:number):true|void => { 

		
 
		//updatables.update(delta);  
		 
		//lightsManager.update();
		worldScene.update(delta);//  , scene);   
		//posRecorder.update?.()

		// did this here because i want control over where the camera is placed. 
	  
		/////camera.position.copy(orbitCam.safePosition);
		/////orbitCam.vcamera.getWorldQuaternion(camera.quaternion)  
		
		//input.update(delta);  
		//uiInput.update(delta);
		 
			postfx.render();  
 

		stats.update();

		return true;
	}
} 
