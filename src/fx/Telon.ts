import { mix, smoothstep, uniform, vec3, vec4 } from "three/tsl"
import type { RenderPipeline } from "three/webgpu"
import { $events } from "../events/events";
import { Easing, Tween } from "three/examples/jsm/libs/tween.module.js";
import { updatables } from "../IUpdatable";

export const appendTelonPass = ( pipeline:RenderPipeline ) => {

	const fade = uniform(0,"float");

	pipeline.outputNode = mix( pipeline.outputNode, vec4(0,0,0,1), smoothstep(0.0, 1.0, fade) ); 

	 
	let tween:Tween<typeof fade>;

	$events.addEventListener("fadeToBlackThen", (e) => {
 
		tween = new Tween(fade);

		const fadeOut = ()=>{
			setTimeout(()=>{

				const op = e.callback();

				const fadeOut = ()=>{
 
					tween = new Tween(fade);

					tween.to({value:0}, 500).easing(Easing.Sinusoidal.In)
					  
					
					.onComplete(() => {
					
						removeTweener();
						
					}).start();
 
				}

				if( op instanceof Promise )
				{
					op.then(fadeOut);
				}
				else
				{
					fadeOut();
				}

			}, 300) 
		}

		if( e.fromBlack )
		{
			fade.value = 1;
			fadeOut();
		}
		else 
		{
			tween.to({value:1}, 500).easing(Easing.Sinusoidal.Out).onComplete(fadeOut).start();
		}
		

		const removeTweener = updatables.add({
			update:(delta:number)=>{
				tween.update();
			}
		})
		
	});

	$events.addEventListener("reset", (ev)=>{
		fade.value = 1;
		tween = new Tween(fade); 

		const removeTweener = updatables.add({
			update:(delta:number)=>{
				tween.update();
			}
		})

		tween.to({value:0}, 500).easing(Easing.Sinusoidal.In).onComplete(removeTweener).start();
	});
}