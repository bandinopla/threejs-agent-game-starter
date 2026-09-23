# GLB export and optimization

Runtime 3D assets must pass through `optimize.js`. Exporting a GLB from Blender is only the first half of the asset pipeline; the game does not load the raw file from `3d/`.

```text
3d/<name>.blend
    ↓ export from Blender
3d/<name>.glb
    ↓ node optimize.js <name>
public/<name>.packed.glb
    ↓ loaded by GLTFLoader
game runtime
```

For example:

```bash
node optimize.js level
```

The argument is the asset basename without `.glb`. This command reads `3d/level.glb` and overwrites `public/level.packed.glb`.

The main runtime assets currently follow the same contract:

| Blender export | Optimizer command | Runtime file |
| --- | --- | --- |
| `3d/level.glb` | `node optimize.js level` | `public/level.packed.glb` |
| `3d/gnome.glb` | `node optimize.js gnome` | `public/gnome.packed.glb` |
| `3d/monkey.glb` | `node optimize.js monkey` | `public/monkey.packed.glb` |
| `3d/ui.glb` | `node optimize.js ui` | `public/ui.packed.glb` |
| `3d/rat.glb` | `node optimize.js rat` | `public/rat.packed.glb` |

`src/gnome-vs-monkeys.ts` loads the files in the rightmost column. A newer raw GLB in `3d/` has no effect on the running game until the packed file is regenerated.

## What `optimize.js` does

The script:

1. Reads `3d/<name>.glb` with glTF-Transform.
2. Scans top-level scene nodes for texture-atlas metadata.
3. Builds color, normal, and metallic/roughness atlases and remaps mesh UVs and materials to those atlases.
4. Compresses generated atlases and remaining textures to KTX2.
5. Resamples animation tracks.
6. Applies Draco mesh compression.
7. Writes the self-contained optimized result to `public/<name>.packed.glb` and reports the size reduction.

The script currently does not run mesh simplification. Its simplification pass is deliberately commented out because it damages the authored assets.

## Atlas behavior

Only top-level nodes with an `atlas` custom property are treated as atlas definitions. Related properties are:

| Property | Default | Meaning |
| --- | --- | --- |
| `atlas` | required | Atlas and generated material name. |
| `size` | `1024` | Base-color atlas size. Normal and metallic/roughness atlases use half size, rounded to a power of two. |
| `sharp` | `false` | Uses higher-quality UASTC compression for the color atlas when true; otherwise BasisLZ is used. |
| `alpha` | `false` | Generates an alpha-capable color atlas and masked material. |

See [`texture-atlas.md`](texture-atlas.md) for the Blender layout and UV authoring contract.

## Requirements

- Install JavaScript dependencies with `pnpm install`.
- Install the Khronos KTX command-line tools and ensure the `ktx` executable is on `PATH`.
- Export a binary `.glb`, not a textual `.gltf`.
- Preserve custom properties during export because runtime level behavior and atlas processing depend on them.
- Use the export visibility/settings required by the specific asset. For example, most world assets export visible objects, while the UI may require all authored UI objects.

If `ktx` is missing, texture conversion fails and no valid packed asset is produced.

## Required workflow after a Blender change

1. Save the authoritative `.blend` and its external source images under `3d/`.
2. Export the intended scene to `3d/<name>.glb`.
3. Run `node optimize.js <name>` from the repository root.
4. Confirm the command ends with `Written: public/<name>.packed.glb` and a size-reduction summary.
5. Confirm the packed file is newer than the raw export.
6. Start or restart the development server and exercise the affected game flow.
7. Check the browser console for GLTF, Draco, or KTX2 loading failures and visually verify meshes, materials, animations, custom properties, and atlas UVs.

This optimization step is mandatory whenever an exported GLB changes. Do not work around it by changing runtime code to load `3d/<name>.glb` or by renaming the raw export to `.packed.glb`.

## How agents should explain this to users

When a user changes a Blender asset or asks why their export is not visible, explain the two-stage pipeline plainly:

> Blender exports the editable asset to `3d/<name>.glb`. The game intentionally loads only `public/<name>.packed.glb`, so run `node optimize.js <name>` after every export. The script packs atlas textures, converts textures to KTX2, compresses meshes with Draco, resamples animations, and writes the runtime-ready file into `public/`.

Always name the concrete input, command, and output for the asset being discussed. If an asset change is part of an implementation task, regenerate the packed GLB when the required KTX tools are available; otherwise report that exact pending step rather than claiming the raw export is integrated.

## Common mistakes

- Passing a filename or extension: use `node optimize.js monkey`, not `node optimize.js monkey.glb`.
- Exporting somewhere other than `3d/`.
- Testing without regenerating `public/<name>.packed.glb`.
- Running the optimizer from a different working directory.
- Missing the `ktx` executable.
- Omitting Blender custom properties from the export.
- Expecting atlas guide nodes nested below another root to be discovered; atlas definitions must be top-level scene nodes.
