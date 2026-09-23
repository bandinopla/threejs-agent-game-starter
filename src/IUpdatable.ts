import type { Tween } from "three/examples/jsm/libs/tween.module.js";

/**
 * Global per-frame update contract and registry.
 * Registration, cleanup, timeout, progress, and tween usage are documented in
 * docs/update-system.md.
 */
export interface IUpdatable {
	update(delta:number):void|false;
}

const _updatables: IUpdatable[] = [];

export const updatables = {
	add( updatable:IUpdatable ){
		_updatables.push(updatable);
		return ()=>{ 
			const idx = _updatables.indexOf(updatable);
			_updatables[idx] = undefined;
		};
	}, 
	update(delta:number){
		let i = _updatables.length;
		while (i--) {
			if (!_updatables[i] || _updatables[i].update(delta) === false) {
				_updatables.splice(i, 1);
			}
		}
	},

	addProgressUpdatable( duration:number, lerper:(progress:number)=>void) {
		let time = 0;
		const updatable:IUpdatable = {
			update(delta:number){
				time += delta;
				const progress = Math.min(time / duration, 1);
				lerper(progress);
				if(progress === 1) return false; 
			}
		}
		return updatables.add(updatable);
	},

	timeout( delay:number, callback:()=>void ) {
		let time = 0;
		const updatable:IUpdatable = {
			update(delta:number){
				time += delta;
				if(time >= delay) {
					callback();
					return false;
				}
			}
		}
		return updatables.add(updatable);
	},

	tween( tween:Tween<any>, onComplete?:VoidFunction) {
		let done = false;

		tween.onComplete(()=>{
			done = true
			onComplete?.();
		});

		const updatable:IUpdatable = {
			update(delta:number){
				if(done) return false; 
				tween.update();
				 
			}
		}
		return updatables.add(updatable);
	}
}
