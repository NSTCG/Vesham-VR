import {Component, CollisionComponent, Object3D, TextComponent} from '@wonderlandengine/api';
import {property} from '@wonderlandengine/api/decorators.js';
import {AudioSource} from '@wonderlandengine/spatial-audio';

/**
 * collisionTest
 */
export class CollisionTest extends Component {
    static TypeName = 'collisionTest';

    /* Properties that are configurable in the editor */
    @property.object()
    leftHand!: Object3D;

    @property.object()
    rightHand!: Object3D;

    @property.object()
    leftText!: Object3D;

    @property.object()
    rightText!: Object3D;

    @property.audioClip()
    successAudio!: string; // string for audioClip source in WLE? No, property type handles it. Wait, button.js treated it as property object to get source. 

    private rightCollisionComp: CollisionComponent | null = null;
    private leftCollisionComp: CollisionComponent | null = null;
    
    private currentLeftMudra: string | null = null;
    private currentRightMudra: string | null = null;
    
    private targetMudra: string = "";
    private mudraOptions: string[] = ["Pathaka", "Mushti", "Ardhachandram"];

    private soundSuccess: AudioSource | null = null;

    start() {
        if (this.leftHand) {
            this.leftCollisionComp = this.leftHand.getComponent(CollisionComponent);
        }
        if (this.rightHand) {
            this.rightCollisionComp = this.rightHand.getComponent(CollisionComponent);
        }

        if (this.successAudio) {
            this.soundSuccess = this.object.addComponent(AudioSource, {
                src: this.successAudio,
                hrtf: true,
            });
        }

        this.setNewTarget();
    }

    update(dt: number) {
        if (this.leftCollisionComp) {
            this.currentLeftMudra = this.detectMudra(this.leftCollisionComp);
        }
        if (this.rightCollisionComp) {
            this.currentRightMudra = this.detectMudra(this.rightCollisionComp);
        }

        // Logic: if both hands match target, win.
        if (this.currentLeftMudra === this.targetMudra && this.currentRightMudra === this.targetMudra) {
            console.log("WIN! Both hands matched:", this.targetMudra);
            if (this.soundSuccess) {
                this.soundSuccess.play();
            }
            this.setNewTarget();
        }
    }

    private setNewTarget() {
        const randomIndex = Math.floor(Math.random() * this.mudraOptions.length);
        this.targetMudra = this.mudraOptions[randomIndex];
        console.log("New Target:", this.targetMudra);

        this.updateText(this.leftText, this.targetMudra);
        this.updateText(this.rightText, this.targetMudra);
    }

    private updateText(obj: Object3D, text: string) {
        if (!obj) return;
        const textComp = obj.getComponent('text') as TextComponent;
        if (textComp) {
            textComp.text = text;
        }
    }

    private detectMudra(comp: CollisionComponent): string | null {
        const overlaps = comp.queryOverlaps();
        const collisions = [0, 0, 0, 0, 0]; // thumb, index, middle, ring, pinky

        for (const other of overlaps) {
            const name = other.object.name.toLowerCase();
            if (name.includes('thumb')) collisions[0] = 1;
            if (name.includes('index')) collisions[1] = 1;
            if (name.includes('middle')) collisions[2] = 1;
            if (name.includes('ring')) collisions[3] = 1;
            if (name.includes('pinky')) collisions[4] = 1;
        }

        const pattern = collisions.join('');
        if (pattern === "00010") return "Pathaka";
        if (pattern === "11111") return "Mushti";
        if (pattern === "00111") return "Ardhachandram";
        
        return null;
    }
}
