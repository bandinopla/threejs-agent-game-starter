# Fairy dust
the fairy dust effect is managed by the class src/fx/FairyDustManager.ts and it is a "SpriteEmitter" activated when the event "registerFairyDustEmiter" is detected. It is a Sprite object that is placed on the scene at initialization time.

The event's payload says what should be the source object and details of the fairy dust (radius, etc).
The fairy dust is emitted around the source object in a random radius and with a random scale and duration.
 
The event has a "unregisterRef" method that will be called with a reference to the function that should be called when the fairy dust is no longer needed. The remover function.
 