import {EditorPlugin, ui, data} from "@wonderlandengine/editor-api";

export default class MaterialModifier extends EditorPlugin {
    name = "MaterialModifier";

    draw() {
        if (ui.button("Set GlobalFog")) {
            this.setGlobalFog();
        }
    }

    setGlobalFog() {
        for (const mat of data.materials) {
            mat[1].Physical.fogColor = [50/225, 101/225, 113/225, 0.1]; //rgba(50, 101, 113)
            //mat[1].Phong.fogColor = [1, 1, 1, 0.1]; // you can add this if you use Phong as well
        }
    }
}