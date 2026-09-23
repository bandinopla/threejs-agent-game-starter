import { dot, float, Fn, fract, mx_noise_float, sin, uniform, uv, vec2 } from "three/tsl";
 

const whiteNoise = Fn(([p]) => {
    return fract(sin(dot(p, vec2(12.9898, 78.233))).mul(43758.5453));
});

export function createBurnMask() {
    const staticNoise = whiteNoise( uv() );

    const progress = uniform(0);
    const noiseMask = mx_noise_float(
        uv().mul(12).add( staticNoise.mul(.1)),
        1,
        float(-1).add( float(2.5).mul(progress.oneMinus())),
    ).clamp(0, 1);

    const burn = noiseMask.remap(0, 0.2, 0, 1).clamp(0, 1);
    const holes = burn.greaterThan(0.99);
    const rim = burn.sub(holes).clamp(0, 1);
    const n = rim;
    const rimMask = n.greaterThan(0).and(n.lessThan(1));
    const burnMask = rim.oneMinus().mul(rimMask).mul(staticNoise);

    return {
		progressUniform: progress,
		mask:burn,
		rim:burnMask
	}
}
