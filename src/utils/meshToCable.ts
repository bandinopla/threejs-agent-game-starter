import { CatmullRomCurve3, TubeGeometry, Vector3, type Mesh } from "three";

export function meshesToCables(meshes: Mesh[], radius = 0.01, tubularSegments = 10, radialSegments = 3) {
  meshes.forEach(mesh => {
    const positions = mesh.geometry.attributes.position;
    const points: Vector3[] = [];

    for (let i = 0; i < positions.count; i++) {
      points.push(new Vector3().fromBufferAttribute(positions, i));
    }

    const curve = new CatmullRomCurve3(points);
    mesh.geometry.dispose();
    mesh.geometry = new TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
  });
}