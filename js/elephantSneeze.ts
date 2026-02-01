import {Component} from '@wonderlandengine/api';
import {property} from '@wonderlandengine/api/decorators.js';
import {AudioSource} from '@wonderlandengine/spatial-audio';
import {CollisionTest} from './collisionTest.js';

/**
 * eplephantsneeze
 */
export class Eplephantsneeze extends Component {
    static TypeName = 'eplephantsneeze';

    @property.float(5.0)
    minInterval!: number;

    @property.float(15.0)
    maxInterval!: number;

    private audioSource: AudioSource | null = null;
    private timer: number = 0;
    private nextSneezeTime: number = 0;
    private isPuzzleActive: boolean = false;

    start() {
        this.audioSource = this.object.getComponent(AudioSource);
        if (!this.audioSource) {
            console.warn("Eplephantsneeze: No AudioSource component found on object!");
        }

        // Listen for puzzle state changes
        CollisionTest.onPuzzleStateChange.add((active: boolean) => {
            this.isPuzzleActive = active;
            // Optional: reset timer or just let it pause? 
            // If we just want to suppress, we can check in update.
        });

        this.scheduleNextSneeze();
    }

    update(dt: number) {
        if (this.isPuzzleActive) return;

        this.timer += dt;
        if (this.timer >= this.nextSneezeTime) {
            this.playSneeze();
        }
    }

    private playSneeze() {
        if (this.audioSource) {
            this.audioSource.play();
        }
        this.scheduleNextSneeze();
    }

    private scheduleNextSneeze() {
        this.timer = 0;
        this.nextSneezeTime = this.minInterval + Math.random() * (this.maxInterval - this.minInterval);
    }
}
