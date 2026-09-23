import * as THREE from "three";
import glyphs from "./text/font_atlas.json";
import { StaticTextAtlas, type ITextAtlas } from "./text/TextAtlas";
import { TextMesh as TextMeshImpl } from "./text/TextMesh";
import { SharedTextInstancedMesh } from "./text/TextMesh";
import { isMobile } from "../utils/isMobile";


export class TextMesh extends THREE.Object3D {
	
	private static _atlas:SharedTextInstancedMesh|undefined;
	private textMesh: TextMeshImpl;

	static get atlas() { 
		return TextMesh._atlas;
	}
	
	static initialize( atlasTexture:THREE.Texture, flipY = false ) {
 
		atlasTexture.needsUpdate = true;
		atlasTexture.generateMipmaps = false;
		const atlas = new StaticTextAtlas(atlasTexture, glyphs as Array<[string, number[]]>,13, flipY );
		TextMesh._atlas = new SharedTextInstancedMesh(atlas, 10000);
	}

    constructor(text = "", fontSize = 64, color = "#000000", centered = false, backgroundColor = "transparent") { 
		super();

		this.textMesh = new TextMeshImpl(TextMesh._atlas!, text, centered ? 'center' : 'left', color, backgroundColor, 1, backgroundColor=="transparent"?0:1);
		this.add(this.textMesh); 

		if( centered )
			this.textMesh.position.y+=.2

		if( isMobile() )
		{
			fontSize*=1.3;
		} 

		this.textMesh.scale.setScalar((fontSize/20)*.7);

		this.addEventListener("added", ()=>{
			this.hidden = false;
		});

		this.addEventListener("removed", ()=>{
			this.hidden = true;
		}); 
    } 

	set dirty( value:boolean ) {
		this.textMesh.isDirty = value;
	}

	get dirty() {
		return this.textMesh.isDirty;
	}

	set hidden( value:boolean ) {
		this.textMesh.visible = !value;
	}

    setText(text: string, maxCharsPerLine = 80): void { 
		this.textMesh.setText(text, undefined, maxCharsPerLine);
		this.hidden = false;
    }

    dispose(): void { 
		this.textMesh.dispose();
    }

	override removeFromParent(){
		this.hidden = true;
		super.removeFromParent();
		return this;
	}
}
