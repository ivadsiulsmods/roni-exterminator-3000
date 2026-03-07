import {
  createBot,
  Intents,
  InteractionTypes,
  ApplicationCommandOptionTypes,
} from "discordeno";
import { config, isGifOrInstagramLink } from "./config.js";

function getOption(interaction: any, name: string) {
  return interaction.data?.options?.find((o: any) => o.name === name)?.value;
}

const usersPreventedFromMessaging = new Map<bigint, string | undefined>();

const bot = createBot({
  token: process.env.DISCORD_TOKEN!,
  intents: Intents.Guilds | Intents.GuildMessages | Intents.MessageContent,

  desiredProperties: {
    message: {
      id: true,
      content: true,
      author: true,
      attachments: true,
      guildId: true,
      channelId: true,
    },
    interaction: {
      type: true,
      data: true,
      id: true,
      token: true,
      channelId: true,
      channel: true,
      guildId: true,
      guild: true,
    },
    user: {
      id: true,
      bot: true,
      tag: true,
      system: true,
      verified: true,
    },
    channel: {
      id: true,
    },
  },

  events: {
    async messageCreate(message) {
      const author = message.author;

      if ((author as any).bot) return;

      const userId = author.id;
      if (!userId) return;

      if (!config.watchedUserIds.includes(userId)) return;

      if (usersPreventedFromMessaging.has(userId)) {
        bot.helpers.deleteMessage(message.channelId.toString(), message.id);

        const customDm = usersPreventedFromMessaging.get(userId);

        const randomMessage =
          config.dmMessages[
            Math.floor(Math.random() * config.dmMessages.length)
          ];

        const dmChannel = await bot.helpers.getDmChannel(userId);

        await bot.helpers.sendMessage(dmChannel.id.toString(), {
          content: customDm ?? randomMessage,
        });

        return;
      }

      const content = message.content ?? "";
      const hasGifAttachment = message.attachments?.some(
        (att: { contentType?: string }) =>
          att.contentType?.includes("image/gif"),
      );

      if (!isGifOrInstagramLink(content) && !hasGifAttachment) return;

      bot.helpers.deleteMessage(message.channelId, message.id);

      const guildId = message.guildId;
      if (!guildId) return;

      try {
        const member = await bot.helpers.getMember(guildId, userId);
        if (!member) return;

        const timeoutUntil = new Date(
          Date.now() + config.timeoutDurationSeconds * 1000,
        ).toISOString();

        await bot.helpers.editMember(guildId, userId, {
          communicationDisabledUntil: timeoutUntil,
        });

        const randomMessage =
          config.dmMessages[
            Math.floor(Math.random() * config.dmMessages.length)
          ];

        const dmChannel = await bot.helpers.getDmChannel(userId);
        await bot.helpers.sendMessage(dmChannel.id.toString(), {
          content: randomMessage,
        });
      } catch (error) {
        console.error("Failed to timeout user:", error);
      }
    },

    interactionCreate(interaction) {
      if (interaction.type !== InteractionTypes.ApplicationCommand) return;

      if (interaction.data?.name === "antironi") {
        const duration = getOption(interaction, "duration") ?? 30;
        const type = getOption(interaction, "type");
        const customDm = getOption(interaction, "custom-dm");

        bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
          type: 4,
          data: {
            content: "Alright.",
          },
        });

        if (type === "timeout") {
          const channelId = interaction.channelId?.toString();
          const guildId = interaction.guildId?.toString();
          if (!channelId || !guildId) {
            console.error("No channelId or guildId found for interaction");
            return;
          }
          bot.helpers.sendMessage(channelId, {
            content: "Loading the GLOCK...",
          });

          Bun.sleep(2000).then(() => {
            bot.helpers.sendMessage(channelId, {
              content: "GLOCK loaded, say goodbye....",
            });

            Bun.sleep(1000).then(() => {
              for (const userId of config.watchedUserIds) {
                bot.helpers.editMember(guildId, userId, {
                  communicationDisabledUntil: new Date(
                    Date.now() + duration * 1000,
                  ).toISOString(),
                });

                bot.helpers.sendMessage(channelId, {
                  content: "Timed out: <@" + userId + ">",
                });

                const randomMessage =
                  config.dmMessages[
                    Math.floor(Math.random() * config.dmMessages.length)
                  ];

                bot.helpers.getDmChannel(userId).then((dmChannel) => {
                  bot.helpers.sendMessage(dmChannel.id.toString(), {
                    content: customDm ?? randomMessage,
                  });
                });
              }
            });
          });
        } else if (type === "prevent-messages") {
          const channelId = interaction.channelId?.toString();
          if (!channelId) {
            console.error("No channelId found for interaction");
            return;
          }
          for (const userId of config.watchedUserIds) {
            bot.helpers.sendMessage(channelId, {
              content:
                "Let's just say... you won't be hearing from <@" +
                userId +
                "> for the next " +
                duration.toString() +
                " seconds...",
            });

            usersPreventedFromMessaging.set(userId, customDm);

            Bun.sleep(duration * 1000).then(() => {
              usersPreventedFromMessaging.delete(userId);
            });
          }
        }
      }
    },
  },
});

const antiRoniCommand = {
  name: "antironi",
  description: "Prevent roni from typing in this channel for 30 seconds",
  options: [
    {
      type: ApplicationCommandOptionTypes.String,
      name: "type",
      description: "Type of punishment.",
      required: true,
      choices: [
        { name: "Timeout", value: "timeout" },
        { name: "Prevent Messages", value: "prevent-messages" },
      ],
    },
    {
      type: ApplicationCommandOptionTypes.Number,
      name: "duration",
      description: "Specific duration to prevent roni.",
      autocomplete: true,
      required: false,
    },
    {
      type: ApplicationCommandOptionTypes.String,
      name: "custom-dm",
      description: "Custom roni DM.",
      autocomplete: true,
      required: false,
    },
  ],
};

await bot.helpers.upsertGlobalApplicationCommands([antiRoniCommand]);

process.on("SIGINT", () => {
  console.log("Shutting down...");
  bot.shutdown?.();
  process.exit(0);
});

bot.start();
