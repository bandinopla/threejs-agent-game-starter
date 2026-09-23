import { TextureLoader, type Scene } from "three";
import { DICTIONARIES } from "../../i18n/i18n";
import { StaticTextAtlas, TextAtlas } from "./TextAtlas";
import { TextMesh } from "./TextMesh";

export function generateTextAtlas(scene: Scene) {
    const allText = Object.values(DICTIONARIES)
        .flatMap((d) => Object.values(d))
        .join("");

    // collect unique letters
    const uniqueLetters = Array.from(new Set(allText)).sort();

    const atlas = new TextAtlas(34, 1024, uniqueLetters.join(""));

    atlas.downloadAtlasPNG("font_atlas.png");
    atlas.downloadGlyphsJSON("font_atlas.json");
}

export async function textTextAtlas(scene: Scene) {
    const [texture, glyphs] = await Promise.all([
        new TextureLoader().loadAsync("font_atlas.png"),
        fetch("font_atlas.json").then((r) => r.json()),
    ]);

    const atlas = new StaticTextAtlas(texture, glyphs,13);
    const textCenter = new TextMesh(
        atlas,
        "Funcio\nó!!!~ \nDos lineas 日本語",
        "center",
        0xffffff, // text color (cyan)
        0x333333,
        1,
        1,
    );
    textCenter.position.set(0, 1.5, 0);

    scene.add(textCenter);
}
