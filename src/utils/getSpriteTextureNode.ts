import { LinearFilter, Mesh, MeshStandardMaterial, SRGBColorSpace, type Texture } from "three";
import { texture, uv, vec2 } from "three/tsl"; 
import type { BufferAttribute, BufferAttributeEventMap, InterleavedBufferAttribute, Node } from "three/webgpu";


function getUvOriginAndSize( uvPos:BufferAttribute<BufferAttributeEventMap>|InterleavedBufferAttribute ){
	const uvOriginX = Math.min( uvPos.getX(1), uvPos.getX(2) )
	const uvOriginY = Math.min( uvPos.getY(2), uvPos.getY(3) )
	const uvWidth = Math.max( uvPos.getX(1), uvPos.getX(2) ) - uvOriginX;
	const uvHeight = Math.max( uvPos.getY(0), uvPos.getY(3) ) - uvOriginY;
	return { uvOriginX, uvOriginY, uvWidth, uvHeight };
}

/**
 * 
 * @param textureOrQuad If it is a mesh, it is assumed to be a perfect quad that has a material from an atlas texture and it's UVs are inside of an atlas. NOT ROTATED. Else, it is the texture to use itself.
 * @returns 
 */
export function getSpriteTextureNode( textureOrQuad:Mesh|Texture )
{
	//-------
	let colorNode:Node<"vec4">;
	if( textureOrQuad instanceof Mesh ){
		const atlasTexture = (textureOrQuad.material as MeshStandardMaterial).map! as Texture; 

		atlasTexture.minFilter = LinearFilter;
		atlasTexture.magFilter = LinearFilter;
		atlasTexture.colorSpace = SRGBColorSpace;

		const uvPos = textureOrQuad.geometry.attributes.uv;
 

		// const uvOriginX = uvPos.getX(2)
		// const uvOriginY = uvPos.getY(2)
		// const uvWidth = uvPos.getX(1) - uvOriginX;
		// const uvHeight = uvPos.getY(0) - uvOriginY;


		// const uvOriginX = Math.min( uvPos.getX(1), uvPos.getX(2) )
		// const uvOriginY = Math.min( uvPos.getY(2), uvPos.getY(3) )
		// const uvWidth = Math.max( uvPos.getX(1), uvPos.getX(2) ) - uvOriginX;
		// const uvHeight = Math.max( uvPos.getY(0), uvPos.getY(3) ) - uvOriginY;
 
		const { uvOriginX, uvOriginY, uvWidth, uvHeight } = getUvOriginAndSize(uvPos);
		
		const customUV = uv().mul(vec2(uvWidth, uvHeight)).add(vec2(uvOriginX, uvOriginY));
		colorNode = texture(atlasTexture, customUV);
	}
	else 
	{
		colorNode = texture(textureOrQuad);
	}
	//-------
	return colorNode;
}



export function getAtlasTextureOverlay( baseQuad:Mesh, overlayQuad:Mesh )
{
		const uvPos = baseQuad.geometry.attributes.uv;
		// const uvOriginX = uvPos.getX(2)
		// const uvOriginY = uvPos.getY(2)
		// const uvWidth = uvPos.getX(1) - uvOriginX;
		// const uvHeight = uvPos.getY(0) - uvOriginY;	
		const { uvOriginX, uvOriginY, uvWidth, uvHeight } = getUvOriginAndSize(uvPos);

		const mainOffset = vec2(uvOriginX, uvOriginY);
		const mainScale = vec2(uvWidth, uvHeight);

		const overlayUVPos = overlayQuad.geometry.attributes.uv;
		// const overlayUVOriginX = overlayUVPos.getX(2)
		// const overlayUVOriginY = overlayUVPos.getY(2)
		// const overlayUVWidth = overlayUVPos.getX(1) - overlayUVOriginX;
		// const overlayUVHeight = overlayUVPos.getY(0) - overlayUVOriginY;	
		const { uvOriginX:overlayUVOriginX, uvOriginY:overlayUVOriginY, uvWidth:overlayUVWidth, uvHeight:overlayUVHeight } = getUvOriginAndSize(overlayUVPos);

		const overlayOffset = vec2(overlayUVOriginX, overlayUVOriginY);
		const overlayScale = vec2(overlayUVWidth, overlayUVHeight);

		const baseUV = uv();
		const normalizedUV = baseUV.sub(mainOffset).div(mainScale);
		const overlayUV = normalizedUV.mul(overlayScale).add(overlayOffset);

		const atlasMap = (overlayQuad.material as MeshStandardMaterial).map! as Texture; 
		return texture(atlasMap, overlayUV);
	
 
}