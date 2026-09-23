import { Object3D } from "three";
import { TextMesh } from "./TextMesh";
import { $lang } from "../i18n/i18n";

export class DisclaimerScreen extends Object3D {
	constructor() {
		super();
		const text = new TextMesh(
			$lang("disclaimer"),
			80,
			"white",
			true
		)
		this.add(text);
		text.position.set(0,0,0);
		text.scale.setScalar(0.1)
	}
}