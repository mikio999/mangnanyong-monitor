require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  Partials,
} = require("discord.js");
const express = require("express");

const app = express();
app.use(express.json());

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message], // 문자열 말고 enum으로!
});

const MONITORING_CHANNEL_ID = process.env.MONITORING_CHANNEL_ID;
const BOT_TOKEN = process.env.BOT_TOKEN;
const API_SECRET = process.env.API_SECRET; // Make 연동용 인증키

// ✅ Make → 망나뇽이 편지 배달 완료 알림 API
app.post("/delivered", async (req, res) => {
  const { secret, recipientName, recipientId } = req.body;

  // 인증 확인
  if (secret !== API_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const monitoringChannel = await client.channels.fetch(
      MONITORING_CHANNEL_ID,
    );

    const embed = new EmbedBuilder()
      .setColor(0x57f287) // 초록색
      .setTitle("📬 편지 배달 완료!")
      .addFields(
        { name: "받은 사람", value: `${recipientName} (ID: ${recipientId})` },
        { name: "상태", value: "✅ DM 발송 성공" },
      )
      .setTimestamp();

    await monitoringChannel.send({ embeds: [embed] });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send" });
  }
});

// 🔔 DM 답장 감지 → 모니터링 채널 전달
client.on("messageCreate", async (message) => {
  if (message.channel.type !== 1) return;
  if (message.author.bot) return;

  const monitoringChannel = await client.channels.fetch(MONITORING_CHANNEL_ID);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setAuthor({
      name: `${message.author.displayName} (${message.author.username})`,
      iconURL: message.author.displayAvatarURL(),
    })
    .setDescription(message.content)
    .addFields({
      name: "보낸 사람",
      value: `@${message.author.username} (ID: ${message.author.id})`,
    })
    .setTimestamp();

  await monitoringChannel.send({
    content: `🔔 <@${message.author.id}> 님의 DM 도착!`,
    embeds: [embed],
  });
});

client.once("ready", () => {
  console.log(`✅ ${client.user.tag} 온라인!`);
});

// Express 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API 서버 실행중: ${PORT}`);
});

client.login(BOT_TOKEN);
