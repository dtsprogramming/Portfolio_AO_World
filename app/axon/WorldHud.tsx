/**
 * Read-only desktop HUD for project identity, current board sector, and
 * connection state. Gameplay input remains in the dedicated controls layer.
 */
export function WorldHud({ zone }: { zone: string }) {
  return (
    <header className="hud">
      <div>
        <b>AXON<br />OVERRIDE</b>
        <span>PLAYABLE SYSTEMS PORTFOLIO</span>
      </div>
      <div className="zone">
        <small>CURRENT SECTOR</small>
        {zone}
      </div>
      <div className="signal">SIGNAL <i /> ONLINE</div>
    </header>
  );
}

