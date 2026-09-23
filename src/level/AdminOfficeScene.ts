import { AnimationMixer, LoopOnce, Mesh, MeshBasicMaterial, Object3D, PerspectiveCamera, SkinnedMesh } from "three"; 
import type { GLTF } from "three/examples/jsm/Addons.js";
import { updatables, type IUpdatable } from "../IUpdatable";
import { $events } from "../events/events";
import { lightManager } from "./LightManager";
import type { GameButtons,  } from "../input/Buttons";
import type { Joystick } from "../input/Joystick";
import SoundAtlas from "../sounds/atlas";
import { createAudioEmitterOnObject } from "../sounds/envAudio";

export class AdminOfficeScene extends Object3D implements IUpdatable {

	readonly camera:PerspectiveCamera;
	private cameraMixer:AnimationMixer;
	private ratMixer:AnimationMixer;

	onSkipIntro?:VoidFunction;

	readonly skipIntro:VoidFunction;

	constructor( ratScene:GLTF, private input:Joystick<GameButtons> ) {
		super();
		this.add(ratScene.scene);

		const test = new MeshBasicMaterial({color:0xff0000});
		this.traverse((obj) => {
			if(obj instanceof Mesh) {
				obj.castShadow = true;
				obj.receiveShadow = true; 
			}
		});
 
		this.position.y = 1000;

		this.camera = ratScene.cameras[0] as PerspectiveCamera;
		this.camera.fov += 5;

		this.cameraMixer = new AnimationMixer(this.camera);

		const rig = ratScene.scene.getObjectByName("rig")!;
		this.ratMixer = new AnimationMixer(rig);

		const ratLaugh = createAudioEmitterOnObject(rig, 10);  

		const lightPlaceholder = new Object3D();
		//const sceneLight = this.getObjectByName("light")! ;

		this.camera.add(lightPlaceholder);
		lightPlaceholder.position.set(0,0, 0.5);

		const disposeScene = () => {
			this.traverse((obj) => {
				if (obj instanceof Mesh) {
					obj.geometry?.dispose();

					const materials = Array.isArray(obj.material)
						? obj.material
						: [obj.material];

					for (const material of materials) {
						for (const key in material) {
							const value = material[key];

							if (value?.isTexture) {
								value.dispose();
							}
						}

						material.dispose();
					}

					if (obj instanceof SkinnedMesh) {
						obj.skeleton.dispose();
					}
				}
			});

			this.clear();
		};

		//--------------------------------------------------------------------------------------
		let endingIntro = false;
		let removeUpdateable:VoidFunction;
		let releaseSpotlight: VoidFunction | undefined;

		const skipIntro = () => { 

			if( endingIntro ) return;

			// input.buttons.screenClick.removeEventListener("change", skipIntro);
			// input.buttons.shoot.removeEventListener("press", skipIntro);

			endingIntro = true; 

			$events.dispatchEvent({
				type:"fadeToBlackThen",
				callback: () => { 

					ratLaugh.stop();
					removeUpdateable();
					this.onSkipIntro?.();
					releaseSpotlight?.();
					releaseSpotlight = undefined;
					this.removeFromParent();
					disposeScene();

					$events.dispatchEvent({
						type:"introDone"
					});
				}
			})
		}

		this.skipIntro = skipIntro; 

		$events.addEventListener("startPreIntro", () => {

			endingIntro = false;

			// Borrow the shared gameplay spotlight for this cutscene. Releasing it
			// restores its original camera parent, transform, and intensity.
			releaseSpotlight = lightManager.borrow(lightPlaceholder, 9);

			const sceneAction = this.cameraMixer.clipAction(ratScene.animations[0]).play();
			sceneAction.clampWhenFinished = true;
			sceneAction.loop = LoopOnce; 

			ratLaugh.play("lolloop",true)
			ratLaugh.setVolume(0.5)

			this.ratMixer.clipAction(ratScene.animations[2]).play();

			// input.buttons.screenClick.addEventListener("change", skipIntro);
			// input.buttons.shoot.addEventListener("press", skipIntro); 

			removeUpdateable = updatables.add(this);
		});

		this.cameraMixer.addEventListener("finished", (ev) => {
			skipIntro();
		});

		$events.addEventListener("reset", (ev)=>{
			if( removeUpdateable )
			{
				// it means we are playing the intro...
				removeUpdateable();
				removeUpdateable = undefined;

				this.cameraMixer.stopAllAction();
				this.ratMixer.stopAllAction();
				releaseSpotlight?.();
				releaseSpotlight = undefined;

				//TODO: stop sounds
			}
		});
	}

	update(delta: number): void {
		this.cameraMixer.update(delta);
		this.ratMixer.update(delta); 
	}
}
