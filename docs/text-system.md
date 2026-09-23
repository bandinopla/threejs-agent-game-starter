# Text system
To display text, we use a system based on an InstancedMesh that positions quads one next to each other per each letter using an atlas texture containing all the glyphs for the font. 

Anytime the languages dictionary changes, one must re-create the fonts atlas. This is done by running `main.ts` toggling the block comments to activate the line `generateTextAtlas(scene)` and running `pnpm run dev`. That will create the new glyphs atlas and trigger 2 downloads:

- A json file: metadata for each glyph, should be saved in src/ui/text/font_atlas.json
- A png file: the atlas texture, should be saved in public/font_atlas.png

## Initializing 
No initialize the text system TextMesh.initialize() is called with the texture to be used as the font atlas. It will automatically import and use the previously mentioned files.

Then, in any scene where you want to use text, you will add "TextMesh.atlas" to the scene. This is the InstancedMesh. And to create text you will use a proxy object TextMesh imported from src/ui/TextMesh.ts. That object serves as guide for positioning and size for the instanced mesh instance. It will update the appropiate one. 

To hide text you call the .hidden = true property on the TextMesh instance. To show it again, set it to false. 

It is important to remember that the letters are quads from the instanced mesh. So they live wherever the instanced mesh lives. And if you change the text like in an animation, you must set it as dirty so the system updates the instance matrix: textInstance.dirty = true;

## Text rendering
The TextMesh.initialize creates a SharedTextInstancedMesh object that on it's own .onBeforeRender will scan it's registered TextMesh objects, check if they are visible and in scene, and if they are dirty, it will update the instance matrix and the glyph rects and colors attributes. 