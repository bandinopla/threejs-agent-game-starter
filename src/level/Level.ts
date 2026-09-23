import { Group, InstancedMesh, LinearFilter, Matrix4, Mesh, MeshPhysicalMaterial, NoColorSpace, Object3D, Raycaster, SRGBColorSpace, Vector3 } from "three";
import type { HitInfo, IRaycastSolver } from "./IRaycastSolver";
import { Layers } from "./Layers";
import { setupGraffitiMaterial } from "./setupGraffitiMaterial";
import { mergeUniqueMeshesByMaterial } from "../utils/mergeByMaterial";
import { AmbientSound } from "./AmbientSound";
import { SignsCaptionsManager } from "./SignsCaptionsManager";
 
const v = new Vector3();
//const spreadV = new Vector3();
const instanceMatrix = new Matrix4();

export class Level extends Group implements IRaycastSolver {
	onLevelIntantianted?:VoidFunction;
	private raycaster:Raycaster;
	readonly signsReader:SignsCaptionsManager;

	constructor( assets:Group, useInstancedMesh = true ) {
		super() 

		this.raycaster = new Raycaster(); 
 
		this.signsReader = new SignsCaptionsManager( assets );
		this.add(this.signsReader);

		let prefabs = new Map<string, Object3D>();
		let imeshes = new Map<Mesh, Object3D[]>();

		mergeUniqueMeshesByMaterial(assets, obj=>{
			if( obj.name.startsWith("grafiti-") )
			{
				return setupGraffitiMaterial( obj.material as MeshPhysicalMaterial )
			}
		});

		// collect prefabs
		assets.traverse((child) => {
			const prefabName = child.userData.prefab
			if ( prefabName ) {
				prefabs.set(prefabName, child)  
				console.log("Found prefab:", prefabName)
			}
 

			// if( child.name.startsWith("grafiti-") && child instanceof Mesh  )
			// { 
			// 	console.log("GRAFITI", child)
			// 	child.material = setupGraffitiMaterial( child.material )
			// }

			if( child instanceof Mesh )
			{
				child.castShadow = true;
				child.receiveShadow = true;
			}

			if( child.userData.atlas )
			{
				child.visible = false;
			}
		});

		// remove prefabs from parent
		prefabs.forEach(prefab => {
			prefab.removeFromParent();
		})

		const getPrefabInstanceName = (obj:Object3D) => {
		 
			const pname = obj.name.includes("-prefab") ? obj.name.replace(/-prefab.*/, "") : null
			return pname && prefabs.has(pname) ? pname : null
		}

		const instantiateMesh = ( template:Mesh, parent:Object3D ) => {
			if( useInstancedMesh )
			{
				const instance = new Object3D();

				if( imeshes.has( template ))
				{
					imeshes.get( template)!.push(instance);
				}
				else
				{
					imeshes.set( template, [ instance] );
				}

				parent.add(instance)
			}
			else 
			{
				const mesh = template.clone(); 
				mesh.receiveShadow = true;
				mesh.castShadow = true;
				this.setupMaterial(mesh.material as any)
				
				parent.add(mesh); 
			}

			if( template.children.length )
			{
				instantiate(template.children, parent);
			}
		} 

		const instantiate = (children:Object3D[], parent?:Object3D) => {
			 
			for (const child of children) {
				const instance = new Object3D();
				const prefabName = getPrefabInstanceName(child)
				
				if( prefabName=="Loza")
				{
					//console.log("Loza parent", parent )
				}

				instance.position.copy(child.position);
				instance.rotation.copy(child.rotation);
				instance.scale.copy(child.scale);

				(parent ?? this).add(instance)

				const udata = child.userData;
				if( udata )
				{
					instance.userData = { ...udata };
					delete instance.userData.prefab;
				}

				if ( child.children.length > 0 ){
					instantiate(child.children, instance);
				}

				// is a prefab instance...
				if( prefabName ){ 

					// if( prefabName.startsWith("Corner")) {
					// 	const ax = new AxesHelper(1) 
					// 	instance.add(ax)
					// }

					const prefab = prefabs.get(prefabName)

					if( prefab ){
 

						instance.userData.instanceOf = prefab; 
						
						const prefabRoot = new Object3D()
							  prefabRoot.position.copy(prefab.position)
							  prefabRoot.rotation.copy(prefab.rotation)
							  prefabRoot.scale.copy(prefab.scale)

						instance.add(prefabRoot)
						

						if( prefab instanceof Mesh ){

							instantiateMesh( prefab, prefabRoot );
							
						}
						else
						{ 
							instantiate(prefab.children, prefabRoot)
						}
					} 
				}
				else if( child instanceof Mesh )
				{
					if( child.userData.unique )
					{ 
						// nothing...
						this.add(child.clone())
					}
					else 
					{
						instantiateMesh( child, instance );
					}
					
				}
				
				
			}
		}

		instantiate(assets.children.filter(child=>child.name.includes("-prefab"))) ;
	 

		//add the rest
		this.add(assets); 
		
		requestAnimationFrame(()=>{ 
 

			this.createInstancedMeshes(imeshes)
			//this.createBatchedMeshes(imeshes)
			

			this.setupAmbientSounds();
			this.onLevelIntantianted?.(); 
		})

		
	} 
	

