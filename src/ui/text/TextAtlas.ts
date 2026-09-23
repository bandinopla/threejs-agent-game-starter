import * as THREE from 'three';

export interface Glyph {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  width: number;
  height: number;
  advanceX: number;
}

export interface ITextAtlas {
  texture: THREE.Texture;
  fontSize: number;
  getGlyph(char: string): Glyph;
  size: number;
}

export class TextAtlas implements ITextAtlas {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public texture: THREE.CanvasTexture;
  
  private glyphs: Map<string, Glyph> = new Map();
  private cursorX: number = 0;
  private cursorY: number = 0;
  
  public readonly atlasSize: number;
  public readonly fontSize: number;
  private lineHeight: number;

  private baseFontSize :number;
  private baseLineHeight:number;
  
  private static readonly defaultChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;':\",./<>? `~";
  //private static readonly defaultChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  private scale = 1.0

  constructor(fontSize: number = 64, atlasSize: number = 1024, chars: string = TextAtlas.defaultChars) {
    this.fontSize = fontSize;
    this.atlasSize = atlasSize;

	this.baseFontSize = fontSize;
	this.baseLineHeight = fontSize * 1.2;

    // Add 20% breathing room to line height for decenders/ascenders
    this.lineHeight = fontSize * 1.2;
    
    this.canvas = document.createElement('canvas');
    this.canvas.width = atlasSize;
    this.canvas.height = atlasSize;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    
    // Fill background with black so the red channel represents opacity properly
    // Black background = 0.0, White text = 1.0 (mask)
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, atlasSize, atlasSize);
    
    // Set common context properties early
    this.ctx.font = `bold ${this.fontSize}px Arial, sans-serif`;
    this.ctx.textBaseline = 'top';

	// Dry-run to compute total required area
// Dry-run at scale=1 to find natural dimensions
	let dryX = 0, dryY = 0, rowHeight = 0;
	const measure = (width: number, height: number) => {
	  if (dryX + width > this.atlasSize) { dryX = 0; dryY += rowHeight; }
	  dryX += width;
	  rowHeight = Math.max(rowHeight, height);
	};

	// Fallback glyph size
	const fallbackW = this.fontSize * 0.5 + 8 * 2;
	const fallbackH = this.lineHeight + 8 * 2;
	measure(fallbackW, fallbackH);

	this.ctx.font = `bold ${this.fontSize}px Arial, sans-serif`;
	for (const char of chars) {
	  const m = this.ctx.measureText(char);
	  measure(m.width + 16, this.lineHeight + 16);
	}

	const requiredHeight = dryY + rowHeight;
	if (requiredHeight > this.atlasSize) {
	  this.scale = this.atlasSize / requiredHeight;
	  this.fontSize *= this.scale;
	  this.lineHeight *= this.scale;
	}

	//---------
	const tryScale = (s: number) => {
  const fs = this.baseFontSize * s;
  const lh = this.baseLineHeight * s;
  const pad = 8 * s;
  let x = 0, y = 0, rh = 0;
  const place = (w: number, h: number) => {
    if (x + w > this.atlasSize) { x = 0; y += rh; rh = 0; }
    x += w; rh = Math.max(rh, h);
  };
  place(fs * 0.5 + pad * 2, lh + pad * 2);
  this.ctx.font = `bold ${fs}px Arial, sans-serif`;
  for (const char of chars) {
    const w = this.ctx.measureText(char).width + pad * 2;
    place(w, lh + pad * 2);
  }
  return y + rh <= this.atlasSize;
};

let lo = 0, hi = 1;
for (let i = 0; i < 16; i++) {
  const mid = (lo + hi) / 2;
  if (tryScale(mid)) lo = mid; else hi = mid;
}
this.scale = lo;
this.fontSize = this.baseFontSize * this.scale;
this.lineHeight = this.baseLineHeight * this.scale;
//---------

 
    // Pre-generate the fallback glyph first
    this.addFallbackGlyph();

