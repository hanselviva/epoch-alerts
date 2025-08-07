import { Client, GatewayIntentBits } from "discord.js";
import { getTimeString, serverList } from "../app.js";
import { checkServer } from "../discord-webhook/webhook.js";

// Hardcoded token (replace with your actual token)
const TOKEN = process.env.DISCORD_TOKEN;

export async function startDiscordBot() {
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

    if (message.content.toLowerCase() === "status") {
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

        const replyText = `**Server Status as of ${getTimeString()}**\n\n${
          results.map(s => `**${s.name}**: ${s.status}`).join("\n")}`;

        message.channel.send(replyText);
      }
      catch (err) {
        console.error("Error checking servers:", err);
        message.channel.send("Sorry, something went wrong.");
      }
    }
  });

  client.login(TOKEN);
}
