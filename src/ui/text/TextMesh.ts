import * as THREE from 'three';
import { color, float, texture, uv, vec2, attribute, nodeObject, max, mix } from 'three/tsl';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { TextAtlas, type ITextAtlas } from './TextAtlas';
import { colorNodeToAlphaMask } from '../../utils/colorNodeToAlphaMask';

const sharedGeometry = new THREE.PlaneGeometry(1, 1);
sharedGeometry.translate(0.5, -0.5, 0); // Origin at top-left, spanning [0,1] in X and [0,-1] in Y

const bgGeometry = new THREE.PlaneGeometry(1, 1); 

const tempObj = new THREE.Object3D();
const m = new THREE.Matrix4();
		
export class SharedTextInstancedMesh extends THREE.InstancedMesh {
    private textMeshes: Set<TextMesh> = new Set();
    private meshInfo = new Map<TextMesh, { start: number, count: number }>();
    public maxCount: number;

    constructor(readonly atlas: ITextAtlas, maxCount: number = 10000) {
        const textMaterial = new MeshBasicNodeMaterial();
        textMaterial.transparent = true;
		textMaterial.alphaTest = 0.01;
        textMaterial.depthWrite = false;
        
        const a_glyphRect = attribute('a_glyphRect', 'vec4');
        const customUV = vec2(
            uv().x.mul(a_glyphRect.z).add(a_glyphRect.x),
            uv().y.mul(a_glyphRect.w).add(a_glyphRect.y)
        );
        const mapNode = texture(atlas.texture, customUV);
        
        const a_colorAlpha = attribute('a_colorAlpha', 'vec4');
        textMaterial.colorNode = color(a_colorAlpha.xyz) //mix(  color("red"), a_colorAlpha.xyz,a_colorAlpha.w ) //color(a_colorAlpha.xyz) ;
        textMaterial.opacityNode = mapNode.mul(2) //colorNodeToAlphaMask(mapNode);; //.mul(a_colorAlpha.w);

        super(sharedGeometry, textMaterial, maxCount);
        this.maxCount = maxCount;
        this.name = 'SharedTextInstancedMesh';
        
        const glyphRects = new Float32Array(maxCount * 4);
        this.geometry.setAttribute('a_glyphRect', new THREE.InstancedBufferAttribute(glyphRects, 4));
        
        const colors = new Float32Array(maxCount * 4);
        this.geometry.setAttribute('a_colorAlpha', new THREE.InstancedBufferAttribute(colors, 4));

        this.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.geometry.getAttribute('a_glyphRect').setUsage(THREE.DynamicDrawUsage);
        this.geometry.getAttribute('a_colorAlpha').setUsage(THREE.DynamicDrawUsage);

        this.frustumCulled = false;

        this.onBeforeRender = () => {
           this.rebuildBuffers();
        };
    }

    register(mesh: TextMesh) {
       this.textMeshes.add(mesh);
    }
    
    unregister(mesh: TextMesh) {
       this.textMeshes.delete(mesh);
    }