    // Pre-generate all provided characters
    for (const char of chars) {
      if (!this.glyphs.has(char)) {
         this.addGlyph(char);
      }
    }

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.generateMipmaps = false;
  }
  
  public getGlyph(char: string) {
    if (this.glyphs.has(char)) {
      return this.glyphs.get(char)!;
    }
    return this.glyphs.get('fallback')!;
  }
  
  private addFallbackGlyph() {
    const size = this.fontSize * 0.5;
    const padding = 8* this.scale;
    const width = size + padding * 2;
    const height = this.lineHeight + padding * 2;
    const advanceX = size + padding; // Give it a fixed advance

    if (this.cursorX + width > this.atlasSize) {
      this.cursorX = 0;
      this.cursorY += height;
    }

    // Draw a dark red square or similar in the alpha channel/red channel
    // Since we map red channel to opacity and color, drawing a solid block
    // means it will be fully opaque. We'll just draw a full white block for the unknown character
    this.ctx.fillStyle = '#ffffff';
    const yOffset = (this.lineHeight - size) / 2;
    this.ctx.fillRect(this.cursorX + padding, this.cursorY + padding + yOffset, size, size);

    const u0 = this.cursorX / this.atlasSize;
    const v1 = 1.0 - (this.cursorY / this.atlasSize);
    const u1 = (this.cursorX + width) / this.atlasSize;
    const v0 = 1.0 - ((this.cursorY + height) / this.atlasSize);

    this.glyphs.set('fallback', {
      u0, v0, u1, v1,
      width, height, advanceX
    });

    this.cursorX += width;
  }

  private addGlyph(char: string) {
    this.ctx.font = `bold ${this.fontSize}px Arial, sans-serif`;
    this.ctx.textBaseline = 'top';
    
    const metrics = this.ctx.measureText(char);
    const advanceX = metrics.width;
    const padding = 8* this.scale; // Extra padding around glyphs to avoid artifacting
    const width = advanceX + padding * 2;
    const height = this.lineHeight + padding * 2;
    
    // Wrap to next line if needed
    if (this.cursorX + width > this.atlasSize) {
      this.cursorX = 0;
      this.cursorY += height;
      if (this.cursorY + height > this.atlasSize) {
        console.warn("TextAtlas: Atlas is full, cannot add more glyphs!");
        // A more advanced system would create a new texture page here
      }
    }
    
    // Only draw printable chars (not space/newlines)
    if (char.trim() !== '') {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillText(char, this.cursorX + padding, this.cursorY + padding);
    }
    
    // WebGL / WebGPU flip Y convention: 
    // In canvas, y=0 is top. In WebGL UVs, v=0 is bottom, v=1 is top
    const u0 = this.cursorX / this.atlasSize;
    const v1 = 1.0 - (this.cursorY / this.atlasSize);                   // top of glyph
    const u1 = (this.cursorX + width) / this.atlasSize;
    const v0 = 1.0 - ((this.cursorY + height) / this.atlasSize);        // bottom of glyph
    
    this.glyphs.set(char, {
      u0, v0, u1, v1,
      width,
      height,
      advanceX
    });
    
    this.cursorX += width;
    if (this.texture) {
      this.texture.needsUpdate = true;
    }
  }

  public downloadAtlasPNG(filename: string = 'atlas.png') {
    const dataURL = this.canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  public downloadGlyphsJSON(filename: string = 'glyphs.json') {
    const glyphsObj = Object.fromEntries(this.glyphs);

	//all values are floats, leave only up to 3 decimals
	for(const char in glyphsObj){
		for(const key in glyphsObj[char]){
			glyphsObj[char][key] = parseFloat(glyphsObj[char][key].toFixed(3))
		}
	}

	// keys are strings, values always match: {"u0":0.164,"v0":0.889,"u1":0.217,"v1":1,"width":27.322,"height":56.8,"advanceX":11.322} 
	// find a way to pack them more with less trash
	// like in an array per entr [key, u0, v0, ... ]
	const packed = Object.entries(glyphsObj).map(([key, value]) => {
		return [key, [value.u0, value.v0, value.u1, value.v1, value.width, value.height, value.advanceX]]
	})


    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(packed));
    const link = document.createElement('a');
    link.href = dataStr;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export class StaticTextAtlas implements ITextAtlas {
  public texture: THREE.Texture;
  public fontSize: number;
  private glyphs: Map<string, Glyph>;

  constructor(texture: THREE.Texture, glyphs: Map<string, Glyph> | Array<[string, number[]]>, fontSize: number = 64, flipY = false) {
    this.texture = texture;
    this.fontSize = fontSize;
    if (glyphs instanceof Map) {
      this.glyphs = glyphs;
    } else {

		// glyphs is an array of  [ key, [u0, v0, u1, v1, width, height, advanceX] ]
		const glyphsObj = Object.fromEntries(glyphs as any)
		this.glyphs = new Map(Object.entries(glyphsObj).map(([key, value]) => {
			return [key, {
				u0: value[0],
				v0: flipY ? 1.0 - value[1] : value[1],
				u1: value[2],
				v1: flipY ? 1.0 - value[3] : value[3],
				width: value[4],
				height: value[5],
				advanceX: value[6]
			}]
		}));
 
    }
  }

  get size() { 
	return this.texture.source.data.width;
  }

  public getGlyph(char: string): Glyph {
    if (this.glyphs.has(char)) {
      return this.glyphs.get(char)!;
    }
    return this.glyphs.get('fallback')!;
  }
}
