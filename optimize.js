import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, draco, prune, resample, simplify } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';
import { KHRTextureBasisu } from '@gltf-transform/extensions';
import fs, { readFileSync, writeFileSync } from 'fs';  
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

// --- CONFIG ---
const INPUT  = `3d/${process.argv[2]}.glb`;
const OUTPUT = `public/${process.argv[2]}.packed.glb`;
const FORMAT = 'ktx2'; // 'png' | 'webp' | 'ktx2' (ktx2 requires toktx in PATH) 

// --- IO SETUP ---
const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
	.registerExtensions([KHRTextureBasisu])
    .registerDependencies({
        'draco3d.decoder': await draco3d.createDecoderModule(),
        'draco3d.encoder': await draco3d.createEncoderModule(), 
    })
	;
	;


const docBuffer = await fs.promises.readFile(INPUT);
const document = await io.readBinary(docBuffer);
const root = document.getRoot();
 

// --- HELPERS ---

/** Returns the 3x3 matrix components for a 2D transform (position, rotation-Z, scale) */
function getQuadUVTransform(node) {
    const [tx, , tz] = node.getTranslation();
	const [sx, , sz ] = node.getScale(); 
 

    const rot      = node.getRotation();     // quaternion

    // Extract Z rotation from quaternion
    const sinHalf = rot[1]; // qy
    const cosHalf = rot[3]; // qw
    const angle  =  2 * Math.atan2(sinHalf, cosHalf);
  
 
    const uvCX = (tx + 1)/2;
    const uvCY = (tz + 1)/2; // will be flipped below (UV Y is inverted vs world Y)
 
	 
    return { uvCX, uvCY, sx, sy:sz , angle  };
}

/** Transform a mesh-local UV (0..1 on a unit quad with origin at center)
 *  into atlas UV space.
 *  Quad local UV: (0,0)=bottom-left, (1,1)=top-right, origin at (0.5,0.5)
 */
function remapUV(u, v, { uvCX, uvCY, sx, sy, angle }) {
    // Center the quad-local UV around origin


    let lu = u - 0.5;
    let lv = v - 0.5;

    // // Apply inverse scale (the quad scale IS the UV region size)
     lu *= sx;
     lv *= sy;

    // Apply Z rotation
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
const ru = (lu * cos + lv * sin) ;
const rv = (-lu * sin + lv * cos) ;

    // Translate to atlas position; flip V (world Y up vs UV Y down)
    const au = uvCX + ru;
    const av = (uvCY + rv); // flip Y for UV space

    return [au, av];
}

/** Grab raw image bytes from a gltf-transform Texture */
function getTextureBuffer(texture) {
    return texture?.getImage() ?? null;
}