	private createInstancedMeshes( imeshes:Map<Mesh, Object3D[]> ){
		// create imeshes
			for( const [template, instances] of imeshes.entries() ){
  

				//console.log("New instanced mesh created with material:", template.material.name,  " has ", instances.length, " instances")

				const material = template.material as MeshPhysicalMaterial;
				if( material.normalMap )
				{
					material.normalMap.colorSpace = NoColorSpace;
				}

				const imesh = new InstancedMesh(template.geometry, template.material, instances.length)
				this.setupMaterial(template.material as MeshPhysicalMaterial)
				///imesh.material = new MeshPhysicalMaterial({color:0xff0000, side:DoubleSide})
				this.add(imesh)
				imesh.castShadow = true;
				imesh.receiveShadow = true;
				imesh.layers.enable(Layers.WALLS);
				
				//imesh.frustumCulled = false; 
				
				for( let i = 0; i < instances.length; i++ ){
					const instance = instances[i] ;
					const instanceID = i;

					instance.userData.syncInstance = ()=>{
						instance.updateMatrixWorld(true)
						imesh.setMatrixAt(instanceID, instance.matrixWorld)
					}

					instance.userData.syncInstance() 
				} 
					
			}
	}

	private setupMaterial( material:MeshPhysicalMaterial ) {
		if( material.map )
		{
			material.map.colorSpace = SRGBColorSpace;
			material.map.minFilter = LinearFilter;
			material.map.magFilter = LinearFilter;
			material.map.needsUpdate = true; 
			material.map.generateMipmaps = true;
		}

		material.metalness = 0
		material.roughness = .8

		if( material.normalMap )
		{
			material.normalMap.colorSpace = NoColorSpace;	
			material.normalMap.minFilter = LinearFilter;
			material.normalMap.magFilter = LinearFilter;
			material.normalMap.needsUpdate = true; 
			//material.normalMap.generateMipmaps = true;
		}

		if( material.roughnessMap )
		{
			material.roughnessMap.colorSpace = NoColorSpace;
			material.roughnessMap.minFilter = LinearFilter;
			material.roughnessMap.magFilter = LinearFilter;
			material.roughnessMap.needsUpdate = true; 
			//material.roughnessMap.generateMipmaps = true;
		}
	}

	private setupAmbientSounds() {
	
		this.traverse((child) => {
			if( child.userData?.spawn=="skeleton" ){
				child.add(new AmbientSound("silence-loop", 2, 0.5))
			}
		})
		
	}

	shootRay( origin:Vector3, direction:Vector3, layerMask?:number ):HitInfo | null {

		this.raycaster.set(origin, direction);

		this.raycaster.layers.disableAll();
		
		if( layerMask )
		{ 
			this.raycaster.layers.mask = layerMask;
		}
		else
		{
			this.raycaster.layers.enable(Layers.SHOOTABLE);
			this.raycaster.layers.enable(Layers.WALLS);
			this.raycaster.layers.enable(Layers.PLAYER_HITBOX);
		}

		const hit = this.raycaster.intersectObjects(this.children, true);
		if( hit.length ){
 
 
			const position = hit[0].point; 
			const obj = hit[0].object;
			
			if( (obj as any).material?.userData?.hole ) return null;
			
			let normal = v.copy(hit[0].normal!);

			

			if (obj instanceof InstancedMesh && hit[0].instanceId !== undefined) {
				obj.getMatrixAt(hit[0].instanceId, instanceMatrix);
				normal = normal.transformDirection(instanceMatrix);
			} else {
				normal = normal.transformDirection(obj.matrixWorld);
			}

			return {
				point:position,
				normal,
				object:obj,
				distance:hit[0].distance
			}
		}
		return null
	}
 
	 
}