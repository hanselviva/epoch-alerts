import fetch from "node-fetch";
import { getTimeString, serverList } from "../app.js";
import { notifyDiscordWebhook } from "../discord-webhook/webhook.js";

const serverStates = {};
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK;

export async function checkServer(host, port) {
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
      // await notifyDiscordWebhook(name, current);
    }
    else if (current !== previous) {
      serverStates[name].lastOnline = previous;
      serverStates[name].lastChange = getTimeString();
      serverStates[name].online = current;
      await notifyDiscordWebhook(name, current);
    }
  }

  console.log(`[${getTimeString()}] ------------Polling done.`);
}

export async function startServerPolling() {
  if (!WEBHOOK_URL) {
    console.warn("DISCORD_WEBHOOK is not set. Polling disabled.");
    return;
  }

  async function startPolling() {
    await pollServers();
    setTimeout(startPolling, 3000);
  }

  startPolling();
}
