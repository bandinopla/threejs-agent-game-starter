# Blood spill
When blood is spilled, a BloodSplash object is created by the `gnome-vs-monkeys.ts` file. In response to events, a method called "emitFrom" is called which will take a source object and a config object with the following properties:
- duration: number
- ratio: number
- frecuency: number
- entity: the entity that is bleeding

The BloodSplash object is a particle system that will emit particles from the given source position for the given duration. The ratio is the ratio of particles to emit, and the frecuency is the frequency of particle emission. The entity is used to know when to remove the blood splash from the scene ( on reset, it should assume it is no longer needed )

So basically when an event is triggered:

- "gotShot" on the monkeys
- "gotShot" on the gnome

The emiter is created and it will raycast from the source position + some y downwards towards the floor placing a quad with the blood texture at the hit position. 