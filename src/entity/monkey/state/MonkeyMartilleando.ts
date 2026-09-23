 
import { MonkeyBaseState } from "./IMonkeyState";

const patterns = [1,2,1.2,1.1,1.6]
export class MonkeyMartilleandoState extends MonkeyBaseState {
	
	private hitCount = 0;
	
	enter(): void {
		this.martilleaHijoDePuta(); 
		
	}
	
	
	private martilleaHijoDePuta() {
		
		this.hitCount++;

		const scale = Math.floor( this.hitCount / 3 ) % patterns.length;

		//console.log("SCAL INDEXE: ", scale, "SPEED: ", patterns[scale])

		this.context.anim.gotoAndPlay("martilleando", { force:true, timeScale:patterns[scale] , onClipEndOrLoop:()=>{
			this.martilleaHijoDePuta();
		} });
	}
}