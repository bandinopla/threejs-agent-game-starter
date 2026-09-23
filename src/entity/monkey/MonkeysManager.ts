import { Box3, Frustum, Object3D, PerspectiveCamera, Vector3 } from "three";
import type { GLTF } from "three/examples/jsm/Addons.js";
import type { PathGraph } from "../../ai/PathFinding";
import type { PhysicsScene } from "../../physics/PhysicsScene";
import { updatables, type IUpdatable } from "../../IUpdatable";
import type { Entity } from "../Entity";
import { Monkey } from "./Monkey";
import { $events } from "../../events/events";
import { MonkeyWorker } from "./MonkeyWorker";
import { separateObjects } from "../../utils/separateObjects";

// these vars refer to how much will be visible / instantiated
// ideally they will be spread out so their objects can be reused.
const MAX_WORKERS = 2;
const MAX_CHASERS = 3;


const v = new Vector3();
const boxSize = new Vector3(1,1,1);


/**
 * In charge of handling the spawning of monkeys
 * There are 2 types of monkeys:
 * - workers: they make the noise ( spawn at fixed location and don't move )
 * - chasers: they chase the player + shoot + and respawn after they die
 * 
 * chasers spawn a few seconds after they die, workers don't respawn
 */
export class MonkeysManager extends Object3D implements IUpdatable {
	readonly workers:Monkey[] = [];
	readonly chasers:Monkey[] = [];
	private t = 0;
	private removeUpdatable:VoidFunction|undefined;
	private _started:boolean; 

	private workerTooFarDistance = 16;

	private _checkDistancesInterval = .2;
	private _checkDistancesTime = 0;

	onWorkerAdded?:(worker:MonkeyWorker)=>void;
 

	private _spawnChaserTime = 0;
	private _spawnChaserInterval = 5;


	private spawn2distance:Map<Object3D, number> = new Map();
	private _spanws:Object3D[];
	private closestToPlayer: (a:Object3D, b:Object3D)=>number;
	private frustum = new Frustum();
	private spawnBox = new Box3();
	private currentMaxChasers = 0;
	private chasersAlive = 0;
	private workersAlive = 0;

	/** 
	 * When this is true we start checking the time to respawn a chaser
	 * This is set to true when a chaser dies or when the game allows the spawning of enemies
	*/
	private _countingToRespawn = false;

	constructor( private camera:PerspectiveCamera, root:Object3D, physicsScene:PhysicsScene, private player:Entity, monkeyScene:GLTF, private pathFinder:PathGraph, private chasersSpawns:Object3D[], private workersSpawns:Object3D[] ) {
		super();

		//
		// create the monkeys
		//
		const total = MAX_WORKERS + MAX_CHASERS;
		for( let i = 0; i < total; i++ ) {
		
			const isWorker = i < MAX_WORKERS;
			const monkey = new Monkey( monkeyScene.scene , monkeyScene.animations, pathFinder, isWorker);
			monkey.physicsScene = physicsScene;
			
			if( isWorker ) {
				this.workers.push(monkey); 
			} else {
				this.chasers.push(monkey);

				monkey.skinType = "enemy";
				monkey.events.addEventListener("gotShot", ()=>{
					this.chasersAlive--; 
					this.checkEndOfGame();
				});
			}  

			this.add(monkey);
		} 

		$events.addEventListener("startGame", this.start.bind(this));
		$events.addEventListener("startIntro", this.start.bind(this));

		this._spanws = [...chasersSpawns, ...workersSpawns];

		this.closestToPlayer = (a, b)=>{
			return this.spawn2distance.get(a)! - this.spawn2distance.get(b)!;
		};

		workersSpawns.forEach( (spawn, i)=>{

			const worker = new MonkeyWorker(spawn, i, player); 
			spawn.userData.worker = worker; 
			this.onWorkerAdded?.(worker);

			//
			// when a worker dies, add one extra chaser
			//
			worker.addEventListener("isDead", ev => {

				 
				if( this.currentMaxChasers==0 )
				{ 
					$events.dispatchEvent({
						type:"firstKill"
					});
				}
				else 
				{
					this.currentMaxChasers = Math.min(MAX_CHASERS, this.currentMaxChasers + 1);
				} 
 
				if( --this.workersAlive <= 0 )
				{  
					$events.dispatchEvent({
						type:"allWorkersDead"
					});
				}

				this.checkEndOfGame();

			});
			
		}); 

		$events.addEventListener("startSpawningEnemies", ev => {
			this.currentMaxChasers = 1; 
			this._spawnChaserTime = 0;
		});

		$events.addEventListener("playerDied", ev => {
			this.currentMaxChasers = 0; 
			this._spawnChaserTime = 0;
		});


		$events.addEventListener("reset", this.reset.bind(this));
 
	}

