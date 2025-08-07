import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { startDiscordBot } from "./discord-bot/bot.js";
import { checkServer, notifyDiscordWebhook, startServerPolling } from "./discord-webhook/webhook.js";
import * as middlewares from "./middlewares.js";

export const serverList = {
  // "Login Server": { host: "game.project-epoch.net", port: 3724 },
  Kezan: { host: "game.project-epoch.net", port: 8085 },
  Gurubashi: { host: "game.project-epoch.net", port: 8086 },
};
export function getTimeString() {
  return new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
}

// ----------------------
// Server polling for webhook
startServerPolling();
// ----------------------

// ----------------------
// Turn Discord bot online
startDiscordBot();
// ----------------------

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
