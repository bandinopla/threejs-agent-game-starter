import { AmbientLight, AxesHelper, BoxGeometry, LoadingManager, Mesh, MeshBasicMaterial, MeshBasicNodeMaterial, MeshStandardMaterial, OrthographicCamera, PerspectiveCamera, PlaneGeometry, Scene, Texture, TextureLoader, WebGPURenderer } from 'three/webgpu'
import './style.css' 
import { GnomeVsMonkeysApp } from './gnome-vs-monkeys'
import { spinner } from './ui/Spinner';
import type { AppBuilder } from './type'; 
import { StaticTextAtlas, TextAtlas } from './ui/text/TextAtlas';
import { TextMesh } from './ui/TextMesh';
import { color } from 'three/tsl';
import { generateTextAtlas, textTextAtlas } from './ui/text/generateTextAtlas';
import { DRACOLoader, GLTFLoader, KTX2Loader, OrbitControls } from 'three/examples/jsm/Addons.js';
import { setupPostProcessing } from './postprocessing/setupPostProcessing';

import WebGPU from 'three/examples/jsm/capabilities/WebGPU.js';
import WebGL from 'three/addons/capabilities/WebGL.js';
import { isMobile } from './utils/isMobile';


if (!WebGPU.isAvailable() && !WebGL.isWebGL2Available()) {
    document.body.appendChild( WebGPU.getErrorMessage() );
	await new Promise(resolve=>{})
}


const renderer = new WebGPURenderer({ antialias:!isMobile() })
renderer.shadowMap.enabled = true; 
document.body.appendChild(renderer.domElement)
 
await renderer.init()
 


const camera = new PerspectiveCamera(75, 1, 0.01, 1000)
camera.position.z = 5

const onResize = () => {
	camera.aspect = window.innerWidth / window.innerHeight
	camera.updateProjectionMatrix()
	renderer.setSize(window.innerWidth, window.innerHeight)
	
}

window.addEventListener('resize', onResize)

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
 

const scene = new Scene()
scene.add( camera)

scene.add(spinner);

let app:Awaited<ReturnType<AppBuilder>>|undefined = undefined;


//*/
GnomeVsMonkeysApp(renderer, scene, camera).then( (a)=>{
	app = a;
	spinner.removeFromParent();
} )
/*/

generateTextAtlas(scene)

//*/

// Instanciar el texto especializado para WebGPU




// /*/
//   // Lazy Initialization of the Text Atlas
//   const atlas = await new TextureLoader().loadAsync("test.png");
  
//   TextMesh.initialize(atlas)

//   scene.add( TextMesh.atlas );

//   const text = new TextMesh("日本語 World",12 );
//   scene.add(text);

//    const text2 = new TextMesh("aaaorld",12 );
//   scene.add(text2);
//   text2.position.y = 1; 
 
// /*/

// const loadManager = new LoadingManager();

// 	const ldr = new GLTFLoader(loadManager);

// 	//add draco from cdn
// 	ldr.setDRACOLoader(new DRACOLoader().setDecoderPath("https://www.gstatic.com/draco/v1/decoders/"));
// 	//ldr.setKTX2Loader(new KTX2Loader().setTranscoderPath("https://cdn.jsdelivr.net/npm/three@0.181.2/examples/jsm/libs/basis/").detectSupport(renderer));

// 	const ktx2Loader = new KTX2Loader()
//     .setTranscoderPath("https://cdn.jsdelivr.net/npm/three@0.181.2/examples/jsm/libs/basis/");

// 	ktx2Loader.detectSupport(renderer);
// 	ldr.setKTX2Loader(ktx2Loader);

//   const [uiSceneAssets, levelSceneAssets] = await Promise.all([
// 	ldr.loadAsync("ui.packed.glb"), 
// 	ldr.loadAsync("level.packed.glb"),
//   ]);

//   scene.add(new AmbientLight(0xffffff, 1))
//   scene.add(uiSceneAssets.scene)
//   scene.add(levelSceneAssets.scene)

//   new OrbitControls(camera, renderer.domElement)


// const uiScene = new Scene();
// const postfx = setupPostProcessing(renderer, scene, camera, uiScene, new OrthographicCamera() );
 

// app = delta => { 
// 	postfx.render();
// 	return true;
// }

  
// //   const packedTexture = ((uiSceneAssets.scene.getObjectByName("font-atlas")! as Mesh).material as MeshStandardMaterial).map as Texture; 
// // packedTexture.generateMipmaps = false;
  

// //   const plane1 = new Mesh(new PlaneGeometry(5,5), new MeshBasicMaterial({map:atlas}))
// //   scene.add(plane1)

// //     const plane2= new Mesh(new PlaneGeometry(5,5), new MeshBasicMaterial({map:packedTexture}))
// //   scene.add(plane2)
// //   plane2.position.x = 6;


//     //TextMesh.initialize(packedTexture, true)

//   //scene.add( TextMesh.atlas );

//  // setTimeout(()=>{scene.add( TextMesh.atlas );},3000)

// //   for( let i=0; i<15; i++ ){
// // 	const text = new TextMesh("日本語 World",12 );
// //   scene.add(text);
// //   text.position.y = i*.3;
// //   }
  
// // generateTextAtlas(scene)
// // textTextAtlas(scene)



// //*/

//   const aMat = new MeshBasicNodeMaterial({ colorNode: color(0xff0000) }) 
//  const a = new Mesh(new PlaneGeometry(1,1), aMat)
//  scene.add(a)

   
//   const bMat = new MeshBasicNodeMaterial({ colorNode: color(0x00ff00) }) 
//  const b = new Mesh(new PlaneGeometry(1,1), bMat)
//  b.position.x = 1
//  scene.add(b)
 
  //scene.add(textCenter);



//const app = await LevelTest(renderer, scene, camera)
// const app = (()=>{

// 	const geometry = new PlaneGeometry(11,11 );

// 	const noise = createBurnMask()

// 	noise.progressUniform.value = 0

// 	const material = new MeshBasicNodeMaterial({
// 		//colorNode: mx_noise_vec3(uv().mul(129), 1).length().clamp(0,1)
// 		colorNode: noise.mask.add(noise.rim)
// 	});
// 	const mesh = new Mesh(geometry, material);
// 	scene.add(mesh);

// 	setInterval(() => {
// 		noise.progressUniform.value += .1
// 	}, 100)
	
// 	return delta => { 
// 		return false;
// 	}
// })()
 
 
onResize()

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
let t = 0;
const loop = (time:number) => {
	const d = (time - t) / 1000;
	t = time 
	if( app?.(d) === true ) return;
	renderer.render(scene, camera) 
}

renderer.setAnimationLoop(loop)

