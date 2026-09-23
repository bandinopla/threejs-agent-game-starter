import { DoubleSide, LinearFilter, Mesh, MultiplyBlending, NearestFilter, SRGBColorSpace, Texture } from "three";
import { QuadDecalSplasher } from "./QuadDecalSplasher";
import { MeshBasicNodeMaterial, MeshPhysicalNodeMaterial } from "three/webgpu";
import { color, mix, texture, uv, vec3 } from "three/tsl";
import { getSpriteTextureNode } from "../utils/getSpriteTextureNode";
import { colorNodeToAlphaMask } from "../utils/colorNodeToAlphaMask";


/**
 * this class will handle the blood splashes... when a monkey is shot, for a brief period of time, blood will splash out of the monkey.
 * It will use a raycast to know where the blood should splash.
 */
export class BloodSplash extends QuadDecalSplasher {
	constructor( bloodTexture:Texture | Mesh) { 


		const shitColor = color("#2F1B1B");
		const colorNode = getSpriteTextureNode(bloodTexture);
		
		const mat = new MeshPhysicalNodeMaterial({
			colorNode: colorNode.mul(0.5),
			transparent: true,
			opacityNode: colorNodeToAlphaMask(colorNode).mul(2),
			roughness:1, 
			alphaTest:0.1,  
			ior: 1 
		});
		super(1000, mat);
	}
}