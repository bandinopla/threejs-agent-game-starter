import type { GameButtons,  } from "./Buttons";
import type { ButtonType, Joystick, JoystickController } from "./Joystick";

export class KeyboardJoystickController {
	
	private joystick:Joystick<GameButtons>

	constructor( joystick:Joystick<GameButtons>, canvas:HTMLCanvasElement ) {
		this.joystick = joystick

		window.addEventListener("keydown", ev=>{
			if(ev.code === "Space" && !ev.repeat) { 
				this.joystick.buttons.jump.press()
			}  
			if(ev.code === "KeyW") {
				this.joystick.buttons.move.setY(1)
			}
			if(ev.code === "KeyS") {
				this.joystick.buttons.move.setY(-1)
			}
			if(ev.code === "KeyA") {
				this.joystick.buttons.move.setX(-1)
			}
			if(ev.code === "KeyD") {
				this.joystick.buttons.move.setX(1)
			}
			if(ev.code === "ShiftLeft") {
				this.joystick.buttons.runningMode.press()
			}
		} )
		
		window.addEventListener("keyup", ev=>{
			if(ev.code === "Space" && !ev.repeat) {
				this.joystick.buttons.jump.release()
			}
			if(ev.code === "KeyW" && this.joystick.buttons.move.y===1) {
				this.joystick.buttons.move.setY(0)
			}
			if(ev.code === "KeyS" && this.joystick.buttons.move.y===-1) {
				this.joystick.buttons.move.setY(0)
			}
			if(ev.code === "KeyA" && this.joystick.buttons.move.x===-1) {
				this.joystick.buttons.move.setX(0)
			}
			if(ev.code === "KeyD" && this.joystick.buttons.move.x===1) {
				this.joystick.buttons.move.setX(0)
			}
			if(ev.code === "ShiftLeft") {
				this.joystick.buttons.runningMode.release()
			}
		} );

		let dragging = false;
		let dragOrigin = {x:0, y:0};

		// window.addEventListener("pointerdown", ev=>{
		// 	dragging = true;
		// 	dragOrigin.x = (0.5 - ev.clientX / canvas.width)*-2 ;
		// 	dragOrigin.y = (0.5 - ev.clientY / canvas.height)*-2 ; 
		// 	this.joystick.buttons.dragViewDelta.setXY(0,0);
		// } )

		// window.addEventListener("pointerup", ev=>{
		// 	dragging = false;
		// 	this.joystick.buttons.dragViewDelta.setXY(0,0)
		// } )

		// window.addEventListener("pointermove", ev=>{
		// 	if(dragging) {

		// 		const x = (0.5 - ev.clientX / canvas.width)*-2 ;
		// 		const y = (0.5 - ev.clientY / canvas.height)*-2 ;

		// 		//drag in NDC
		// 		this.joystick.buttons.dragViewDelta.setXY(x - dragOrigin.x, y - dragOrigin.y);
		// 	}
		// } )

		document.addEventListener("pointerdown", (ev) => {
			if( ev.button==0 )
				this.joystick.buttons.shoot.press()
			else if( ev.button==2 ) 
				this.joystick.buttons.use.press()
		})

		document.addEventListener("pointerup", (ev) => {
			if( ev.button==0 )
				this.joystick.buttons.shoot.release()
			else if( ev.button==2 ) 
				this.joystick.buttons.use.release()
		})

		document.addEventListener('click', () => {
			document.body.requestPointerLock();
		});

		document.addEventListener('pointerlockchange', () => {
  			// if (document.pointerLockElement === document.body) {
			// 	//console.log('Mouse locked');
			// } else {
			// 	//console.log('Mouse unlocked: PAUSE GAME?');
			// }
		});

		document.addEventListener('mousemove', (event) => {
			if (document.pointerLockElement === document.body) {
				const movementX = (event.movementX || 0)/canvas.width;
				const movementY = (event.movementY || 0)/canvas.height; 

				this.joystick.buttons.dragViewDelta.setXY(movementX, movementY);
			 
			}
		});
	} 
}