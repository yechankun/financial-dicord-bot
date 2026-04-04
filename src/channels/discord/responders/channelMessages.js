export async function resolvePostingChannel(interaction) {
  const channel =
    interaction.channel ??
    (interaction.channelId
      ? await interaction.client.channels
          .fetch(interaction.channelId)
          .catch(() => null)
      : null);

  if (!channel || typeof channel.send !== "function") {
    throw new Error(
      "이 채널에는 봇이 메시지를 올릴 수 없다냥. 채널 권한을 확인해달라냥.",
    );
  }

  return channel;
}

export async function editProgressMessage(progressMessage, options) {
  if (!progressMessage) {
    throw new Error("Progress message is not available.");
  }

  return progressMessage.edit(options);
}

export async function createProgressMessage(interaction, content) {
  const channel = await resolvePostingChannel(interaction);
  return channel.send({ content });
}
