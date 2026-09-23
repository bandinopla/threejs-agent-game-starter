import type { IState } from "../../statemachine/IState";
import type { CameraContext } from "../CameraContext";

/**
 * Possible state IDs in which a player can be in
 */
export type CameraBrainStateType = "intro" | "ingame" | "follow" | "playerKilled" ;

/**
 * Interface for a player state
 */
export interface ICameraBrainState extends IState<CameraContext, CameraBrainStateType> { 
	
	
}

export class CameraBaseState implements ICameraBrainState {
	
	context: CameraContext;
	
	enter(): void { 
	}
	
	update(delta: number): void { 
	}

	exit(): void { 
	}

	public enterState: (state: CameraBrainStateType | IState<CameraContext, CameraBrainStateType>) => void;

}
