import { Client, GatewayIntentBits, Partials } from "discord.js";
import jsonfile from "jsonfile";

import { getTimeString } from "../app.js";

const ALERT_USERS_FILE
  = process.env.NODE_ENV === "production"
    ? "/mnt/data/alert-users.json"
    : "./src/discord-bot/alert-users.json";

async function getAlertUsers() {
  try {
    return await jsonfile.readFile(ALERT_USERS_FILE);
  }
  catch {
    return [];
  }
}

async function addAlertUser(userId) {
  console.log("addAlertUser", userId);
  const users = await getAlertUsers();
  if (!users.includes(userId)) {
    users.push(userId);
    await jsonfile.writeFile(ALERT_USERS_FILE, users, { spaces: 2 });
  }
}

async function removeAlertUser(userId) {
  console.log("removeAlertUser", userId);
  const users = await getAlertUsers();
  const updated = users.filter(id => id !== userId);
  await jsonfile.writeFile(ALERT_USERS_FILE, updated, { spaces: 2 });
}

const TOKEN = process.env.DISCORD_TOKEN;
const TRACKED_MESSAGE_ID = process.env.DISCORD_ALERT_MESSAGE_ID;
const TRACKED_EMOJI = process.env.DISCORD_ALERT_EMOJI || "🔔";

export async function startUserReactionListener(client) {
  if (!TOKEN || !TRACKED_MESSAGE_ID)
    return;

  // Handle reaction add
  client.on("messageReactionAdd", async (reaction, user) => {
    if (user.bot)
      return;

    // Ensure partials are fetched
    if (reaction.partial)
      await reaction.fetch();
    if (reaction.message.partial)
      await reaction.message.fetch();

    if (
      reaction.message.id === TRACKED_MESSAGE_ID
      && reaction.emoji.name === TRACKED_EMOJI
    ) {
      user.send("You will now **start** receiving alerts when there are changes in server status.");
      await addAlertUser(user.id);
    }
  });

  // Handle reaction remove
  client.on("messageReactionRemove", async (reaction, user) => {
    if (user.bot)
      return;

    if (reaction.partial)
      await reaction.fetch();
    if (reaction.message.partial)
      await reaction.message.fetch();

    if (
      reaction.message.id === TRACKED_MESSAGE_ID
      && reaction.emoji.name === TRACKED_EMOJI
    ) {
      user.send("You will now **stop** receiving alerts when there are changes in server status.");
      await removeAlertUser(user.id);
    }
  });

  await client.login(TOKEN);
}

export async function sendUserAlert(serverName, isOnline) {
  const time = getTimeString();
  const statusText = isOnline ? "🟢 Online" : "🔴 Offline";
  console.log(`**${serverName}** is now **${statusText}** as of **${time}**`);

  const users = await getAlertUsers();
  if (users.length === 0)
    return;

  const client = new Client({
    intents: [GatewayIntentBits.DirectMessages],
    partials: [Partials.Channel],
  });
  await client.login(TOKEN);

  for (const userId of users) {
    try {
      const user = await client.users.fetch(userId);
      await user.send(
        `Testing new Ascension endpoint ---
**${serverName}** is now ${statusText} (as of ${time})`,
      );
    }
    catch (err) {
      console.error(`Failed to DM user ${userId}:`, err);
    }
  }
  client.destroy();
}