async function createAtlasTexture(atlasNode, atlasKey, type, ATLAS_SIZE, useUASTC, useAlpha ) {

    const quadNodes = atlasNode.listChildren();

	if( type=="roughnmet")
	{
		ATLAS_SIZE *= 0.5;
		// make sure is power of 2
		ATLAS_SIZE = Math.pow(2, Math.round(Math.log2(ATLAS_SIZE)));
	}
	else if( type=="normal" )
	{
		ATLAS_SIZE *= 0.5;
		ATLAS_SIZE = Math.pow(2, Math.round(Math.log2(ATLAS_SIZE)));
	}

	let isNormalMap = type=="normal";
	

    // 1. Build composite atlas image
    const compositeInputs = [];

    for (const quadNode of quadNodes) {
        const mesh = quadNode.getMesh();
        if (!mesh) continue;

        const prim     = mesh.listPrimitives()[0];
        const material = prim?.getMaterial();
        if (!material) continue;

		

        let baseColorTex ;
		

		switch( type )
		{ 
			case "normal":
				baseColorTex = material.getNormalTexture();
				break;
			case "roughnmet":
				baseColorTex = material.getMetallicRoughnessTexture();
				break; 
			default:
				baseColorTex = material.getBaseColorTexture();
				break;
		}
		
        if (!baseColorTex) continue;

		console.log(" - ",material.getName()+" :: "+type);

        const imgBuf = getTextureBuffer(baseColorTex);
        if (!imgBuf) continue;

        const { uvCX, uvCY, sx, sy, angle } = getQuadUVTransform(quadNode);
 

        // Position on the atlas canvas
        const px = Math.round((uvCX - sx * 0.5) * ATLAS_SIZE);
        const py = Math.round((( uvCY) - sy * 0.5) * ATLAS_SIZE); // flip Y 

        const pw = Math.round(sx * ATLAS_SIZE);
        const ph = Math.round(sy * ATLAS_SIZE);

        // Rotate the source image to match quad rotation (convert rad→deg, invert for UV)
        const degrees = -(angle * 180 / Math.PI);
 
        const rotatedBuf = await sharp(Buffer.from(imgBuf))
            .resize(pw, ph, { fit: 'fill' })
            .rotate(degrees, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .toBuffer(); 

        //compositeInputs.push({ input: rotatedBuf, left: Math.max(0, px), top: Math.max(0, py) });
const meta = await sharp(rotatedBuf).metadata();
const rw = meta.width;
const rh = meta.height;

const left = Math.round(px + (pw - rw) / 2);
const top  = Math.round(py + (ph - rh) / 2);

compositeInputs.push({ input: rotatedBuf, left: Math.max(0, left), top: Math.max(0, top) });

        usedTextures.add(baseColorTex);
        usedMaterials.add(material); 

		uvRemapper[ material.getName() ] = ( oldU, oldV ) => {
			return remapUV(oldU, oldV, { uvCX, uvCY, sx, sy, angle });
		}
		//console.log("+ created remapper for", material.getName())
 
    }

	if( compositeInputs.length == 0) return;

	console.log("Type", type, "Atlas Size", ATLAS_SIZE, "Inputs", compositeInputs.length)


    // 2. Render atlas   MetallicRoughness
	const bgColor = isNormalMap ? { r: 128, g: 128, b: 255 } : 
		type=="roughnmet" ? { r: 0, g: 255, b: 0 } : { r: 0, g: 0, b: 0 };

		if( useAlpha && type=="color") {
			bgColor.alpha = 0;
		}

	let atlasBuf = sharp({
		create: {
			width: ATLAS_SIZE,
			height: ATLAS_SIZE,
			channels: useAlpha ? 4 : 3,
			background: bgColor
		}
	}).composite(compositeInputs);

    let mimeType;
    if (FORMAT === 'png') {
        atlasBuf = await atlasBuf.png().toBuffer();
        mimeType = 'image/png';
    } else if (FORMAT === 'webp') {
        atlasBuf = await atlasBuf.webp({ lossless: true }).toBuffer();
        mimeType = 'image/webp';
    } else if (FORMAT === 'ktx2') {

		const basisuExtension = document.createExtension(KHRTextureBasisu);
		basisuExtension.setRequired(true);

		const pngBuf = await atlasBuf.clone()
			.png({
				compressionLevel: 9,
				palette: !useAlpha
			})
			.toBuffer();

        // sharp produces png, then toktx converts to ktx2 
        const tmpIn  = `/tmp/atlas_${atlasKey}_${type}.png`;
        const tmpOut = `/tmp/atlas_${atlasKey}_${type}.ktx2`;
        await sharp(pngBuf).toFile(tmpIn);
        
        //execSync(`toktx --t2 --encode uastc --uastc_quality 2 ${tmpOut} ${tmpIn}`);
		////execSync(`toktx --t2 --encode uastc --uastc_quality 2 ${tmpOut} ${tmpIn}`, { stdio: 'inherit' });

		// WOW: Super compression!!!!!
		////execSync(`toktx --t2 --encode etc1s ${tmpOut} ${tmpIn}`, { stdio: 'inherit' });

		const isLinear = type === "normal" || type === "roughnmet" ;

		const format = isLinear
			? "R8G8B8A8_UNORM"
			: "R8G8B8A8_SRGB";

		const tf = isLinear ? "linear" : "srgb";

		const isDataTexture = type!=="color" ;

		//--normal-mode
		try {
			if (useUASTC) {
				execSync(`ktx create \
						--format ${format} \
						--assign-tf ${tf} \
						--encode uastc \
						${ !isDataTexture ? "--uastc-rdo --uastc-rdo-l 1.5" : ""} \
						--uastc-quality 2 \
						--zstd 18 \
						${tmpIn} ${tmpOut}
						`, { stdio: 'inherit' });

			} else {
				execSync(`ktx create \
							--format ${format} \
							--assign-tf ${tf} \
							--encode basis-lz \
							--qlevel 128 \
							--clevel 5 \
							${tmpIn} ${tmpOut}
							`, { stdio: 'inherit' });

			}
		} catch (e) {
			console.error(e.stdout?.toString());
			console.error(e.stderr?.toString());
			throw e;
		}


        const fs = await import('fs');
        atlasBuf = fs.default.readFileSync(tmpOut);
        mimeType = 'image/ktx2'; 
    }

    // 3. Create new atlas texture in document
    const atlasTexture = document.createTexture(atlasKey)
        .setImage(new Uint8Array(atlasBuf))
        .setMimeType(mimeType);

	return atlasTexture;
}

// --- MAIN PASS ---

const scene  = root.getDefaultScene() ?? root.listScenes()[0];
const nodes  = scene.listChildren();
const usedTextures  = new Set();
const usedMaterials = new Set();
const uvRemapper = new Map();

//
// ----------------- SCAN FOR ATLASSES ---------------
//
for (const atlasNode of nodes) {
    const extras = atlasNode.getExtras();
    if (!extras?.atlas) continue;

    const atlasKey = extras.atlas;
	const ATLAS_SIZE = parseInt(extras.size) || 1024;
	const useUASTC = extras.sharp===true;
	const useAlpha = extras.alpha===true;

    console.log(`Processing atlas: ${atlasKey} ${ATLAS_SIZE} ${useUASTC?"sharp":"blurry"} ${useAlpha?"w/alpha":"opaque"}`);
	 


    // 4. Create shared atlas material
    const atlasMaterial = document.createMaterial(`mat_${atlasKey}`)
        //.setBaseColorTexture(atlasTexture)
		.setBaseColorTexture( await createAtlasTexture(atlasNode, atlasKey, "color", ATLAS_SIZE, useUASTC, useAlpha ) )
		.setNormalTexture( await createAtlasTexture(atlasNode, atlasKey, "normal", ATLAS_SIZE, false, false ) )
		.setMetallicRoughnessTexture( await createAtlasTexture(atlasNode, atlasKey, "roughnmet", ATLAS_SIZE, false, false ) )
		.setAlphaMode(useAlpha?"MASK":"OPAQUE")
		.setMetallicFactor(0)
		.setRoughnessFactor(1)
        ;

    // 5. Remap UVs on ALL meshes in the scene that used any of the old materials
    document.getRoot().listNodes().forEach(node => {
        const mesh = node.getMesh();
        if (!mesh) return;

        mesh.listPrimitives().forEach(prim => {
            const mat = prim.getMaterial(); 

            if (!mat || ![...usedMaterials].some(m => m.getName() === mat.getName())) return;

			const remapper = uvRemapper[ mat.getName() ];
			if (!remapper) {
				
				console.log("Remapper not found for material", mat.getName());
				return;
			}; 

            // Remap UV0
            const uvAttr = prim.getAttribute('TEXCOORD_0');
            if (!uvAttr) return;

            const count    = uvAttr.getCount();
            const newArray = new Float32Array(count * 2);
            for (let i = 0; i < count; i++) {
                const u = uvAttr.getElement(i, [])[0];
                const v = uvAttr.getElement(i, [])[1];
                const [au, av] = remapper(u, v);
                newArray[i * 2]     = au;
                newArray[i * 2 + 1] = av;
            } 


            const newAttr = document.createAccessor()
                .setType('VEC2')
                .setArray(newArray);

            prim.setAttribute('TEXCOORD_0', newAttr);
            prim.setMaterial(atlasMaterial);
 
        });
    });
} 

// // 6. Remove old materials and textures


//-----------------------------------------------------------------------------------------------
    for (const texture of document.getRoot().listTextures()) { 
	  if( usedTextures.has(texture)) continue;
      if (texture.getMimeType() === 'image/ktx2') continue;

      const image = texture.getImage();
      if (!image) continue;

      const tmpIn = join(tmpdir(), `${texture.getName()}_in.png`);
      const tmpOut = join(tmpdir(), `${texture.getName()}_out.ktx2`);

      writeFileSync(tmpIn, Buffer.from(image));
	  console.log("Converting ", texture.getName(), " to KTX2");
 
	  execSync(`ktx create \
							--format R8G8B8A8_SRGB \
							--assign-tf srgb \
							--encode basis-lz \
							--qlevel 128 \
							--clevel 5 \
							${tmpIn} ${tmpOut}
							`, { stdio: 'inherit' });

      texture.setImage(readFileSync(tmpOut));
      texture.setMimeType('image/ktx2');
    }
//-----------------------------------------------------------------------------------------------

/**
 * 
 * @param {import('@gltf-transform/core').Material} mat 
 */
function disposeMaterial(mat) {
	mat.getBaseColorTexture()?.dispose();
	mat.getNormalTexture()?.dispose();
	mat.getMetallicRoughnessTexture()?.dispose(); 
	mat.dispose();
}

for (const mat of usedMaterials) {
	disposeMaterial(mat);
}


//await MeshoptSimplifier.ready; 
await document.transform(
	// --EL simplify rompe todo... es una caaca.
	// simplify({
	// 	simplifier: MeshoptSimplifier,
	// 	ratio: 0.1,
	// 	error: 0.001
	// }), 
	resample(),
	draco()
);
  

// 7. Write output
const glb = await io.writeBinary(document); 

await fs.promises.writeFile(OUTPUT, glb);
console.log(`Written: ${OUTPUT}`);

// console.log("Final total size is "+ ((resultTotals/originalTotals)*100).toFixed(1) + "% of original." );
// console.log(`Final size is ${ formatSize(resultTotals) } vs ${formatSize(originalTotals)}`);
const formatSize = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

console.log(`Final size is ${ formatSize(glb.length) } from ${ formatSize(docBuffer.length) }. Reduction: ${ (( (docBuffer.length-glb.length)/docBuffer.length)*100).toFixed(1) } %`);
  