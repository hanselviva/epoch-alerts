import net from "node:net";
import { getTimeString, serverList } from "../app.js";
import { notifyDiscordBot } from "../discord-bot/bot.js";
import { notifyDiscordWebhook } from "../discord-webhook/webhook.js";
import { sendUserAlert } from "../user-reaction-listener/reaction-listener.js";

const serverStates = {};
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK;

export async function checkServer(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function pollServers() {
  for (const [name, { host, port }] of Object.entries(serverList)) {
    const previous = serverStates[name]?.online ?? null;
    const current = await checkServer(host, port);

    previous === null && console.log("--- Polling has started ---");

    if (!serverStates[name]) {
      serverStates[name] = {
        online: current,
        lastOnline: null,
        lastChange: getTimeString(),
      };
    //   await notifyDiscordWebhook(name, current);
    //   await notifyDiscordBot(name, current);
    //   await sendUserAlert(name, current);
    }
    else if (current !== previous) {
      console.log(`**${name}** state changed}
      to ${current ? "Online" : "Offline"} at ${getTimeString()}`);

      serverStates[name].lastOnline = previous;
      serverStates[name].lastChange = getTimeString();
      serverStates[name].online = current;
      await notifyDiscordWebhook(name, current);
      await notifyDiscordBot(name, current);
      await sendUserAlert(name, current);
    }
  }
}

export async function startServerPolling() {
  if (!WEBHOOK_URL) {
    console.warn("DISCORD_WEBHOOK is not set. Polling disabled.");
    return;
  }

  async function startPolling() {
    await pollServers();
    setTimeout(startPolling, 10000);
  }

  startPolling();
}
