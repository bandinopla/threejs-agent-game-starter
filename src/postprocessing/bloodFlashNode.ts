 
import { add, Fn, mix, mul, pow, screenUV, sub, time, uniform, vec2, vec3 } from "three/tsl";
import type { PassNode } from "three/webgpu";
import { $events } from "../events/events";

const curve = Fn(([t]) => {

	const u = sub(1, t);

	const p0 = vec2(0.0, 0.0);
	const p1 = vec2(0.25, 1.0);
	const p2 = vec2(0.54231, 0.175);
	const p3 = vec2(1.0, 1.0);

	const p = add(
		mul(pow(u, 3), p0),
		mul(3, mul(pow(u, 2), t), p1),
		mul(3, mul(u, pow(t, 2)), p2),
		mul(pow(t, 3), p3)
	);

	return p.y;

});

export function bloodFlashNode( base:PassNode ) {

	const red = vec3(2,0,0).mul( curve( screenUV.x ));
	const black = vec3(0,0,0);
	const white = vec3(1,1,1) ;
	const timeSinceShot = uniform(0);
	const duration = uniform(1);
	const factor = time.sub(timeSinceShot).div(duration).clamp(0,1).oneMinus();
	const ease = factor

	$events.addEventListener("monkeyShot", ()=>{
		timeSinceShot.value = time.value;
	})

	//return base.mul( mix( white, red , ease )).mul( mix(1, 5, ease))

	const mask = mix( white, black , base.r.mul(5).clamp(0,1) ).pow(3).clamp(0,1) ;
	const light = base.rgb.length();
	const redScene = mix( black, red , mask.div(4)) ;

	return mix( base, redScene, ease ) 
}