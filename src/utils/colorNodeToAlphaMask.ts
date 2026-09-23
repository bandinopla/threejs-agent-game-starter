import { max, step } from "three/tsl";
import type { Node } from "three/webgpu";

export function colorNodeToAlphaMask( colorNode:Node<"vec4"> ) {
	return step(0.3, max(colorNode.r, max(colorNode.g, colorNode.b)));
}