    rebuildBuffers() {
        let needsFullRebuild = false;
        let needsUpdate = false;
        let expectedTotalQuads = 0;
        let prevTotalQuads = 0;

        for (const info of this.meshInfo.values()) {
            prevTotalQuads += info.count;
        }

        let visibleSetCount = 0;
        for (const tm of this.textMeshes) {
            if (!tm.visible) continue;
            
            const quads = tm.getLocalQuads();
            expectedTotalQuads += quads.length;
            visibleSetCount++;

            if (tm.isDirty) {
                needsUpdate = true;
                const info = this.meshInfo.get(tm);
                if (!info || info.count !== quads.length) {
                    needsFullRebuild = true;
                }
            }
        }

        // If visibility changed, or meshes were added/removed
        if (expectedTotalQuads !== prevTotalQuads || visibleSetCount !== this.meshInfo.size) {
            needsFullRebuild = true;
            needsUpdate = true;
        }

        if (!needsUpdate) return;

        const mArray = this.instanceMatrix.array;
        const rectArray = this.geometry.getAttribute('a_glyphRect').array;
        const colorArray = this.geometry.getAttribute('a_colorAlpha').array;

        if (needsFullRebuild) {
            let cursor = 0;
            this.meshInfo.clear();
            
            for (const tm of this.textMeshes) {
                if (!tm.visible) continue;

                let currentParent = tm.parent;
                let inScene = false;
                while(currentParent) {
                    if (currentParent.type === 'Scene') { inScene = true; break; }
                    currentParent = currentParent.parent;
                }
                if (!inScene) continue;

                const quads = tm.getLocalQuads();
                const count = quads.length;
                if (cursor + count > this.maxCount) break;

                this.meshInfo.set(tm, { start: cursor, count: count });
                this.updateMeshInBuffers(tm, cursor, mArray as Float32Array, rectArray as Float32Array, colorArray as Float32Array);
                cursor += count;
                tm.isDirty = false;
            }

            this.count = cursor;
        } else {
            // Incremental update! Only update dirty meshes in their existing slots.
            for (const tm of this.textMeshes) {
                if (tm.isDirty && tm.visible) {
                    const info = this.meshInfo.get(tm);
                    if (info) {
                        this.updateMeshInBuffers(tm, info.start, mArray as Float32Array, rectArray as Float32Array, colorArray as Float32Array);
                    }
                    tm.isDirty = false;
                }
            }
        }

        if (this.count > 0) {
            this.instanceMatrix.needsUpdate = true;
            (this.geometry.getAttribute('a_glyphRect') as THREE.InstancedBufferAttribute).needsUpdate = true;
            (this.geometry.getAttribute('a_colorAlpha') as THREE.InstancedBufferAttribute).needsUpdate = true;
        }
    }

    private updateMeshInBuffers(tm: TextMesh, startIndex: number, mArray: Float32Array, rectArray: Float32Array, colorArray: Float32Array) {
        const quads = tm.getLocalQuads();
        const tmWorld = tm.matrixWorld;
        const r = tm.textColor.r;
        const g = tm.textColor.g;
        const b = tm.textColor.b;
        const a = tm.textAlpha;

        for(let i=0; i<quads.length; i++) {
            const quad = quads[i];
            const idx = startIndex + i;

            tempObj.position.set(quad.x, quad.y, 0);
            tempObj.scale.set(quad.w, quad.h, 1);
            tempObj.updateMatrix();

            m.multiplyMatrices(tmWorld, tempObj.matrix);
            m.toArray(mArray, idx * 16);

            rectArray[idx*4] = quad.u0;
            rectArray[idx*4+1] = quad.v0;
            rectArray[idx*4+2] = quad.uSpan;
            rectArray[idx*4+3] = quad.vSpan;

            colorArray[idx*4] = r;
            colorArray[idx*4+1] = g;
            colorArray[idx*4+2] = b;
            colorArray[idx*4+3] = a;
        }
    }
}

export class TextMesh extends THREE.Group { 
  public align: 'left' | 'center';
  public textColor: THREE.Color;
  public bgColor: THREE.Color;
  public textAlpha: number;
  public bgAlpha: number;

  private backgroundMesh: THREE.Mesh;
  private localQuads: { x: number, y: number, w: number, h: number, u0: number, v0: number, uSpan: number, vSpan: number }[] = [];
  
  private registered: boolean = false; 

  isDirty: boolean = true;
 
  get atlas() {
	return this.sharedInstancedMesh.atlas;
  }
  
  constructor(
    readonly sharedInstancedMesh: SharedTextInstancedMesh, 
    text: string = '', 
    align: 'left' | 'center' = 'left', 
    textColor: number | string = 0xffffff, 
    bgColor: number | string = 0x000000,
    textAlpha: number = 1.0,
    bgAlpha: number = 0.0 // Default to transparent background
  ) {
    super();
     
    this.align = align;
    this.textColor = new THREE.Color(textColor);
    this.bgColor = new THREE.Color(bgColor);
    this.textAlpha = textAlpha;
    this.bgAlpha = bgAlpha;
    
    // Create the background mesh wrapper
    const bgMaterial = new MeshBasicNodeMaterial();
    bgMaterial.transparent = true;
    bgMaterial.depthWrite = false; 
    bgMaterial.colorNode = color(this.bgColor);
    bgMaterial.opacityNode = float(this.bgAlpha);
    
    this.backgroundMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    // Push background slightly behind text
    this.backgroundMesh.position.z = -0.3; 

	if( this.bgAlpha>0 ){
		//this.add(this.backgroundMesh);
	} 

    if (text) {
      this.setText(text, align);
    } 
  }

