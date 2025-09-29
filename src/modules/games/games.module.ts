import type Module from "../module.js";
import { UnscrambleCommand } from "./unscramble.command.js";
import { loadDefinitions } from "./unscramble.js";

export const GamesModule: Module = {
	name: "games",
	commands: [UnscrambleCommand],
	listeners: [
		{
			clientReady: async () => {
				await loadDefinitions();
			},
		},
	],
};
