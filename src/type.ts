import type { PerspectiveCamera, Scene } from "three";
import type { WebGPURenderer } from "three/webgpu";

export type AppBuilder = ( renderer:WebGPURenderer, scene:Scene, camera:PerspectiveCamera)=>Promise<(delta:number)=>void|true>