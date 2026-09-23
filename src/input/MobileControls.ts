import { $events } from "../events/events";
import { JoystickUI } from "../ui/JoystickUI";
import type { GameButtons } from "./Buttons";
import type { Joystick } from "./Joystick";

export class MobileControls {
    constructor(
        joystick: Joystick<GameButtons>,
        canvas: HTMLCanvasElement,
		useScreenAxis = true
    ) {

		if( useScreenAxis )
		{
			const moveAxis = new JoystickUI(23);
	        const lookAxis = new JoystickUI(23, "right");

			moveAxis.onChange = (value) => {
				joystick.buttons.move.setXY(value.x, -value.y);
			};

			function syncViewDelta() {
				joystick.buttons.dragViewDelta.setXY(lookAxis.value.x/15, lookAxis.value.y/30);

				if( lookAxis.active ) {
					requestAnimationFrame(syncViewDelta);
				}
			}

			let lookPressTime = 0;
			lookAxis.onStart = () => {
				syncViewDelta();
				lookPressTime = Date.now();
			};

			lookAxis.onEnd = () => {
				const pressTime = Date.now() - lookPressTime;
				if( pressTime < 200 ) {
					joystick.buttons.shoot.press();
				}
			};  
	 
			let showAxis = false;

			$events.addEventListener("startGame", ()=>{
				showAxis = true;
				moveAxis.enabled = true;
				lookAxis.enabled = true;
			});

			$events.addEventListener("requestCursor", ()=>{
				moveAxis.enabled = false;
				lookAxis.enabled = false;
			});

			$events.addEventListener("releaseCursor", ()=>{
				if( showAxis ) {
					moveAxis.enabled = true;
					lookAxis.enabled = true;
				}
			});

			$events.addEventListener("reset", ()=>{
				showAxis = false;
				moveAxis.enabled = false;
				lookAxis.enabled = false;
			});
		}
        

		canvas.addEventListener("pointerdown", (e) => {
			//get NDC coordinate
			// Get NDC coordinate
			const rect = canvas.getBoundingClientRect();
			const x = ((e.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
			const y = -((e.clientY - rect.top) / canvas.clientHeight) * 2 + 1;
	    
			joystick.buttons.screenClick.setXY(x, y);
		 
		});
 
    }
}
