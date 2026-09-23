import { Object3D } from "three";
import type { Joystick } from "../input/Joystick";
import type { GameButtons,  } from "../input/Buttons";
import { $events } from "../events/events";
import { findScene } from "../utils/find-scene";

export type CursorIcons = {
	default:Object3D,
	hover:Object3D
}
export class Cursor extends Object3D {
	private vPos = new Object3D();
	//private camera!:Camera;
	private cleanupListeners:VoidFunction[]|undefined;

	constructor( private icons:CursorIcons, private input:Joystick<GameButtons> ){
		super(); 

		for( const icon of Object.values(icons) )
		{ 
			icon.position.set(0,0,0); 
			this.add(icon) 
		} 

		this.visible = false;

		
	}

	setHover( hover:boolean ) {
		for( let child of this.children ) {
			child.visible = false;

		}
		this.icons.hover.visible = hover;
		this.icons.default.visible = !hover;
	}

	setup(){ 

		$events.addEventListener("requestCursor", (ev)=>{

			if( this.visible )
			{
				this.release();
			}

			//this.camera = ev.camera;

			this.vPos.position.set(0,.8,0);
 

			ev.container.add( this.vPos );
			findScene(ev.container)!.add(this);
			this.visible = true; 

			this.registerEvents();
			this.setHover(false)
		}); 

		$events.addEventListener("releaseCursor", ()=>this.release());

	}

	release() {
		this.vPos.removeFromParent();
		this.removeFromParent();
		this.visible = false;

		this.cleanupListeners?.forEach( l => l() );
		this.cleanupListeners = undefined;
	}

	private registerEvents() {

		//const cursorWorldPos = new Vector3();  
		const cursor = this.vPos;
		const input = this.input;
		//const camera = this.camera;

		this.cleanupListeners = [];
		const cleanupListeners = this.cleanupListeners;

		const syncPos = ()=>this.vPos.getWorldPosition(this.position).z=.3;

		document.addEventListener('mousemove', function mouseMoveListener(event)  { 

			if (document.pointerLockElement === document.body) {
				const movementX = (event.movementX  ) ;
				const movementY = (event.movementY  ) ; 

				cursor.position.x += movementX * 0.001;
				cursor.position.y -= movementY * 0.001;

				if( cursor.position.x<-1) cursor.position.x = -1;
				if( cursor.position.x>1) cursor.position.x = 1;
				if( cursor.position.y<-1) cursor.position.y = -1;
				if( cursor.position.y>1) cursor.position.y = 1;

				//const NDC = cursor.getWorldPosition(cursorWorldPos).project(camera)
				input.buttons.virtualCursorPosition.setXY(cursor.position.x,cursor.position.y);
				syncPos()
			}
			
			//cleanup
			cleanupListeners.push( ()=> document.removeEventListener('mousemove', mouseMoveListener) );
		});

		this.input.buttons.shoot.addEventListener("press", function clickListener(  ){

			 
			input.buttons.screenClick.setXY(cursor.position.x,cursor.position.y); 

			//cleanup
			cleanupListeners.push( ()=> input.buttons.shoot.removeEventListener("press", clickListener) );
		});

		syncPos();
	}
}