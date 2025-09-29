import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
} from "discord.js";
import type { Command } from "djs-slash-helper";
import { fetchAndSaveDefinitions } from "./unscramble.js";

export const UnscrambleCommand: Command<ApplicationCommandType.ChatInput> = {
	name: "unscramble",
	description: "Unscrambling a word",
	type: ApplicationCommandType.ChatInput,
	default_permission: false,
	options: [],

	handle: async (interaction) => {
		if (
			!interaction.isChatInputCommand() ||
			!interaction.inGuild() ||
			interaction.guild === null
		)
			return;

		console.log(await fetchAndSaveDefinitions());
	},
};
