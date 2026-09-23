import { Layers as ThreeLayers } from "three";

export const Layers = {
	WALLS:3,
	SHOOTABLE:4,
	PLAYER_HITBOX:5	
}

export const OnlyWallsLayer = new ThreeLayers();
OnlyWallsLayer.disableAll();
OnlyWallsLayer.enable(Layers.WALLS);