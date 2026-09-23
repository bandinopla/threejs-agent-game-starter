 
import type { IState } from "../../../statemachine/IState";
import type { GnomeContext } from "./GnomeContext"; 

/**
 * Possible state IDs in which a player can be in
 */
export type GnomeStateType = "locomotion" | "jump" | "shoot" | "intro" | "die";

/**
 * Interface for a player state
 */
export interface IGnomeState extends IState<GnomeContext, GnomeStateType> { 
	
	move(forwardSign:number, sideSign:number):void;
	jump():void;
	shoot():void;
}
