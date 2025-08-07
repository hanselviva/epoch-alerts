import { Client, GatewayIntentBits } from "discord.js";
import { getTimeString, serverList } from "../app.js";
import { checkServer } from "../utils/poller.js";

const TOKEN = process.env.DISCORD_TOKEN;

export async function startDiscordBot() {
  if (!TOKEN)
    return;

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  });

  client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
  });

  client.on("messageCreate", async (message) => {
    // console.log(`[${message.author.tag}] said: ${message.content}`);

    if (message.author.bot)
      return;

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
Type STOP to stop getting alerts in this channel.`;

        // ADD logic: add the channel to an external file so keep track of which channel to notify

        message.channel.send(replyText);
      }
      catch (err) {
        console.error("Error checking servers:", err);
        message.channel.send("Sorry, something went wrong.");
      }
    }

    // stopping alert
    if (message.content.toLowerCase() === "!stop epoch status alerts") {
      message.channel.send(`This bot will now **stop** alerting this channel when there are changes in server status.`);

      // ADD logic: remove the channel from an external file so keep track of which channel to notify
    }
  });

  client.login(TOKEN);
}
