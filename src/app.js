import cors from "cors";
// initialize Discord client
import { Client, GatewayIntentBits, Partials } from "discord.js";
import express from "express";
import helmet from "helmet";

import morgan from "morgan";
import { startDiscordBot } from "./discord-bot/bot.js";
import { notifyDiscordWebhook } from "./discord-webhook/webhook.js";

import * as middlewares from "./middlewares.js";
import { startUserReactionListener } from "./user-reaction-listener/reaction-listener.js";

import { checkServer, startServerPolling } from "./utils/poller.js";

export const serverList = {
  // "Login Server": { host: "162.19.28.88", port: 3724 },
  Kezan: { host: "135.125.119.89", port: 8000 }, // old host: "162.19.28.88", port: 8085
  Gurubashi: { host: "162.19.28.88", port: 8086 },
};
export function getTimeString() {
  return `${new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })} PST`;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});
client.once("ready", () => {
  console.log(`✅ Epoch Status Bot is logged in as ${client.user.tag} and listening to user reactions.`);
});

// Server polling for webhook
startServerPolling();

// Turn Discord Epoch Status Bot online
startDiscordBot(client);

// Turn user reaction bot listener online
startUserReactionListener(client);

const app = express();

app.use(morgan("dev"));
app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/", async (req, res) => {
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

    res.json({
      checkedAt: getTimeString(),
      servers: results,
    });
  }
  catch (err) {
    console.error("Error checking servers:", err);
    res.status(500).json({ error: "Failed to check all servers" });
  }
});

app.post("/test-webhook", async (req, res) => {
  try {
    await notifyDiscordWebhook("Test Server", true);
    res.json({ message: "Test message sent." });
  }
  catch {
    res.status(500).json({ error: "Failed to send test." });
  }
});

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

export default app;
