import type { OrthographicCamera, PerspectiveCamera, Scene } from "three";
import { afterImage } from "three/examples/jsm/tsl/display/AfterImageNode.js";
import { rgbShift } from "three/examples/jsm/tsl/display/RGBShiftNode.js"; 
import { mul, pass, screenUV, texture, vec2, vec3,  } from "three/tsl";
import { RenderPipeline, type WebGPURenderer,} from "three/webgpu";
import { mix,  } from "three/tsl";
import { bloom } from "three/examples/jsm/tsl/display/BloomNode.js";
import { isMobile } from "../utils/isMobile";
import { bloodFlashNode } from "./bloodFlashNode";

const onMobile = isMobile();

export function setupPostProcessing(renderer:WebGPURenderer, scene:Scene, camera:PerspectiveCamera, uiScene:Scene, uiCamera:OrthographicCamera) {

	const renderPipeline = new RenderPipeline( renderer );

	const scenePass = pass( scene, camera );
	const uiPass = pass( uiScene, uiCamera ).getTextureNode('output'); 
 

	const screenTexture = scenePass.getTextureNode();

	const uvZoom = screenUV.sub(vec2(0.5,0.5)).div(0.5).mul(1.2);


	const sceneNode = texture( screenTexture, screenUV.sub(uvZoom.mul(0.1)) );
	const rgbShiftPass = rgbShift( sceneNode, 0.004, 2 ).textureNode;
	const ai = afterImage( mul( rgbShiftPass, vec3(0,0.4,1.3) ) , .7 ).textureNode;

	const blom = bloom(sceneNode, .8,  .3, 8)

	const mainRender = bloodFlashNode( sceneNode.add(ai).add(blom) );

	renderPipeline.outputNode = mix( mainRender, uiPass.rgb , uiPass.w );

	if( onMobile )
	{
		renderPipeline.outputNode = mix( bloodFlashNode(scenePass), uiPass.rgb , uiPass.w );
	}


	return {
		renderPipeline,
		render:()=>{
			renderPipeline.render();
		}
	}
	// return;


	// const rgbShiftPass = rgbShift( screenTexture, 0.004, 2 );

	// const scenePassDepth = scenePass.getTextureNode( 'depth' ); 

	// const ai = afterImage( rgbShiftPass.mul(vec3(0,0.4,1.3)), .8)

	// const sobelPass = sobel( scenePass );

	// const final = sobelPass.add(scenePass);

	// //uv.x += sin(uv.y * lines + time * speed) * strength
	// const lines = 10;
	// const speed = .3;
	// const strength = 0.11; 
	// const waveMask = screenUV.y.add(time.mul(0.1)).mul(3).fract().distance(0.5).div(0.5).clamp(0,1);


 
	// waveMask.add( waveMask.clamp(0,1).mul(129) ).mul(12)
	

	// //renderPipeline.outputNode = film(scenePass.add(ai), float(1.5)) //texture(scenePass.getTextureNode(), screenUV.add(vec2(waveMask.pow(3).mul(0.003),0) ) ).add(ai);
	// renderPipeline.outputNode = texture(screenTexture, screenUV.add(vec2(waveMask.pow(3).mul(0.003),0) ) ).add(ai);

	 

	// return (delta:number)=>{
	// 	renderPipeline.render();
	// }
}