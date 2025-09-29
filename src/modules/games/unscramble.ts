import { existsSync, readFileSync, writeFileSync } from "node:fs";
import fetch from "node-fetch";
import { parse } from "node-html-parser";

const HACKER_TERMS_URL = "https://www.hackterms.com/about/all";
const DEFINITIONS_PATH = `${process.cwd()}/definitions.json`;

export interface Definition {
	href: string;
	term: string;
}

export type ScrambledDefinition = {
	definitions: Definition[];
	scrambledWord: string;
};

export let scrambleDefinitions: Definition[] = [];

export async function loadDefinitions() {
	if (existsSync(DEFINITIONS_PATH)) {
		const data = readFileSync(DEFINITIONS_PATH, "utf-8");
		return JSON.parse(data) as Definition[];
	} else {
		return await fetchAndSaveDefinitions();
	}
}

function transformHTMLElements(data: HTMLAnchorElement[]): Definition[] {
	console.log(data);
	return data.map(
		(element) =>
			({
				href: element.getAttribute("href"),
				term: element.innerText,
			}) as Definition,
	);
}

export async function fetchAndSaveDefinitions() {
	try {
		const response = await fetch(HACKER_TERMS_URL);

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const html = await response.text();
		const doc = parse(html);
		const definitions = doc.querySelectorAll(
			"a.all-terms-link",
		) as unknown as HTMLAnchorElement[]; // We know this is an array of HTMLAnchorElement, but TypeScript doesn't know that'
		const data = transformHTMLElements(definitions);
		scrambleDefinitions = data;
		// Save the data to a JSON file
		const jsonData = JSON.stringify(data, null, 2);
		writeFileSync(DEFINITIONS_PATH, jsonData);
		return data;
	} catch (error) {
		console.error("Error fetching definitions:", error);
		throw error;
	}
}
export function getScrambledDefinition(
	definitions: Definition[],
): ScrambledDefinition {
	// Get one random Definition from the array and scramble it, get any other definitions that have the same length, characters and return them as well
	if (definitions.length === 0) {
		return {
			definitions: [],
			scrambledWord: "",
		};
	}

	// Get a random definition
	const randomIndex = Math.floor(Math.random() * definitions.length);
	const selectedDefinition = definitions[randomIndex];

	// Scramble the term
	const scrambledWord = scrambleWord(selectedDefinition.term);

	// Find other definitions with same length and character composition
	const matchingDefinitions = definitions.filter(
		(def) =>
			def.term.length === selectedDefinition.term.length &&
			hasSameCharacters(def.term, selectedDefinition.term),
	);

	return {
		definitions: matchingDefinitions,
		scrambledWord,
	};
}

function scrambleWord(word: string): string {
	const chars = word.split("");
	for (let i = chars.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[chars[i], chars[j]] = [chars[j], chars[i]];
	}
	return chars.join("");
}

function hasSameCharacters(word1: string, word2: string): boolean {
	if (word1.length !== word2.length) {
		return false;
	}

	const charCount1 = getCharacterCount(word1.toLowerCase());
	const charCount2 = getCharacterCount(word2.toLowerCase());

	// Check if both words have the same character counts
	for (const [char, count] of Object.entries(charCount1)) {
		if (charCount2[char] !== count) {
			return false;
		}
	}

	return true;
}

function getCharacterCount(word: string): Record<string, number> {
	const charCount: Record<string, number> = {};
	for (const char of word) {
		charCount[char] = (charCount[char] || 0) + 1;
	}
	return charCount;
}
