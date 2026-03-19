require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
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
  partials: [Partials.Channel, Partials.Message],
});

const MONITORING_CHANNEL_ID = process.env.MONITORING_CHANNEL_ID;
const BOT_TOKEN = process.env.BOT_TOKEN;
const API_SECRET = process.env.API_SECRET;

// 📋 답장 템플릿 목록
const REPLY_TEMPLATES = [
  { label: "✅ 확인했어요!", value: "확인했습니다! 감사해요 😊" },
  { label: "💪 응원해요!", value: "항상 응원하고 있어요! 화이팅! 🐉" },
  {
    label: "📚 열심히 하세요!",
    value: "열심히 달려가는 모습이 멋져요! 계속 파이팅! 💪",
  },
  {
    label: "🙏 감사해요!",
    value: "따뜻한 말씀 감사해요! 망나뇽도 응원할게요 🐉",
  },
  { label: "✏️ 직접 입력", value: "CUSTOM" },
];

// ✅ Make → 배달 완료 알림 API (예쁜 버전)
app.post("/delivered", async (req, res) => {
  const { secret, recipientName, recipientId } = req.body;
  if (secret !== API_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const monitoringChannel = await client.channels.fetch(
      MONITORING_CHANNEL_ID,
    );

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setAuthor({
        name: "망나뇽 우체통",
        iconURL: client.user.displayAvatarURL(),
      })
      .setTitle("📬 편지가 배달되었어요!")
      .setDescription(`**${recipientName}** 님께 오늘의 편지를 전달했습니다 💌`)
      .addFields(
        { name: "👤 받은 사람", value: `${recipientName}`, inline: true },
        { name: "🆔 Discord ID", value: `${recipientId}`, inline: true },
        { name: "📮 상태", value: "✅ 발송 완료", inline: true },
      )
      .setFooter({ text: "코드잇 우체통 • 망나뇽이 배달했어요 🐉" })
      .setTimestamp();

    await monitoringChannel.send({ embeds: [embed] });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send" });
  }
});

// 🔔 DM 수신 → 모니터링 채널 전달
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
    .setDescription(`> ${message.content}`)
    .addFields({
      name: "보낸 사람",
      value: `@${message.author.username} (ID: ${message.author.id})`,
    })
    .setTimestamp();

  // 템플릿 선택 메뉴
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`template_${message.author.id}`)
    .setPlaceholder("📩 답장 템플릿 선택...")
    .addOptions(
      REPLY_TEMPLATES.map((t) => ({
        label: t.label,
        value: t.value,
      })),
    );

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await monitoringChannel.send({
    content: `🔔 <@${message.author.id}> 님의 DM 도착!`,
    embeds: [embed],
    components: [row],
  });
});

// 🎛️ 인터랙션 처리
client.on("interactionCreate", async (interaction) => {
  // 템플릿 선택
  if (
    interaction.isStringSelectMenu() &&
    interaction.customId.startsWith("template_")
  ) {
    const userId = interaction.customId.replace("template_", "");
    const selected = interaction.values[0];

    // 직접 입력 선택 시 모달 띄우기
    if (selected === "CUSTOM") {
      const modal = new ModalBuilder()
        .setCustomId(`modal_${userId}`)
        .setTitle("망나뇽 답장 보내기 ✏️");

      const input = new TextInputBuilder()
        .setCustomId("replyContent")
        .setLabel("답장 내용")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("답장 내용을 입력하세요...")
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await interaction.showModal(modal);
      return;
    }

    // 템플릿 바로 전송
    try {
      const user = await client.users.fetch(userId);
      await user.send(`📨 망나뇽의 답장이 도착했어요!\n\n${selected}`);
      await interaction.reply({
        content: `✅ **${user.displayName}** 님께 답장을 보냈어요!\n> ${selected}`,
        ephemeral: true,
      });
    } catch (err) {
      await interaction.reply({
        content: "❌ 답장 전송에 실패했습니다.",
        ephemeral: true,
      });
    }
  }

  // 모달 제출 (직접 입력)
  if (
    interaction.isModalSubmit() &&
    interaction.customId.startsWith("modal_")
  ) {
    const userId = interaction.customId.replace("modal_", "");
    const replyContent = interaction.fields.getTextInputValue("replyContent");

    try {
      const user = await client.users.fetch(userId);
      await user.send(`📨 망나뇽의 답장이 도착했어요!\n\n${replyContent}`);
      await interaction.reply({
        content: `✅ **${user.displayName}** 님께 답장을 보냈어요!\n> ${replyContent}`,
        ephemeral: true,
      });
    } catch (err) {
      await interaction.reply({
        content: "❌ 답장 전송에 실패했습니다.",
        ephemeral: true,
      });
    }
  }
});

client.once("ready", () => {
  console.log(`✅ ${client.user.tag} 온라인!`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API 서버 실행중: ${PORT}`);
});

client.login(BOT_TOKEN);
