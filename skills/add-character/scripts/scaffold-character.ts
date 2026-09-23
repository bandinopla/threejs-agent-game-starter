import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const roles = [
	"player-replacement",
	"companion",
	"npc",
	"enemy",
	"enemy-replacement",
] as const;
const families = ["rigged", "shootable"] as const;
const spawns = ["level", "event", "manual", "existing-manager"] as const;

type Role = (typeof roles)[number];
type Family = (typeof families)[number];
type Spawn = (typeof spawns)[number];
type YesNo = "yes" | "no";
type AssetStatus = "ready" | "pending";

interface Options {
	name: string;
	role: Role;
	family: Family;
	stateMachine: YesNo;
	spawn: Spawn;
	spawnId?: string;
	eventName?: string;
	asset: AssetStatus;
	assetPath?: string;
	repoRoot: string;
	force: boolean;
}

const usage = `Create deterministic character boilerplate from bundled templates.

Required:
  --name <PascalCase>
  --role <${roles.join("|")}>
  --family <${families.join("|")}>
  --state-machine <yes|no>
  --spawn <${spawns.join("|")}>
  --asset <ready|pending>

Conditional:
  --spawn-id <id>       Required for --spawn level
  --event-name <name>   Required for --spawn event
  --asset-path <path>   Required for --asset ready

Optional:
  --repo-root <path>    Defaults to the current directory
  --force               Replace an existing generated character folder
  --help`;

function fail(message: string): never {
	throw new Error(message);
}

function readArguments(argv: string[]): Map<string, string | true> {
	const result = new Map<string, string | true>();

	for (let index = 0; index < argv.length; index += 1) {
		const argument = argv[index];
		if (argument === "--") continue;
		if (!argument.startsWith("--")) fail(`Unexpected argument: ${argument}`);

		const key = argument.slice(2);
		if (key === "force" || key === "help") {
			result.set(key, true);
			continue;
		}

		const value = argv[index + 1];
		if (!value || value.startsWith("--")) fail(`Missing value for --${key}`);
		result.set(key, value);
		index += 1;
	}

	return result;
}

function required(argumentsMap: Map<string, string | true>, key: string): string {
	const value = argumentsMap.get(key);
	if (typeof value !== "string") fail(`--${key} is required`);
	return value;
}

function optional(argumentsMap: Map<string, string | true>, key: string): string | undefined {
	const value = argumentsMap.get(key);
	return typeof value === "string" ? value : undefined;
}

function oneOf<T extends string>(value: string, choices: readonly T[], flag: string): T {
	if (!choices.includes(value as T)) {
		fail(`--${flag} must be one of: ${choices.join(", ")}`);
	}
	return value as T;
}

function parseOptions(argv: string[]): Options {
	const argumentsMap = readArguments(argv);
	if (argumentsMap.has("help")) {
		console.log(usage);
		process.exit(0);
	}

	const name = required(argumentsMap, "name");
	const spawn = oneOf(required(argumentsMap, "spawn"), spawns, "spawn");
	const asset = oneOf(
		required(argumentsMap, "asset"),
		["ready", "pending"] as const,
		"asset",
	);
	const spawnId = optional(argumentsMap, "spawn-id");
	const eventName = optional(argumentsMap, "event-name");
	const assetPath = optional(argumentsMap, "asset-path");

	if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) {
		fail("--name must be a PascalCase TypeScript identifier");
	}
	if (spawn === "level" && !spawnId) {
		fail("--spawn-id is required when --spawn=level");
	}
	if (spawn === "event" && !eventName) {
		fail("--event-name is required when --spawn=event");
	}
	if (eventName && !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(eventName)) {
		fail("--event-name must be a TypeScript identifier");
	}
	if (asset === "ready" && !assetPath) {
		fail("--asset-path is required when --asset=ready");
	}

	return {
		name,
		role: oneOf(required(argumentsMap, "role"), roles, "role"),
		family: oneOf(required(argumentsMap, "family"), families, "family"),
		stateMachine: oneOf(
			required(argumentsMap, "state-machine"),
			["yes", "no"] as const,
			"state-machine",
		),
		spawn,
		spawnId,
		eventName,
		asset,
		assetPath,
		repoRoot: resolve(optional(argumentsMap, "repo-root") ?? process.cwd()),
		force: argumentsMap.get("force") === true,
	};
}

function kebabCase(name: string): string {
	return name.replace(/(?<!^)(?=[A-Z])/g, "-").toLowerCase();
}

function render(
	template: string,
	destination: string,
	values: Readonly<Record<string, string>>,
): void {
	let content = readFileSync(template, "utf8");
	for (const [key, value] of Object.entries(values)) {
		content = content.replaceAll(`__${key}__`, value);
	}

	mkdirSync(dirname(destination), { recursive: true });
	writeFileSync(destination, content, "utf8");
}

function main(): void {
	const options = parseOptions(process.argv.slice(2));
	const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
	const templates = resolve(skillRoot, "assets", "templates");
	const fileStem = kebabCase(options.name);
	const characterDirectory = resolve(
		options.repoRoot,
		"src",
		"entity",
		fileStem,
	);
	const integrationDocument = resolve(
		options.repoRoot,
		"docs",
		"character-integrations",
		`${fileStem}.md`,
	);

	if (existsSync(characterDirectory)) {
		if (!options.force) {
			fail(`Refusing to overwrite existing folder: ${characterDirectory}`);
		}
		rmSync(characterDirectory, { recursive: true, force: true });
	}

	const values = {
		CLASS_NAME: options.name,
		FILE_STEM: fileStem,
		ROLE: options.role,
		FAMILY: options.family,
		STATE_MACHINE: options.stateMachine,
		SPAWN: options.spawn,
		SPAWN_ID: options.spawnId ?? "not applicable",
		EVENT_NAME: options.eventName ?? "not applicable",
		ASSET: options.asset,
		ASSET_PATH: options.assetPath ?? "pending",
	};

	const mode = options.stateMachine === "yes" ? "stateful" : "stateless";
	render(
		resolve(templates, `Character.${options.family}.${mode}.ts.tmpl`),
		resolve(characterDirectory, `${options.name}.ts`),
		values,
	);

	if (options.stateMachine === "yes") {
		const stateDirectory = resolve(characterDirectory, "state");
		const stateTemplates = [
			["CharacterContext.ts.tmpl", `${options.name}Context.ts`],
			["ICharacterState.ts.tmpl", `I${options.name}State.ts`],
			["CharacterBaseState.ts.tmpl", `${options.name}BaseState.ts`],
			["CharacterIdleState.ts.tmpl", `${options.name}IdleState.ts`],
		] as const;

		for (const [source, destination] of stateTemplates) {
			render(
				resolve(templates, source),
				resolve(stateDirectory, destination),
				values,
			);
		}
	}

	render(
		resolve(templates, "integration.md.tmpl"),
		integrationDocument,
		values,
	);

	console.log(`Created ${relative(options.repoRoot, characterDirectory)}`);
	console.log(`Created ${relative(options.repoRoot, integrationDocument)}`);
	if (options.spawn === "level") {
		console.log(
			`Next: consume level marker userData.spawn == "${options.spawnId}"`,
		);
	} else if (options.spawn === "event") {
		console.log(
			`Next: type and listen for GameEvents["${options.eventName}"]`,
		);
	} else {
		console.log(`Next: integrate using spawn strategy: ${options.spawn}`);
	}
}

try {
	main();
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
}
