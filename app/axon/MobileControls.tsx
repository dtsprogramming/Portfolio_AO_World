import type { PointerEventHandler, RefObject } from "react";
import type { Ability } from "./types";

/**
 * Touch-first gameplay controls. The left stick drives the robot, the right
 * stick orbits the camera, and unlocked movement abilities appear alongside it.
 */
export function MobileControls({
  abilities,
  boostToggled,
  movePointerRef,
  lookPointerRef,
  moveStick,
  lookStick,
  onMoveStart,
  onMove,
  onMoveEnd,
  onLookStart,
  onLook,
  onLookEnd,
  onToggleBoost,
  onJump,
  pulseUnlocked,
  onPulse,
}: {
  abilities: Ability[];
  boostToggled: boolean;
  movePointerRef: RefObject<number | null>;
  lookPointerRef: RefObject<number | null>;
  moveStick: { x: number; y: number };
  lookStick: { x: number; y: number };
  onMoveStart: PointerEventHandler<HTMLDivElement>;
  onMove: PointerEventHandler<HTMLDivElement>;
  onMoveEnd: PointerEventHandler<HTMLDivElement>;
  onLookStart: PointerEventHandler<HTMLDivElement>;
  onLook: PointerEventHandler<HTMLDivElement>;
  onLookEnd: PointerEventHandler<HTMLDivElement>;
  onToggleBoost: () => void;
  onJump: () => void;
  pulseUnlocked: boolean;
  onPulse: () => void;
}) {
  return (
    <div className="mobile-controls">
      <div className="move-controls">
        <div
          className="joystick move-stick"
          aria-label="Movement joystick"
          onPointerDown={(event) => {
            movePointerRef.current = event.pointerId;
            event.currentTarget.setPointerCapture(event.pointerId);
            onMoveStart(event);
          }}
          onPointerMove={onMove}
          onPointerUp={onMoveEnd}
          onPointerCancel={onMoveEnd}
        >
          <i style={{ transform: `translate(${moveStick.x * 33}px,${moveStick.y * 33}px)` }} />
        </div>
      </div>
      <div className="right-controls">
        {pulseUnlocked && (
          <button className="pulse-button" aria-label="Fire eye pulse" onPointerDown={onPulse}>
            PULSE
          </button>
        )}
        {abilities.includes("sprint") && (
          <button
            className={`boost-toggle ${boostToggled ? "active" : ""}`}
            aria-label="Toggle boost"
            aria-pressed={boostToggled}
            onClick={onToggleBoost}
          >
            BOOST {boostToggled ? "ON" : "OFF"}
          </button>
        )}
        <button className="jump-button" aria-label="Jump" onPointerDown={onJump}>
          &#8593;<small>JUMP</small>
        </button>
        <div
          className="joystick look-stick"
          aria-label="Camera joystick"
          onPointerDown={(event) => {
            lookPointerRef.current = event.pointerId;
            event.currentTarget.setPointerCapture(event.pointerId);
            onLookStart(event);
          }}
          onPointerMove={onLook}
          onPointerUp={onLookEnd}
          onPointerCancel={onLookEnd}
        >
          <i style={{ transform: `translate(${lookStick.x * 28}px,${lookStick.y * 28}px)` }} />
          <small>CAMERA</small>
        </div>
      </div>
    </div>
  );
}