  updateMatrixWorld(force?: boolean) {
      super.updateMatrixWorld(force);
      
      // Auto-register onto the scene when first attached
      if (!this.registered) {
         this.sharedInstancedMesh.register(this);
         this.registered = true;
      }
  }

  dispose() {
      if (this.sharedInstancedMesh) {
          this.sharedInstancedMesh.unregister(this);
          this.registered = false;
      }
  }

  public getLocalQuads() {
      return this.localQuads;
  }

  public setText(text: string, align?: 'left' | 'center',  maxCharactersPerLine?: number) {

	this.isDirty = true;

    if (align !== undefined) this.align = align;
    
    //const lines =  text.split('\n');


const rawLines = text.split('\n');
const lines: string[] = [];
for (const raw of rawLines) {
  if (maxCharactersPerLine && raw.length > maxCharactersPerLine) {
    const words = raw.split(' ');
    let current = '';
    for (const word of words) {
      if (current.length + word.length + 1 > maxCharactersPerLine) {
        if (current) lines.push(current);
        current = word;
      } else {
        current = current ? `${current} ${word}` : word;
      }
    }
    if (current) lines.push(current);
  } else {
    lines.push(raw);
  }
}


    //const scale = 0.02; // Downscale factor to translate pixels to world units
	const scale = this.atlas.fontSize / this.atlas.size / 0.1;
	
    const padding = 0;  // Matching padding used in TextAtlas
    const lineHeight = 2.5;
    let totalHeight = lines.length * lineHeight * scale;
    
    // Determine max line width for the background wrapper
    let maxLineWidth = 0;
    for (const line of lines) {
      let lw = 0;
      for (const char of line) {
        lw += (this.atlas.getGlyph(char).advanceX / this.atlas.fontSize) * scale; 
      }
      maxLineWidth = Math.max(maxLineWidth, lw);
    }

    // Determine vertical origin (Y goes downwards, so center means top is totalHeight/2)
    let currentY = this.align === 'center' ? totalHeight / 2 : 0;
    
    this.localQuads = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let lineWidth = 0;
        
        // Measure line width
        for (let j = 0; j < line.length; j++) {
            lineWidth += (this.atlas.getGlyph(line[j]).advanceX / this.atlas.fontSize) * scale;
        }
        
        // Determine horizontal origin
        let currentX = this.align === 'center' ? -lineWidth / 2 : 0;
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            const glyph = this.atlas.getGlyph(char);
            
            //const w = glyph.width * scale;
            //const h = glyph.height * scale;

			const w = (glyph.width / this.atlas.fontSize) * scale;
			const h = (glyph.height / this.atlas.fontSize) * scale;
            
            if (char.trim() !== '') {
                // We keep pure local offset data representing local letter matrix + UV bounds
                this.localQuads.push({
                    x: currentX - padding * scale,
                    y: currentY + padding * scale,
                    w, h,
                    u0: glyph.u0,
                    v0: glyph.v0,
                    uSpan: glyph.u1 - glyph.u0,
                    vSpan: glyph.v1 - glyph.v0
                });
            }
            
            //currentX += glyph.advanceX * scale;
			currentX += (glyph.advanceX / this.atlas.fontSize) * scale;
        }
        currentY -= lineHeight * scale;
    }
    
    // Adjust background mesh using the same geometry bounds sizing
	maxLineWidth*=1.3;
	totalHeight *= 1.2;
	 

    const bgPadX = padding * scale ;
    const bgPadY = padding * scale;
    const bgW = maxLineWidth + bgPadX * 2;
    const bgH = totalHeight + bgPadY * 2;
    
    const bgX = 0;
    //const bgY = (this.align === 'center' ? totalHeight / 2 : 0) + bgPadY;
 

	const bgY = 0;

    
    this.backgroundMesh.scale.set(bgW , bgH, 1);
    this.backgroundMesh.position.set(bgX, bgY , -0.3);
    this.backgroundMesh.visible = this.bgAlpha > 0;
  }
}
