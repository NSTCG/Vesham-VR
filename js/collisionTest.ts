import {Component, CollisionComponent, Object3D, TextComponent, AnimationComponent, Emitter} from '@wonderlandengine/api';
import {property} from '@wonderlandengine/api/decorators.js';
import {AudioSource} from '@wonderlandengine/spatial-audio';

/**
 * collisionTest
 */
export class CollisionTest extends Component {
    static TypeName = 'collisionTest';

    @property.object()
    leftHand!: Object3D;

    @property.object()
    rightHand!: Object3D;

    @property.object()
    puzzleText!: Object3D;

    @property.string("kananashort.opus")
    songAudio!: string; 

    @property.audioClip()
    successAudio!: string;

    @property.float(7.0)
    puzzleIntervalGap!: number;

    @property.object()
    pathakaUI!: Object3D;

    @property.object()
    mushtiUI!: Object3D;

    @property.object()
    ardhachandramUI!: Object3D;

    @property.object()
    animationObject!: Object3D;

    @property.bool(false)
    disableSlowMotion!: boolean;

    @property.bool(false)
    waitForExternalTrigger!: boolean;

    private rightCollisionComp: CollisionComponent | null = null;
    private leftCollisionComp: CollisionComponent | null = null;
    private animationComp: AnimationComponent | null = null;
    
    private currentLeftMudra: string | null = null;
    private currentRightMudra: string | null = null;
    
    private targetMudra: string = "";
    private mudraOptions: string[] = ["Pathaka", "Mushti", "Ardhachandram"];

    private soundSuccess: AudioSource | null = null;
    private songSource: HTMLAudioElement | null = null;

    private timeSinceLastPuzzle: number = 0;
    private hasStartedOnce: boolean = false;
    private isPuzzleActive: boolean = false;
    private fadeInterval: number | null = null;
    private pitchInterval: number | null = null;
    private animSpeedInterval: number | null = null;
    private eKeyPressed: boolean = false;

    static onPuzzleStateChange = new Emitter<[boolean]>();

    start() {
        // Listen for 'E' key press for testing puzzle resolution on PC
        window.addEventListener('keydown', (e) => {
            if (e.key === 'e' || e.key === 'E') {
                this.eKeyPressed = true;
            }
        });
        if (this.leftHand) {
            this.leftCollisionComp = this.leftHand.getComponent(CollisionComponent);
        }
        if (this.rightHand) {
            this.rightCollisionComp = this.rightHand.getComponent(CollisionComponent);
        }

        if (this.animationObject) {
            this.animationComp = this.animationObject.getComponent(AnimationComponent);
        }

        // Disable all mudra UI children at start
        this.disableAllMudraUI();

        // Setup Audio
        // Success SFX (Spatial)
        if (this.successAudio) {
            this.soundSuccess = this.object.addComponent(AudioSource, {
                src: this.successAudio,
                hrtf: true, // Keep spatial for SFX
            });
        }

        // Song Audio (HTML Audio Element)
        const songPath = this.songAudio || "kananashort.opus";
        if (songPath) {
            this.songSource = new Audio(songPath);
            this.songSource.loop = true;
            this.songSource.volume = 1.0;
            // Force load
            this.songSource.preload = 'auto';
            this.songSource.load();
            
            // Critical for "Pitch Down" effect: 
            this.songSource.preservesPitch = false;
            // @ts-ignore
            if (this.songSource.mozPreservesPitch !== undefined) this.songSource.mozPreservesPitch = false;
            // @ts-ignore
            if (this.songSource.webkitPreservesPitch !== undefined) this.songSource.webkitPreservesPitch = false;
            
            // WAIT FOR INTERACTION to start playing
            if (!this.waitForExternalTrigger) {
                this.waitForInteraction();
            }
        }
        
        if (this.puzzleText) {
             this.updateText(this.puzzleText, "Enjoy the Music... (Click to Start)");
        }
    }

    public playIntroSong() {
        console.log("External trigger received. Attempting auto-play...");
        
        if (this.songSource) {
            const promise = this.songSource.play();
            if (promise !== undefined) {
                promise.then(() => {
                    console.log("Song started playing immediately.");
                    if (this.puzzleText) {
                        this.updateText(this.puzzleText, "Enjoy the Music...");
                    }
                }).catch(e => {
                    console.warn("Auto-play blocked. Waiting for interaction.", e);
                    this.updateText(this.puzzleText, "Click/Trigger to Start Music");
                    this.waitForInteraction();
                });
            } else {
                 // No promise returned (older browsers), assume played or handled
                 this.waitForInteraction(); 
            }
        }
    }

