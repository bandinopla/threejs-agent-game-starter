import type { IState } from "./IState";

export class StateMachine<CTX extends {}, STATES extends string, ISTATE extends IState<CTX, STATES>> {
	private _currentState: ISTATE| null = null
	private states: Record<STATES, ISTATE>;
	private context: CTX;

	constructor( context: CTX, states: Record<STATES, ISTATE>) {
		this.context = context;
		this.states = states; 
	}

	public get currentState() {
		return this._currentState
	}

	public enterState = (newState: ISTATE | STATES) => {
		if( typeof newState === "string" && this.states[newState]){
			const state = this.states[newState]
			if(state){
				this._currentState?.exit()

				if(!state.context){
					state.context = this.context as CTX
				}
				this._currentState = state
				this.currentState!.enterState = this.enterState
				this.currentState!.enter()
			}
		}
		else {
			this._currentState?.exit()
			this._currentState = newState as ISTATE

			if(!this._currentState) {
				return;
			}

			if(!this._currentState.context){
				this._currentState.context = this.context as CTX
			}
			this._currentState!.enterState = this.enterState
			this._currentState!.enter()
		}
	}

	public getState(state:STATES) {
		return this.states[state]
	}

	update(deltaTime: number){
		this.currentState?.update(deltaTime)
	}
	
}