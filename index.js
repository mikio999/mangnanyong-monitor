require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: ["CHANNEL", "MESSAGE"],
});

const MONITORING_CHANNEL_ID = process.env.MONITORING_CHANNEL_ID;
const BOT_TOKEN = process.env.BOT_TOKEN;

client.once("ready", () => {
  console.log(`✅ ${client.user.tag} 온라인!`);
});

client.on("messageCreate", async (message) => {
  if (message.channel.type !== 1) return;
  if (message.author.bot) return;

  const monitoringChannel = await client.channels.fetch(MONITORING_CHANNEL_ID);

  await monitoringChannel.send({
    content:
      `🐉 **@${message.author.username}** 님의 DM 도착!\n\n` +
      `> ${message.content}\n\n` +
      `보낸 사람\n` +
      `@${message.author.username} (ID: ${message.author.id})`,
  });
});

client.login(BOT_TOKEN);
