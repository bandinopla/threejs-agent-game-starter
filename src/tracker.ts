/**
 * Provider-neutral analytics hooks.
 *
 * These methods intentionally do nothing. Replace their bodies to integrate
 * an analytics, portal, or telemetry provider without changing game code.
 */
export const Tracker = {
	async init(): Promise<void> {},
	firstKill(): void {},
	playerWon(): void {},
	playerDied(): void {},
	playerGotHome(): void {},
	loadingStarted(): void {},
	loadingFinished(): void {},
	gameStarted(): void {},
	gameStopped(): void {},
};
