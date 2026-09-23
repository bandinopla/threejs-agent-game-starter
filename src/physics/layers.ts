export const $collisionLayers =  {
	player : 0,
	walls : 1,

	ragdollTorso : 5,
	ragdollArmL : 6,
	ragdollArmR : 7,
	ragdollLegL : 8,
	ragdollLegR : 9, 
	ragdollHead : 10,

	ragdoll: [-1]
} ;

$collisionLayers.ragdoll = [
		$collisionLayers.ragdollTorso,
		$collisionLayers.ragdollArmL,
		$collisionLayers.ragdollArmR,
		$collisionLayers.ragdollLegL,
		$collisionLayers.ragdollLegR,
		$collisionLayers.ragdollHead
]
 