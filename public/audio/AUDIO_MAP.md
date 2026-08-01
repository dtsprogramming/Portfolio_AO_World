# Axon Override audio cue map

All files should use the listed `.mp3` basename. A matching `.ogg` file may be
added later as an alternate source.

## Global playback rules

- Audio unlocks on the visitor's first pointer press or keyboard press.
- Start muted only if browser policy requires it; otherwise restore the locally
  saved mute and volume settings.
- Master volume default: `0.65`.
- Ambient volume default: `0.22`.
- Effects volume default: `0.7`.
- UI volume default: `0.45`.
- Never restart a loop if that loop is already playing.
- Avoid playing the same one-shot more than once within 60 milliseconds.
- Pause ambience while the page is hidden and resume with a short fade.
- Fade between level ambience tracks over approximately 800 milliseconds.

## Ambient

| File | Type | Trigger | Stop / transition |
| --- | --- | --- | --- |
| `ambient/level-01.mp3` | Seamless loop | Audio unlock while player is on Level 01 | Crossfade when lift begins descending |
| `ambient/level-02.mp3` | Seamless loop | Lift arrives on Level 02 | Crossfade when player leaves Level 02 |
| `ambient/level-03.mp3` | Seamless loop | Lift arrives on Level 03 | Fade down when finale charging begins |
| `ambient/finale-bed.mp3` | Seamless loop | Fifth circuit reaches the final machine | Stop at machine explosion |

## Robot

| File | Type | Trigger | Stop / transition |
| --- | --- | --- | --- |
| `robot/monowheel-loop.mp3` | Seamless loop | Horizontal input begins while robot is grounded | Fade out after input stops, robot jumps, or lift takes control |
| `robot/servo-turn.mp3` | One-shot | Movement direction changes left-to-right or right-to-left | No explicit stop |
| `robot/jump.mp3` | One-shot | Jump velocity is applied | No explicit stop |
| `robot/land-soft.mp3` | One-shot | Robot lands after a short fall | No explicit stop |
| `robot/land-hard.mp3` | One-shot | Robot lands after a long fall | No explicit stop |
| `robot/portal-dissolve.mp3` | One-shot | Robot crosses the return door's front plane | Finish before page reset |

## Interface

| File | Type | Trigger | Stop / transition |
| --- | --- | --- | --- |
| `ui/panel-open.mp3` | One-shot | A proximity panel becomes visible | No explicit stop |
| `ui/panel-close.mp3` | One-shot | Player leaves a proximity zone or collapses a panel | No explicit stop |
| `ui/panel-expand.mp3` | One-shot | Final popup Details button expands the panel | No explicit stop |
| `ui/control-tick.mp3` | One-shot | Slider crosses a discrete step | Rate-limit to avoid overlap |
| `ui/control-confirm.mp3` | One-shot | Button or pattern selection is accepted | No explicit stop |
| `ui/language-change.mp3` | One-shot | Global code language changes | No explicit stop |
| `ui/system-ready.mp3` | One-shot | A previously locked interaction becomes available | No explicit stop |

## Lift

| File | Type | Trigger | Stop / transition |
| --- | --- | --- | --- |
| `lift/board.mp3` | One-shot | Robot remains inside the lift long enough to start the delay | No explicit stop |
| `lift/start.mp3` | One-shot | Lift target changes and movement begins | Follow immediately with movement loop |
| `lift/move-loop.mp3` | Seamless loop | Lift is moving vertically | Fade out as target floor is reached |
| `lift/arrive.mp3` | One-shot | Lift snaps to the target floor | No explicit stop |
| `lift/power-hum.mp3` | Seamless loop | Lift is present in the active camera view | Very low volume; stop outside view |

## Level 01 — loop machine

| File | Type | Trigger | Stop / transition |
| --- | --- | --- | --- |
| `machines/loop-start.mp3` | One-shot | Execute Loop begins a bounded run | No explicit stop |
| `machines/core-spawn.mp3` | One-shot | Each signal orb is created | Use small pitch variation |
| `machines/core-roll.mp3` | One-shot or short loop | Orb contacts and rolls across Level 01 | Stop when it enters the intake |
| `machines/intake-drop.mp3` | One-shot | Orb crosses the black intake opening | No explicit stop |
| `machines/loop-overload.mp3` | Loop | Unbounded iteration is detected | Stop at explosion |
| `machines/loop-explosion.mp3` | One-shot | Loop machine explosion begins | No explicit stop |
| `machines/rebuild.mp3` | One-shot | Automatic machine reconstruction begins | Finish before machine returns |

## Level 01 — render machine

