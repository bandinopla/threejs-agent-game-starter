 
import type { IState } from "../../../statemachine/IState";
import type { MonkeyContext } from "./MonkeyContext";
/**
 * Possible state IDs in which a player can be in
 */
export type MonkeyStateType = "idle" | "chase" | "shoot-at-target" | "die" | "martilleando";


export interface IMonkeyState extends IState<MonkeyContext, MonkeyStateType> {
	
}

export class MonkeyBaseState implements IMonkeyState {
	context: MonkeyContext;

	enter(): void { 
	}
	update(delta: number): void { 
	}
	exit(): void { 
	}

	public enterState: (state: MonkeyStateType | IState<MonkeyContext, MonkeyStateType>) => void;  
}