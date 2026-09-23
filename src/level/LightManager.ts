import { Object3D, Quaternion, Vector3, type SpotLight } from "three";

/**
 * Owns the single expensive, shadow-casting spotlight shared by cutscenes.
 *
 * The light normally belongs to the gameplay camera. A cutscene borrows it by
 * calling `borrow()`, then invokes the returned callback when it is finished.
 * This keeps the temporary placement and restoration paired at the call site.
 */
export class LightManager {
	private _light: SpotLight | null = null;
	private readonly homePosition = new Vector3();
	private readonly homeRotation = new Quaternion();
	private readonly homeTargetPosition = new Vector3();
	private homeParent: Object3D | null = null;
	private homeTargetParent: Object3D | null = null;
	private homeIntensity = 1;
	private activeBorrow: symbol | null = null;

	/** Records where the light should return after every temporary use. */
	setLight(light: SpotLight) {
		this._light = light;
		this.homePosition.copy(light.position);
		this.homeRotation.copy(light.quaternion);
		this.homeTargetPosition.copy(light.target.position);
		this.homeParent = light.parent;
		this.homeTargetParent = light.target.parent;
		this.homeIntensity = light.intensity;
		this.activeBorrow = null;
	}

	get light() {
		return this._light;
	}

	/** Immediately returns the shared light to its recorded gameplay placement. */
	restore() {
		if (!this._light || !this.homeParent || !this.homeTargetParent) return;

		this.homeParent.add(this._light);
		this.homeTargetParent.add(this._light.target);
		this._light.position.copy(this.homePosition);
		this._light.quaternion.copy(this.homeRotation);
		this._light.target.position.copy(this.homeTargetPosition);
		this._light.intensity = this.homeIntensity;
		this.activeBorrow = null;
	}

	/**
	 * Temporarily attaches the shared light to `anchor`.
	 * Returns an idempotent release callback which restores its home placement.
	 */
	borrow(anchor: Object3D, intensity = 1): VoidFunction {
		if (!this._light) {
			throw new Error("LightManager.setLight() must be called before borrow().");
		}

		// There can only be one borrower. Restore first if a scene forgot to release.
		if (this.activeBorrow) this.restore();

		const borrowId = Symbol("spotlight-borrow");
		this.activeBorrow = borrowId;
		anchor.add(this._light);
		anchor.add(this._light.target);

		this._light.position.set(0, 0, 0);
		this._light.quaternion.identity();
		this._light.target.position.set(0, 0, -5);
		this._light.intensity = intensity;

		return () => {
			// Ignore duplicate releases and releases from an older cutscene.
			if (this.activeBorrow === borrowId) this.restore();
		};
	}
}

export const lightManager = new LightManager();
