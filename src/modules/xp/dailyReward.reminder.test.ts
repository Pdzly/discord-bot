import { afterAll, afterEach, beforeAll, beforeEach, expect, jest, mock, test } from "bun:test";
import { install } from "@sinonjs/fake-timers";
import type { Client, Guild, GuildMember, TextChannel } from "discord.js";
import { clearUserCache, DDUser } from "../../store/models/DDUser.js";
import { getSequelizeInstance, initStorage } from "../../store/storage.js";
import {
	scheduleAllReminders,
	scheduledReminders,
} from "./dailyReward.reminder.js";

beforeAll(async () => {
	await initStorage();
});

afterEach(async () => {
	await getSequelizeInstance().destroyAll();
	clearUserCache();
	// Clear scheduled reminders
	for (const job of scheduledReminders.values()) {
		job.cancel();
	}
	scheduledReminders.clear();
});

export function fakeTimers() {
	const clock = install();

	beforeEach(() => {
		clock.reset();
	});

	afterAll(() => {
		clock.uninstall();
	});

	return clock;
}
const clock = fakeTimers();
test("scheduleAllReminders", async () => {
	console.log(new Date().toLocaleString());

	// Create real test users in the database
	await DDUser.create({
		id: 1n,
		xp: 0n,
		level: 0,
		bumps: 0,
		currentDailyStreak: 1,
		highestDailyStreak: 1,
		lastDailyTime: new Date(),
	});

	await DDUser.create({
		id: 2n,
		xp: 0n,
		level: 0,
		bumps: 0,
		currentDailyStreak: 1,
		highestDailyStreak: 1,
		lastDailyTime: new Date(),
	});

	const mockGuildFetch = mock(
		async () =>
			({
				members: {
					fetch: mockMembersFetch,
				},
			}) as unknown as Guild,
	);
	const mockChannelSend = mock(async () => Promise.resolve());
	const mockChannelFetch = mock(
		async () =>
			({
				isSendable: () => true,
				send: mockChannelSend,
			}) as unknown as TextChannel,
	);
	const mockMembersFetch = mock(
		async (id: string) =>
			({
				id: id,
				user: { tag: `User#${id}` },
				lastDailyTime: new Date(),
				premiumSinceTimestamp: Date.now(), // Make them special users
			}) as unknown as GuildMember,
	);

	const mockClient = {
		guilds: {
			fetch: mockGuildFetch,
		},
		channels: {
			fetch: mockChannelFetch,
		},
		members: {
			fetch: mockMembersFetch,
		},
	} as unknown as Client;

	await scheduleAllReminders(mockClient);

	expect(mockGuildFetch).toHaveBeenCalledTimes(1);
	expect(mockChannelFetch).toHaveBeenCalledTimes(0); // no immediate reminders

	await clock.tickAsync(1000 * 60 * 60 * 25); // fast forward 25 hours

	expect(scheduledReminders.size).toBe(2); // two users should have reminders scheduled

	expect(mockChannelFetch).toHaveBeenCalledTimes(2); // should have sent reminders for both users
	expect(scheduledReminders.size).toBe(2);
	expect(mockChannelSend).toHaveBeenCalledTimes(2);
	expect(mockChannelSend).toHaveBeenCalledWith({
		content: expect.stringContaining("<@1>"),
	});
	expect(mockChannelSend).toHaveBeenCalledWith({
		content: expect.stringContaining("<@2>"),
	});
});
