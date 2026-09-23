import type { Material, MeshPhysicalMaterial } from "three";
import { max, step, texture } from "three/tsl";
import { MeshPhysicalNodeMaterial, SRGBColorSpace } from "three/webgpu";

const dicc = new Map<MeshPhysicalMaterial, Material>();

export const setupGraffitiMaterial = ( material:MeshPhysicalMaterial ) => {
	if( dicc.has(material) ) return dicc.get(material);
	
	material.map!.colorSpace = SRGBColorSpace;
	  
	const tex = texture( material.map! );
	const m = new MeshPhysicalNodeMaterial({
		colorNode: tex.rgb,
		transparent: false,
		opacityNode: step(0.05, max(tex.r, max(tex.g, tex.b))),
		alphaTest: 0.5, 
	}); 
	dicc.set(material, m);
	
	return m;
}