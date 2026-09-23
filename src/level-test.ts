import { DRACOLoader, GLTFLoader, KTX2Loader, OrbitControls } from "three/examples/jsm/Addons.js";
import type { AppBuilder } from "./type";
import { AmbientLight, Color } from "three";
import { Level } from "./level/Level";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { PhysicsScene } from "./physics/PhysicsScene";

export const LevelTest : AppBuilder = async (renderer, scene, camera) => {

	scene.background = new Color(0x222222)
	scene.add(new AmbientLight(0xffffff, 0.5))

	new OrbitControls(camera, renderer.domElement)

	const glbLoader = new GLTFLoader();

	const stats = new Stats();
	stats.showPanel(0);
	document.body.appendChild(stats.dom);


	/*/
	glbLoader.setDRACOLoader(new DRACOLoader().setDecoderPath("https://www.gstatic.com/draco/v1/decoders/")); 

	glbLoader.setKTX2Loader(new KTX2Loader().setTranscoderPath("https://cdn.jsdelivr.net/npm/three@0.181.2/examples/jsm/libs/basis/").detectSupport(renderer))

	const glb = await glbLoader.loadAsync("level_compressed.glb")
	/*/

	const glb = await glbLoader.loadAsync("level-test.glb")
	//*/

	const world = new PhysicsScene();
	const level = new Level(glb.scene, true)
	
	scene.add(level) 
	 
	return (delta:number) => {
		stats.update();
	}
}