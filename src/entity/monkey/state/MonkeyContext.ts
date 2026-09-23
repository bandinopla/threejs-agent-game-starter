import type { Object3D, SkinnedMesh } from "three"
import type { AudioEmitterObject } from "../../../sounds/envAudio"
import type { AnimationController } from "../../../animation/AnimationController"
import type { PathGraph } from "../../../ai/PathFinding"
import type { Entity } from "../../Entity"
import type { Revolver } from "../Revolver"
import type { MonkeyMaterial } from "../MonkeyMaterial"
import type RAPIER from "@dimforge/rapier3d"

export type MonkeyContext = {
	isWorker:boolean
	hammerMc:Object3D
	revolverMc:Object3D
	hatMc:Object3D
	mesh:SkinnedMesh
	torso:Object3D
	entity:Entity
	revolver:Revolver
	speed:number
	rigidBody:RAPIER.RigidBody|undefined;

	audioEmitter: {
		hammer:AudioEmitterObject 
		voice:AudioEmitterObject
	},

	anim:AnimationController,
	pathFinder:PathGraph

	target?:Object3D,

	maxShootDistance:number,
	currentShootDistance:number,
	material:MonkeyMaterial
	dispose:VoidFunction
}
