# Smoke particles
The smoke ( shown when a gun is shot ) is implemented as a Sprite object with many particles.

It sets the position of one of it's particles when a "spawnSmoke" event is triggered at a particular position, and the animation will be driven by the material's shader.

The smoke object likes in src/fx/Smoke.ts
Each particle has a time attribute that when the smoke is needed it is set to `time.value` and that value is then used to calculate the "progress" of the particle by substracting the actual "time" and dividing that by the desired duration of the particle.

It is designed to be basically invisible after the duration has passed so there's no remove methods.