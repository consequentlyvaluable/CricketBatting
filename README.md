# Three.js Cricket Batting

A bite-sized cricket batting experience built with [three.js](https://threejs.org/). Time your shots to send deliveries racing to the boundary while keeping your hot streak alive.

## Getting started

This project is completely static and can be served by any HTTP server. For local development you can use the built-in Python server:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000> in your browser to play.

## Controls

- **Swing the bat:** Press the spacebar or click/tap anywhere on the screen.
- **Camera:** Drag with the mouse (OrbitControls) to slightly adjust your viewing angle.

## Gameplay notes

- Bowlers deliver balls every few seconds with slight line and length variation.
- Time your swing as the ball enters the strike zone to score runs.
- Shots award between 2 and 6 runs based on timing and launch angle; maintain consecutive hits to build a streak.
- Missing a ball resets your streak but you can jump back in immediately on the next delivery.

Enjoy the backyard cricket vibes!