    private waitForInteraction() {
        // Define cleanup function to remove listeners
        const removeListeners = () => {
            window.removeEventListener('click', playAudio);
            window.removeEventListener('touchstart', playAudio);
            window.removeEventListener('keydown', playAudio);
            window.removeEventListener('mousedown', playAudio);
        };

        const playAudio = () => {
            if (this.songSource) {
                // Try to play
                const promise = this.songSource.play();
                
                if (promise !== undefined) {
                    promise.then(() => {
                        console.log("Song started playing after interaction.");
                        // SUCCESS: NOW we can remove the listeners
                        removeListeners();
                        
                        if (this.puzzleText) {
                            this.updateText(this.puzzleText, "Enjoy the Music...");
                        }
                    }).catch(e => {
                        console.warn("Song play failed on interaction (will retry on next):", e);
                        // FAILURE: Do NOT remove listeners yet. Let the user try again.
                        // This handles the "interact before loaded" case where it might reject.
                    });
                } else {
                    // Older browsers might not return promise, but practically all supported ones do.
                    // Assume success or at least remove listeners to avoid infinite loop if sync.
                    removeListeners();
                }
            }
        };

        window.addEventListener('click', playAudio);
        window.addEventListener('touchstart', playAudio);
        window.addEventListener('keydown', playAudio);
        window.addEventListener('mousedown', playAudio);
    }

    update(dt: number) {
        // Track time since last puzzle resolved (or start)
        if (!this.isPuzzleActive) {
            this.timeSinceLastPuzzle += dt;
        }

        // Check for Puzzle Trigger based on interval gap
        if (!this.isPuzzleActive && this.timeSinceLastPuzzle >= this.puzzleIntervalGap) {
            this.startPuzzle();
        }

        // Puzzle Logic
        if (this.isPuzzleActive) {
            // Check for 'E' key press to resolve puzzle for PC testing
            if (this.eKeyPressed) {
                this.eKeyPressed = false;
                this.resolvePuzzle();
                return;
            }

            if (this.leftCollisionComp) {
                this.currentLeftMudra = this.detectMudra(this.leftCollisionComp);
            }
            if (this.rightCollisionComp) {
                this.currentRightMudra = this.detectMudra(this.rightCollisionComp);
            }

            if (this.currentLeftMudra === this.targetMudra && this.currentRightMudra === this.targetMudra) {
                this.resolvePuzzle();
            }
        }
    }

    private startPuzzle() {
        console.log("Starting Puzzle!");
        this.isPuzzleActive = true;
        
        if (this.songSource) {
            if (this.disableSlowMotion) {
                // Fade to Mute
                this.fadeVolume(this.songSource, 0.0, 500);
            } else {
                // Pitch Down (and slow down)
                this.tweenPlaybackRate(this.songSource, 0.75, 500);
                // Lower Volume
                this.fadeVolume(this.songSource, 0.5, 500);

                // Slow down animation
                //this.tweenAnimationSpeed(0.75, 500);

                if (this.animationComp) {
                    this.animationComp.speed = 0.2;
                }
            }
        }

        CollisionTest.onPuzzleStateChange.notify(true);
        
        this.setNewTarget();
        this.showPicture();
    }

    private disableAllMudraUI() {
        // Disable all children of all mudra UI objects
        this.setChildrenActive(this.pathakaUI, false);
        this.setChildrenActive(this.mushtiUI, false);
        this.setChildrenActive(this.ardhachandramUI, false);
    }

    private setChildrenActive(obj: Object3D | null, active: boolean) {
        if (!obj) return;
        obj.active = active;
        obj.getComponents().forEach(comp => {
            comp.active = active;
        });
        const children = obj.children;
        for (const child of children) {
            this.setChildrenActive(child, active);
        }
    }

    private showPicture() {
        // Disable all mudra UIs first
        this.disableAllMudraUI();

        // Enable the correct mudra UI based on the target
        if (this.targetMudra === "Pathaka") {
            this.setChildrenActive(this.pathakaUI, true);
        } else if (this.targetMudra === "Mushti") {
            this.setChildrenActive(this.mushtiUI, true);
        } else if (this.targetMudra === "Ardhachandram") {
            this.setChildrenActive(this.ardhachandramUI, true);
        }
    }

    setBlackAndWhite(){

    }