	get workerMonkeys() {
		return this.workersSpawns.map( spawn => spawn.userData.worker as MonkeyWorker );
	}

	start() {  
		
		if( this._started ) return;
		this._started = true; 
 

		this.spawn2distance.clear();
		this._countingToRespawn = false;
		this.chasersAlive = 0;
		this.currentMaxChasers = 0;
		this._checkDistancesTime = this._checkDistancesInterval; 
		this.removeUpdatable = updatables.add(this);

		this.workersAlive = this.workersSpawns.length;
		this.workersSpawns.forEach( (spawn)=>{
			const worker = spawn.userData.worker as MonkeyWorker;
			worker.start(); 
		});
	}

	stop() { 
		this._started = false;
		this.removeUpdatable?.();
		this.removeUpdatable = undefined;

		this.workersSpawns.forEach( (spawn)=>{
			const worker = spawn.userData.worker as MonkeyWorker;
			worker.stop(); 
		});
	}

	reset() {
		this.stop();

		this.workersSpawns.forEach( (spawn)=>{
			const worker = spawn.userData.worker as MonkeyWorker;
			worker.reset(); 
		});
 
	}

	update(dt:number) { 

		for( let i=0; i<this.workersSpawns.length; i++ ) { 
			this.workersSpawns[i].userData.worker.update(dt); 
		}

		// check distances
		this._checkDistancesTime += dt;

		if( this._checkDistancesTime >= this._checkDistancesInterval ) {

			this._checkDistancesTime = 0;

			for( const spawn of this._spanws ) { 
				spawn.getWorldPosition(v);
				const dist = v.distanceTo(this.player.position);
				this.spawn2distance.set(spawn, dist);
			} 

			//
			// check if we need to spawn a monkey
			//
			this._spanws.sort(this.closestToPlayer);

			//
			// check worker visibility ( add worker if player inside radius and remove it if outside )
			//
			let active = 0;

			for( const spawn of this._spanws ) {
				const worker = spawn.userData.worker as MonkeyWorker;

				if(!worker) continue;

				const dist = this.spawn2distance.get(spawn)!;
				const isNearPlayer = dist < this.workerTooFarDistance;

				worker.isNearPlayer = isNearPlayer;

				if( worker.monkey ) { 

					//
					// too far away from player
					//
					if( !isNearPlayer ) {
						//console.log("REMOVING WORKER")
						worker.monkey = undefined;
					}
					else 
					{
						active++
					}
					
				}
				else if( active < MAX_WORKERS ) {

					if( isNearPlayer )
					{
						worker.monkey = this.workers.find( monkey=>!monkey.visible ); 

						if( worker.monkey )
						{ 
							this.add(worker.monkey!); 
							worker.monkey.start();
							active++;
						}
						else 
						{
							console.warn("NO MONKEY AVAILABLE!!!!");
						}
					} 
					
				}
			} 
		}; 
			
		//
		// *** SPAWN ENEMY ***
		// chasers if there are still workers alive - look for the closes spawn point that is not near the player
		//
		if( this.currentMaxChasers>0 )
		{ 
			this._spawnChaserTime += dt;

			if( this.workersAlive>0 && (this._spawnChaserTime >= this._spawnChaserInterval) ) {
				this._spawnChaserTime = 0;    
				//
				// set frustum
				//
				this.frustum.setFromProjectionMatrix(
					this.camera.projectionMatrix.clone().multiply(this.camera.matrixWorldInverse)
				);

				for( const spawn of this._spanws ) {

					if( this.chasersAlive >= this.currentMaxChasers ) {
						break;
					}

					const dist = this.spawn2distance.get(spawn)!;
					if( dist < 20 ) continue;
					

					const isEnemySpawn = !spawn.userData.worker;
					if( !isEnemySpawn ) continue;
	 
					spawn.getWorldPosition(v);

					this.spawnBox.setFromCenterAndSize(v, boxSize);

					//
					// if is in the visible area of camera, ignore
					//
					if( this.frustum.intersectsBox(this.spawnBox) ) continue; 

					

					const chaser = this.chasers.find( chaser=>!chaser.visible );
					if( chaser ) {

						spawn.getWorldPosition( chaser.position );
						spawn.getWorldQuaternion( chaser.quaternion );
						
						chaser.target = this.player; 

						this.add(chaser);
						chaser.start(); 

						this.chasersAlive++;   
					}

				} 
	 
			}
		}
			
		//
		// keep monkeys from colliding with each other
		//  
		separateObjects(this.chasers, .4); 
	}

	private checkEndOfGame() {
		if( this.chasersAlive <= 0 && this.workersAlive <= 0 ) {
			$events.dispatchEvent({
				type:"allMonkeysAreDead"
			});
		}
	}
}