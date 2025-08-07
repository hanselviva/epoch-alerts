/* eslint-disable no-console */
/* eslint-disable node/no-process-env */
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

// ----------------------
// Background polling logic
// ----------------------
import fetch from "node-fetch";
import api from "./api/index.js";

import * as middlewares from "./middlewares.js";

const serverList = {
  "Login Server": { host: "game.project-epoch.net", port: 3724 },
  "Kezan": { host: "game.project-epoch.net", port: 8085 },
  "Gurubashi": { host: "game.project-epoch.net", port: 8086 },
};

const serverStates = {};
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK;

function getTimeString() {
  return new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
}

async function checkServer(host, port) {
  const targetUrl = `https://portchecker.io/api/${host}/${port}`;

  try {
    const res = await fetch(targetUrl);
    const rawText = await res.text();
    const portStatus = rawText.trim(); // "True" or "False"
    return portStatus === "True";
  }
  catch (err) {
    console.error(`Error checking ${host}:${port}`, err);
    return false;
  }
}

async function notifyDiscord(serverName, isOnline) {
  if (!WEBHOOK_URL)
    return; // Skip if no webhook URL set

  const statusText = isOnline ? "ONLINE" : "OFFLINE";
  const statusIcon = isOnline ? "🟢" : "🔴";
  const time = getTimeString();

  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content:
        `${statusIcon} **${serverName}** is now ${statusText}
        ${time}`,
      }),
    });
  }
  catch (err) {
    console.error("Failed to send Discord message:", err);
  }
}

async function pollServers() {
  console.log(`[${getTimeString()}] ------------Polling started.------------`);

  for (const [name, { host, port }] of Object.entries(serverList)) {
    const previous = serverStates[name]?.online ?? null;
    const current = await checkServer(host, port);

    if (!serverStates[name]) {
      serverStates[name] = {
        online: current,
        lastOnline: null,
        lastChange: getTimeString(),
      };
      await notifyDiscord(name, current);
    }
    else if (current !== previous) {
      serverStates[name].lastOnline = previous;
      serverStates[name].lastChange = getTimeString();
      serverStates[name].online = current;
      await notifyDiscord(name, current);
    }
  }

  console.log(`[${getTimeString()}] ------------Polling done.`);
}

// Start polling every 15 seconds only if webhook URL is set
if (WEBHOOK_URL) {
  pollServers();
  setInterval(pollServers, 15000);
}
else {
  console.warn("DISCORD_WEBHOOK is not set. Polling disabled.");
}

// ----------------------
// Express app setup
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

app.use("/api/v1", api);

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

export default app;
