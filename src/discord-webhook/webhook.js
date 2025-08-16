import fetch from "node-fetch";
import { getTimeString } from "../app.js";

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK;

export async function notifyDiscordWebhook(serverName, isOnline) {
  if (!WEBHOOK_URL)
    return;

  const statusText = isOnline ? "ONLINE" : "OFFLINE";
  const statusIcon = isOnline ? "🟢" : "🔴";
  const time = getTimeString();

  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content:
        `Testing new Ascension endpoint ---
        ${statusIcon}  **${serverName}** is now ${statusText}
        ${time}`,
      }),
    });
  }
  catch (err) {
    console.error("Failed to send Discord message:", err);
  }
}
