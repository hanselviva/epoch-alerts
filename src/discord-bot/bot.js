import { Client, GatewayIntentBits } from "discord.js";
import jsonfile from "jsonfile";

import { getTimeString, serverList } from "../app.js";
import { checkServer } from "../utils/poller.js";

const ALERT_CHANNELS_FILE = process.env.NODE_ENV === "production" ? "/mnt/data/alert-channels.json" : "./src/discord-bot/alert-channels.json";

async function getAlertChannels() {
  try {
    return await jsonfile.readFile(ALERT_CHANNELS_FILE);
  }
  catch {
    return [];
  }
}

async function addAlertChannel(channelId) {
  console.log("addAlertChannel", channelId);
  const channels = await getAlertChannels();
  if (!channels.includes(channelId)) {
    channels.push(channelId);
    await jsonfile.writeFile(ALERT_CHANNELS_FILE, channels, { spaces: 2 });
  }
}

async function removeAlertChannel(channelId) {
  console.log("removeAlertChannel", channelId);
  const channels = await getAlertChannels();
  const updated = channels.filter(id => id !== channelId);
  await jsonfile.writeFile(ALERT_CHANNELS_FILE, updated, { spaces: 2 });
}

const TOKEN = process.env.DISCORD_TOKEN;
export async function startDiscordBot(client) {
  if (!TOKEN)
    return;

  client.on("messageCreate", async (message) => {
    // console.log(`[${message.author.tag}] said: ${message.content}`);

    if (message.author.bot)
      return;

    // get current status
    if (message.content.toLowerCase() === "!epoch status") {
      try {
        const results = await Promise.all(
          Object.entries(serverList).map(async ([name, { host, port }]) => {
            const isOnline = await checkServer(host, port);
            return {
              name,
              online: isOnline,
              status: isOnline ? "🟢 Online" : "🔴 Offline",
            };
          }),
        );

        const replyText = `Server Status as of **${getTimeString()}**\n\n${
          results.map(s => `**${s.name}**: ${s.status}`).join("\n")}`;

        message.channel.send(replyText);
      }
      catch (err) {
        console.error("Error checking servers:", err);
        message.channel.send("Sorry, something went wrong.");
      }
    }

    // starting alerts
    if (message.content.toLowerCase() === "!start epoch status alerts") {
      try {
        const results = await Promise.all(
          Object.entries(serverList).map(async ([name, { host, port }]) => {
            const isOnline = await checkServer(host, port);
            return {
              name,
              online: isOnline,
              status: isOnline ? "🟢 Online" : "🔴 Offline",
            };
          }),
        );

        const replyText = `Server Status as of **${getTimeString()}**\n\n${
          results.map(s => `**${s.name}**: ${s.status}`).join("\n")}
   
This bot will now **start** alerting this channel when there are changes in server status.
Type \`!stop epoch status alerts\` to stop getting alerts in this channel.`;

        message.channel.send(replyText);
        await addAlertChannel(message.channel.id);
      }
      catch (err) {
        console.error("Error checking servers:", err);
        message.channel.send("Sorry, something went wrong.");
      }
    }

    // stopping alerts
    if (message.content.toLowerCase() === "!stop epoch status alerts") {
      message.channel.send(
        `
This bot will now **stop** alerting this channel when there are changes in server status.
Type \`!start epoch status alerts\` to start getting alerts in this channel.`,
      );

      await removeAlertChannel(message.channel.id);
    }
  });

  client.login(TOKEN);
};

export async function notifyDiscordBot(serverName, isOnline) {
  const channels = await getAlertChannels();

  if (!TOKEN || channels.length === 0) {
    console.warn("Bot token missing or no channels to notify.");
    return;
  }

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });

  await client.login(TOKEN);

  const statusText = isOnline ? "🟢 Online" : "🔴 Offline";
  const time = getTimeString();

  for (const channelId of channels) {
    try {
      const channel = await client.channels.fetch(channelId);
      if (channel && channel.isTextBased()) {
        await channel.send(`**${serverName}** is now **${statusText}** as of **${time}**`);
      }
    }
    catch (err) {
      console.error(`Failed to send alert to channel ${channelId}`, err);
    }
  }

  await client.destroy();
}
