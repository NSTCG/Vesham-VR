/**
 * /!\ This file is auto-generated.
 *
 * This is the entry point of your standalone application.
 *
 * There are multiple tags used by the editor to inject code automatically:
 *     - `wle:auto-imports:start` and `wle:auto-imports:end`: The list of import statements
 *     - `wle:auto-register:start` and `wle:auto-register:end`: The list of component to register
 */

/* wle:auto-imports:start */
import {AudioListener} from '@wonderlandengine/components';
import {AudioSource} from '@wonderlandengine/components';
import {Cursor} from '@wonderlandengine/components';
import {CursorTarget} from '@wonderlandengine/components';
import {FingerCursor} from '@wonderlandengine/components';
import {FixedFoveation} from '@wonderlandengine/components';
import {HandTracking} from '@wonderlandengine/components';
import {MouseLookComponent} from '@wonderlandengine/components';
import {PlayerHeight} from '@wonderlandengine/components';
import {TargetFramerate} from '@wonderlandengine/components';
import {TeleportComponent} from '@wonderlandengine/components';
import {VrModeActiveSwitch} from '@wonderlandengine/components';
import {StatsHtmlComponent} from 'wle-stats';
import {ButtonComponent} from './button.js';
import {CollisionTest} from './collisionTest.js';
import {Eplephantsneeze} from './elephantSneeze.js';
import {Intro} from './intro.js';
/* wle:auto-imports:end */

export default function(engine) {
/* wle:auto-register:start */
engine.registerComponent(AudioListener);
engine.registerComponent(AudioSource);
engine.registerComponent(Cursor);
engine.registerComponent(CursorTarget);
engine.registerComponent(FingerCursor);
engine.registerComponent(FixedFoveation);
engine.registerComponent(HandTracking);
engine.registerComponent(MouseLookComponent);
engine.registerComponent(PlayerHeight);
engine.registerComponent(TargetFramerate);
engine.registerComponent(TeleportComponent);
engine.registerComponent(VrModeActiveSwitch);
engine.registerComponent(StatsHtmlComponent);
engine.registerComponent(ButtonComponent);
engine.registerComponent(CollisionTest);
engine.registerComponent(Eplephantsneeze);
engine.registerComponent(Intro);
/* wle:auto-register:end */
}
