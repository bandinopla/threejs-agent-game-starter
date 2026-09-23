import type { AnimationClip, AnimationMixer, Object3D, PerspectiveCamera } from "three";
import type { AnimationController } from "../animation/AnimationController";

export interface CameraContext {
	anim:AnimationController
	clips:AnimationClip[]	
	camera:PerspectiveCamera
	follow?:Object3D
}