import {Component, Object3D} from '@wonderlandengine/api';
import {property} from '@wonderlandengine/api/decorators.js';
import {AudioSource} from '@wonderlandengine/spatial-audio';
import {CollisionTest} from './collisionTest.js';

/**
 * intro
 */
export class Intro extends Component {
    static TypeName = 'intro';

    @property.object()
    cin1!: Object3D;

    @property.object()
    cin2!: Object3D;

    @property.object()
    user!: Object3D;

    @property.object()
    spawnPoint!: Object3D;

    @property.object()
    collisionTestObject!: Object3D;

    start() {
        this.runSequence();
    }

    private runSequence() {
        // Init: Disable everything
        this.setObjectActive(this.cin1, false);
        this.setObjectActive(this.cin2, false);

        // Phase 1: Enable Cin1 (0s - 10s)
        this.setObjectActive(this.cin1, true);

        // Phase 2: Disable Cin1, Enable Cin2 (10s - 20s)
        setTimeout(() => {
            this.setObjectActive(this.cin1, false);
            this.setObjectActive(this.cin2, true);
        }, 10000);

        // End: Teleport and Start Game (20s)
        setTimeout(() => {
            this.setObjectActive(this.cin2, false);
            this.stopIntroMusic();
            this.teleportUser();
            this.startGame();
        }, 20000);
    }

    private stopIntroMusic() {
        const audio = this.object.getComponent(AudioSource);
        if (audio) {
            audio.stop();
        }
    }

    private setObjectActive(obj: Object3D | null, active: boolean) {
        if (obj) {
            for(const comp of obj.getComponents()) {
                comp.active = active;
            }
            for (const child of obj.children){
                this.setObjectActive(child, active);
            }
        }
    }

    private teleportUser() {
        if (this.user && this.spawnPoint) {
            this.user.setTransformLocal(this.spawnPoint.getTransformLocal());
        }
    }

    private startGame() {
        if (this.collisionTestObject) {
            const comp = this.collisionTestObject.getComponent(CollisionTest);
            if (comp) {
                comp.playIntroSong();
            }
        }
    }
}