| File | Type | Trigger | Stop / transition |
| --- | --- | --- | --- |
| `machines/render-mode.mp3` | One-shot | Vertical slider changes render mode | Slight pitch change by mode index |
| `machines/render-wireframe.mp3` | One-shot | Wireframe mode becomes active | No explicit stop |
| `machines/render-light.mp3` | One-shot | High-intensity lighting mode becomes active | No explicit stop |
| `machines/render-fog.mp3` | One-shot | Fog mode becomes active | No explicit stop |

## Level 02 — storage and power

| File | Type | Trigger | Stop / transition |
| --- | --- | --- | --- |
| `machines/orb-tube.mp3` | One-shot | Orb begins descending through the tube | No explicit stop |
| `machines/orb-store.mp3` | One-shot | Orb settles in the glass storage chamber | Use small pitch variation |
| `machines/storage-hum.mp3` | Adaptive loop | At least one orb is stored | Increase volume subtly with orb count; stop at zero |
| `machines/absorb-start.mp3` | One-shot | Absorb Stored Power is pressed | No explicit stop |
| `machines/orb-absorb.mp3` | Layered one-shot | Each stored orb begins dissolving | Stagger with the visual dissolve |
| `machines/distributor-surge.mp3` | One-shot | Absorbed energy reaches the distributor | No explicit stop |
| `machines/charge-loop.mp3` | Adaptive loop | Charge gauge is above zero | Pitch or filter tracks charge level; stop at zero |
| `machines/light-array-online.mp3` | One-shot | Charge first reaches the activation threshold | Also triggers `ui/system-ready.mp3` only if they do not clash |
| `machines/light-step.mp3` | One-shot | Active light advances to another segment | Very quiet and rate-limited |

## Level 03 — platformer

| File | Type | Trigger | Stop / transition |
| --- | --- | --- | --- |
| `machines/circuit-pickup.mp3` | One-shot | Robot touches an uncollected circuit board | Slight pitch rise with collected count |
| `machines/platform-land.mp3` | One-shot | Robot lands on a raised platform | Can replace the normal robot landing cue |
| `machines/archive-near.mp3` | One-shot | Fully equipped robot first enters the delivery trigger | Play once per run |
| `machines/circuit-launch.mp3` | One-shot | Each collected circuit begins flying to the machine | One cue per circuit |
| `machines/circuit-received.mp3` | One-shot | Circuit reaches the delivery slot | Layer with plaque activation |
| `machines/plaque-online.mp3` | One-shot | Each project plaque's neon border illuminates | Pitch rises by plaque index |
| `machines/archive-complete.mp3` | One-shot | Fifth circuit is accepted | Leads into finale charging |

## Finale

| File | Type | Trigger | Stop / transition |
| --- | --- | --- | --- |
| `finale/fuse-step.mp3` | One-shot | Each vertical fuse light illuminates | Playback spacing follows accelerating visual interval |
| `finale/burst-inner.mp3` | One-shot | Inner radial ring illuminates | No explicit stop |
| `finale/burst-middle.mp3` | One-shot | Middle radial ring illuminates | No explicit stop |
| `finale/burst-outer.mp3` | One-shot | Outer radial ring illuminates | No explicit stop |
| `finale/charge-riser.mp3` | One-shot | Accelerating light sequence begins | Duration should match the charging sequence |
| `finale/machine-explosion.mp3` | One-shot | Machine is hidden and particles spawn | Highest-priority effect |
| `finale/firework-launch.mp3` | One-shot | Firework particle sequence begins | No explicit stop |
| `finale/firework-burst-01.mp3` | One-shot | First visible particle burst expands | Randomly alternate with burst 02 |
| `finale/firework-burst-02.mp3` | One-shot | Additional particle burst expands | Randomly alternate with burst 01 |
| `finale/portal-rise.mp3` | One-shot | Return door becomes visible and starts rising | No explicit stop |
| `finale/portal-loop.mp3` | Seamless loop | Return door reaches its final position | Stop when dissolve begins |

## Priority and mixing

1. Portal dissolve and machine explosion
2. Finale charge and fireworks
3. Circuit delivery and power absorption
4. Lift movement and arrival
5. Robot movement and landing
6. Machine interaction effects
7. UI ticks
8. Ambient loops

When a higher-priority sound plays, temporarily lower ambience by 3–6 dB.
The machine explosion should also lower all non-finale effects briefly.

## Minimum viable first implementation

The first wired audio pass only needs these files:

```text
ambient/level-01.mp3
ambient/level-02.mp3
ambient/level-03.mp3
robot/monowheel-loop.mp3
robot/jump.mp3
robot/land-soft.mp3
ui/panel-open.mp3
lift/move-loop.mp3
lift/arrive.mp3
machines/core-spawn.mp3
machines/circuit-pickup.mp3
machines/orb-absorb.mp3
finale/charge-riser.mp3
finale/machine-explosion.mp3
finale/portal-rise.mp3
robot/portal-dissolve.mp3
```
