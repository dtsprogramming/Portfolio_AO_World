/**
 * Presents the startup terminal and hands control to the 3D reveal once the
 * simulated system checks finish. It intentionally owns no gameplay state.
 */
export function BootScreen({
  phase,
  lines,
  visibleLine,
  onEnter,
}: {
  phase: "boot" | "ready" | "reveal" | "play";
  lines: string[];
  visibleLine: number;
  onEnter: () => void;
}) {
  if (phase === "play") return null;

  return (
    <section className="boot-screen">
      <div className="boot-terminal">
        <div className="term-top">
          <span>AXON_OVERRIDE // BOOT</span>
          <i />
        </div>
        <div className="axon-logo">
          AO<span>_</span>
        </div>
        <div className="boot-lines">
          {lines.slice(0, visibleLine + 1).map((line, index) => (
            <p key={line} className={index === visibleLine ? "current" : ""}>
              {line}
            </p>
          ))}
        </div>
        {phase === "ready" && (
          <button onClick={onEnter}>
            ENTER WORLD <b aria-hidden="true">&#8599;</b>
          </button>
        )}
        <small>BUILD 0.02 / PROGRESSION TEST</small>
      </div>
    </section>
  );
}

