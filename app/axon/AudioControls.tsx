/** Compact master audio controls with persistence delegated to the parent. */
export function AudioControls({
  muted,
  volume,
  onToggleMuted,
  onVolumeChange,
}: {
  muted: boolean;
  volume: number;
  onToggleMuted: () => void;
  onVolumeChange: (volume: number) => void;
}) {
  return (
    <div className="audio-controls" aria-label="Audio controls">
      <button
        aria-label={muted ? "Unmute audio" : "Mute audio"}
        aria-pressed={muted}
        onClick={onToggleMuted}
      >
        {muted ? "AUDIO OFF" : "AUDIO ON"}
      </button>
      <input
        aria-label="Audio volume"
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={volume}
        onChange={(event) => onVolumeChange(Number(event.currentTarget.value))}
      />
    </div>
  );
}

