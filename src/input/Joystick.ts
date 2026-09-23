import { EventDispatcher, type BaseEvent } from "three";

export interface PushButtonEvents {
	press: {type: "press"}
	release: {type: "release"}
}

class ButtonBase<T> extends EventDispatcher<T> {
	private _blocked = false;
	update():void {}

	block() {
		this._blocked = true;
	}

	unblock() {
		this._blocked = false;
	}

	override dispatchEvent(event: BaseEvent<Extract<keyof T, string>> & T[Extract<keyof T, string>]) {
		if( this._blocked ) return;
		super.dispatchEvent(event);
	}
}

export class PushButtonType extends ButtonBase<PushButtonEvents> {
    type: "push";
	justPressed?:boolean
	justReleased?:boolean
	pressed?:boolean

	press() {
		this.pressed = true;
		this.justPressed = true;
		this.dispatchEvent({type: "press"})
	}

	release() {
		this.pressed = false;
		this.justReleased = true;
		this.dispatchEvent({type: "release"})
	}

	override block() {
		if( this.pressed ) {
			this.release();
		}
		super.block();
	}

	update() {
		this.justPressed = false;
		this.justReleased = false;
	}
}

export interface AxisButtonEvents {
	change: {type: "change", x:number, y:number}
}

export class AxisButtonType extends ButtonBase<AxisButtonEvents>{
    type: "axis";
	x:number = 0;
	y:number = 0;

	override block() {
		this.setXY(0,0);
		super.block();
	}

	setXY(x:number, y:number) {
		this.x = x;
		this.y = y;
		this.dispatchEvent({type: "change", x, y})
	}

	setX(x:number) {
		this.setXY(x, this.y)
	}

	setY(y:number) {
		this.setXY(this.x, y)
	}
}

export type ButtonType = PushButtonType | AxisButtonType;
 
 
export class Joystick<BTNS extends Record<string, ButtonType>> {
    readonly buttons: BTNS;
	readonly controllers:JoystickController[] = []
	private _blocked = false;
    constructor( buttons:BTNS ) {
        this.buttons = buttons
    }

	test( k: keyof BTNS) {
		const btn = this.buttons[k]
		 
	}

	block() {
		if( this._blocked ) return;
		this._blocked = true;
		for( const btn of Object.values(this.buttons) ) {
			btn.block()
		}
	}

	unblock() {
		if( !this._blocked ) return;
		this._blocked = false;
		for( const btn of Object.values(this.buttons) ) {
			btn.unblock()
		}
	}

	update( delta:number ){
		if( this._blocked ) return;
		for( const btn of Object.values(this.buttons) ) {
			btn.update();
		}
		for( const c of this.controllers ) {
			c.update(delta)
		}
	}

	addController( control:JoystickController ) {
		this.controllers.push(control)
	}
}


export interface JoystickController {
  update(delta: number): void;
}