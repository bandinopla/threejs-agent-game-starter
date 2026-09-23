import { AnimationMixer, type AnimationClip, type Object3D } from "three";
import type { IUpdatable } from "../../IUpdatable";
import { Entity } from "../Entity";
import { SkeletonUtils } from "three/examples/jsm/Addons.js";
import { AnimationController } from "../../animation/AnimationController";

export class Skeleton extends Entity implements IUpdatable {

	private anim:AnimationController;

	constructor( rigTemplate:Object3D, anims:AnimationClip[] ) {
		super();
		const rig = SkeletonUtils.clone(rigTemplate);
		this.add(rig);
		rig.scale.multiplyScalar(0.7);

		this.anim = new AnimationController(new AnimationMixer(rig), {
			hiphop: anims.find(c=>c.name=="hiphop")
		});

		this.anim.gotoAndPlay("hiphop", { loop: true });
	}

	update(delta: number): void {
		this.anim.update(delta);
	}
}