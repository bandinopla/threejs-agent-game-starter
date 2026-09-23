import { Object3D, PointLight, SpotLight, type PerspectiveCamera } from "three";

export class LightsManager extends Object3D {
    private lights: SpotLight[] = [];
    private lightSources: Object3D[] = [];
    private camera: PerspectiveCamera; 

    constructor(maxCount: number, camera: PerspectiveCamera, readonly radius: number = 100) {
        super();
        this.camera = camera;
        for (let i = 0; i < maxCount; i++) {
            const light = new SpotLight(0xffffff, 12, 11, 1.23, 0.3, 0.8);
            light.position.set(0, 0, 0);
			light.rotateX(Math.PI );
            light.castShadow = true;
            light.shadow.mapSize.width = 1024 / 3;
            light.shadow.mapSize.height = 1024 / 3;
            light.shadow.camera.near = 0.1;
            light.shadow.camera.far = 1;
            light.shadow.bias = -0.003;
            // light.shadow.camera.updateProjectionMatrix();
            light.visible = false;
            this.add(light);
            this.add(light.target);
            this.lights.push(light);
        }
    }

    addLight(lightSource: Object3D) {
        this.lightSources.push(lightSource);
    }

    update() {
        // Gather sources within radius, sorted by distance
        const camPos = this.camera.position;
        const inRange = this.lightSources
            .map(src => ({ src, dist: camPos.distanceTo(src.getWorldPosition(src.position.clone())) }))
            .filter(e => e.dist <= this.radius)
            .sort((a, b) => a.dist - b.dist);

        // Assign lights to closest sources
        this.lights.forEach((light, i) => {
            if (i < inRange.length) {
                light.position.copy(inRange[i].src.getWorldPosition(inRange[i].src.position.clone()));
light.position.y -= 0.1
				light.target.position.copy(light.position);
				light.target.position.y-=.1
                light.visible = true;
            } else {
                light.visible = false;
            }
        });
    }
}