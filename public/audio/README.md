# Axon Override audio

## Browser-ready formats

- Use `.mp3` for the widest browser compatibility.
- An optional matching `.ogg` version can be supplied for each sound.
- Keep the same basename when supplying both formats, such as
  `circuit-pickup.mp3` and `circuit-pickup.ogg`.
- Keep original `.wav` files outside `public/` as editing masters; export
  compressed web versions here.

## Export guidance

- Sound effects: 44.1 or 48 kHz, 128–192 kbps MP3.
- Ambient loops: 44.1 or 48 kHz, 160–192 kbps MP3.
- Mono is appropriate for small interface and mechanical effects.
- Use stereo for ambience, fireworks, and other spatially broad effects.
- Remove long silence from effects.
- Ambient and movement loops must be seamless.
- Leave some headroom and avoid clipping; approximately -1 dB true peak is a
  safe delivery target.

## Naming

Use lowercase, descriptive, hyphenated event names:

```text
robot-move-loop.mp3
robot-jump.mp3
lift-arrive.mp3
circuit-pickup.mp3
finale-explosion.mp3
```

The site will unlock audio after the visitor's first interaction and provide
global mute and volume controls before sounds are enabled.
