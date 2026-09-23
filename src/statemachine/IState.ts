 
export interface IState<CTX, STATES extends string> {
	context: CTX
	enter(): void
	update(delta:number): void
	exit(): void
	enterState(state: IState<CTX, STATES> | STATES): void
}