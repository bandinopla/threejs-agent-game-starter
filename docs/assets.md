# The assets
the game uses a few glb files containing models, textures and animations and a sound atlas file. All compressed using KTX2 and Draco. The assets are loaded in parallel using Promise.all. The game is light, everything is 4.4Mb including sounds. 

For the Blender-to-runtime level contract, including prefabs, custom properties, colliders, and spawn markers, read [Blender level authoring](blender-authoring.md).

## The assets
- ui.packed.glb: contains the ui elements, buttons, windows, cursor, etc.
- level.packed.glb: the level geometry and the prefab hierarchy.
- gnome.packed.glb: the gnome model and animations.
- monkey.packed.glb: the monkey models and animations.
- rat.packed.glb: the game intro cutscene assets ( rat, desk, chair, etc.)

When authoring them in blender, some have diferent export settings, for example, the ui will export everything into glb, but the rest will only export visible objects. 

## Compression

The assets are authored in Blender and exported as GLBs into `3d/`. Every exported runtime GLB must then be processed with `node optimize.js <name>`. The game loads only `public/<name>.packed.glb`, so this step is mandatory rather than optional. See [GLB export and optimization](glb-optimization.md) for the complete workflow, requirements, verification steps, and troubleshooting guidance.

The textures are compressed using KTX2, and the script scans top-level objects with `userData.atlas` to create the [texture atlas](texture-atlas.md) automatically.
KTX2 has 2 flavors:

- uastc : used if the atlas has userData.sharp = true to make the image sharper and will look better but will be heavyer.
- etc2 : used if the atlas has userData.sharp = false to make the image lighter and will look worse. This is the default.
 
Then after the atlases are created, any remaining textures are compressed using KTX2 with the default settings. 
