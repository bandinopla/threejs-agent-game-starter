import { AnimationClip, AnimationMixer, Object3D } from "three";
import type { IUpdatable } from "../IUpdatable";
import { AnimationController } from "../animation/AnimationController";
import { Entity, type EntityEvents } from "./Entity";
import {
	ShootableEntity,
	type ShootableEntityEvents,
} from "./ShootableEntity";

export type RigAnimationClips =
	| Record<string, AnimationClip>
	| readonly AnimationClip[];

function indexClips(clips: RigAnimationClips): Record<string, AnimationClip> {
	if (!Array.isArray(clips)) return clips as Record<string, AnimationClip>;

	return clips.reduce<Record<string, AnimationClip>>((indexed, clip) => {
		indexed[clip.name] = clip;
		return indexed;
	}, {});
}

/**
 * Reusable base for an Entity that owns an animated Three.js rig.
 *
 * Subclasses remain responsible for their context, state machine, input or AI,
 * physics integration, lifecycle events, and asset-specific attachment points.
 */
export abstract class RiggedEntity<
	E extends EntityEvents = EntityEvents,
> extends Entity<E> implements IUpdatable {
	protected readonly animation: AnimationController;

	protected constructor(
		readonly rig: Object3D,
		clips: RigAnimationClips,
		animationFps = 24,
	) {
		super();
		this.add(rig);
		this.animation = new AnimationController(
			new AnimationMixer(rig),
			indexClips(clips),
			animationFps,
		);
	}

	update(delta: number): void {
		this.animation.update(delta);
	}
}

/**
 * Reusable base for an animated rig that uses ShootableEntity hitboxes and
 * ColliderHandlers. A subclass must implement createPhysicsWrappers().
 */
export abstract class RiggedShootableEntity<
	E extends ShootableEntityEvents = ShootableEntityEvents,
> extends ShootableEntity<E> {
	protected readonly animation: AnimationController;

	protected constructor(
		readonly rig: Object3D,
		clips: RigAnimationClips,
		hitboxTemplate: Object3D,
		animationFps = 24,
	) {
		super();
		this.add(rig);
		this.animation = new AnimationController(
			new AnimationMixer(rig),
			indexClips(clips),
			animationFps,
		);
		this.setupHitboxes(hitboxTemplate);
	}

	override update(delta: number): void {
		if (!this.isRagdoll) this.animation.update(delta);
		super.update(delta);
	}
}