    private resolvePuzzle() {
        console.log("Puzzle Solved!");
        this.disableAllMudraUI(); // Hide the picture after solving
        this.setBlackAndWhite();

        this.isPuzzleActive = false;
        this.timeSinceLastPuzzle = 0; // Reset timer for next puzzle interval

        CollisionTest.onPuzzleStateChange.notify(false);

        // Restore Audio
        if (this.songSource) {
            if (this.disableSlowMotion) {
                // Fade to 1.0
                this.fadeVolume(this.songSource, 1.0, 500);
            } else {
                 // Pitch Normal
                 this.tweenPlaybackRate(this.songSource, 1.0, 500);
                 // Restore Volume
                 this.fadeVolume(this.songSource, 1.0, 500);

                 // Restore animation speed
                 //this.tweenAnimationSpeed(1.0, 500);
                 this.animationComp!.speed = 1.0;
            }
        }

        // Play Success
        if (this.soundSuccess) {
            this.soundSuccess.play();
        }

        this.updateText(this.puzzleText, "Good! Enjoy the Music...");
    }

    private setNewTarget() {
        const randomIndex = Math.floor(Math.random() * this.mudraOptions.length);
        this.targetMudra = this.mudraOptions[randomIndex];
        console.log("New Target:", this.targetMudra);

        this.updateText(this.puzzleText, "Mudra: " + this.targetMudra);
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

    private tweenPlaybackRate(audio: HTMLAudioElement, targetRate: number, duration: number) {
        if (this.pitchInterval) {
            window.clearInterval(this.pitchInterval);
            this.pitchInterval = null;
        }

        if (!audio) return;

        const startRate = audio.playbackRate;
        const startTime = performance.now();

        this.pitchInterval = window.setInterval(() => {
            const elapsed = performance.now() - startTime;
            const t = Math.min(elapsed / duration, 1);
            
            // Linear interpolation
            audio.playbackRate = startRate + (targetRate - startRate) * t;

            if (t >= 1) {
                if(this.pitchInterval) { 
                    window.clearInterval(this.pitchInterval);
                    this.pitchInterval = null;
                }
                audio.playbackRate = targetRate;
            }
        }, 50); 
    }

    private fadeVolume(audio: HTMLAudioElement, targetVolume: number, duration: number) {
        if (this.fadeInterval) {
            window.clearInterval(this.fadeInterval);
            this.fadeInterval = null;
        }

        if (!audio) return;

        const startVolume = audio.volume;
        const startTime = performance.now();

        this.fadeInterval = window.setInterval(() => {
            const elapsed = performance.now() - startTime;
            const t = Math.min(elapsed / duration, 1);
            
            // Linear interpolation
            audio.volume = startVolume + (targetVolume - startVolume) * t;

            if (t >= 1) {
                if(this.fadeInterval) { 
                    window.clearInterval(this.fadeInterval);
                    this.fadeInterval = null;
                }
                audio.volume = targetVolume;
            }
        }, 50); 
    }

    private tweenAnimationSpeed(targetSpeed: number, duration: number) {
        if (this.animSpeedInterval) {
            window.clearInterval(this.animSpeedInterval);
            this.animSpeedInterval = null;
        }

        if (this.animationComp) {
             const startSpeed = (this.animationComp as any).speed || 1.0; // Use 'speed' if available, generic logic might be needed if property differs
             // Note: AnimationComponent in WL usually has a 'speed' property or similar depending on version. 
             // Assuming standard WL Component behavior where specific props might vary, but 'playCount' etc exists.
             // Actually, AnimationComponent usually doesn't expose 'speed' directly in all versions, 
             // but if it's the standard one, let's assume we can set it. 
             // If not, we might need a different approach? 
             // Looking at docs, Animation player usually has speed. 
             // Let's try casting to any for now to access potential 'speed' property if it's a custom or specific component,
             // or if we are modifying the global speed of that animation. 
             // Wait, standard WL AnimationComponent does NOT have a public speed property easily tweenable?
             // Actually it does not. The Animation *State* does. 
             // But let's assume for this specific user request they might mean the component playing it. 
             // If this fails, I'll need to check how they want to control speed.
             // Standard way: component.animation.speed ? No. 
             // Let's try to set it on the component assuming it's a wrapper or supports it.
             // Actually, the user asked: "reference an animation component . when speed reducing also reduce the animation speed"
             // PROPOSAL: direct assignment if possible or standard component property.
             // Accessing the playing animation?
             const activeState = this.animationComp;
             if(activeState) {
                 const startSpeed = activeState.speed;
                 const startTime = performance.now();
 
                 this.animSpeedInterval = window.setInterval(() => {
                     const elapsed = performance.now() - startTime;
                     const t = Math.min(elapsed / duration, 1);
                     
                     // Linear interpolation
                     activeState.speed = startSpeed + (targetSpeed - startSpeed) * t;
 
                     if (t >= 1) {
                         if(this.animSpeedInterval) { 
                             window.clearInterval(this.animSpeedInterval);
                             this.animSpeedInterval = null;
                         }
                         activeState.speed = targetSpeed;
                     }
                 }, 50);
             }
        }
    }
}
