require('dotenv').config();

const { 
  Client, 
  Events, 
  GatewayIntentBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle 
} = require('discord.js');

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ] 
});

// Toutes les réponses stockées par questionId
// questionId => Map { userId => [ {username, answer}, ... ] }
const allAnswers = new Map();

// Pour simplifier, on stocke en mémoire l'ID de la question active
// Quand on lance !quiz, on génère un ID unique et on le garde en mémoire
let currentQuestionId = null;

client.once(Events.ClientReady, () => {
  console.log(`✅ ${client.user.tag} est prêt !`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.content.startsWith('!quiz')) return;

  // Supprime la commande !quiz
  await message.delete();

  // Crée un nouvel ID pour la question (timestamp par exemple)
  currentQuestionId = Date.now().toString();

  // Initialise la Map des réponses pour cette question
  allAnswers.set(currentQuestionId, new Map());

  const embed = new EmbedBuilder()
    .setTitle("Devinez le titre du livre!")
    .setImage("https://exemple.com/votre-image.jpg")
    .setColor("#00ff00");

  const button = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('repondre')
      .setLabel('Répondre')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('voir_reponses')
      .setLabel('Voir les réponses')
      .setStyle(ButtonStyle.Secondary)
  );

  await message.channel.send({ embeds: [embed], components: [button] });
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton()) {
    if (interaction.customId === 'repondre') {
      if (!currentQuestionId) {
        return interaction.reply({ content: "Il n'y a pas de quiz actif.", ephemeral: true });
      }
      const modal = new ModalBuilder()
        .setCustomId('reponseModal')
        .setTitle('Votre réponse');

      const input = new TextInputBuilder()
        .setCustomId('reponseInput')
        .setLabel('Quelle est votre réponse ?')
        .setStyle(TextInputStyle.Short);

      const row = new ActionRowBuilder().addComponents(input);
      modal.addComponents(row);
      await interaction.showModal(modal);
    }

    if (interaction.customId === 'voir_reponses') {
      if (!currentQuestionId) {
        return interaction.reply({ content: "Il n'y a pas de quiz actif.", ephemeral: true });
      }

      const questionAnswers = allAnswers.get(currentQuestionId);

      if (!questionAnswers || questionAnswers.size === 0) {
        await interaction.reply({ content: "Personne n'a encore répondu à cette question 😢", ephemeral: true });
      } else {
        let reponses = `**Réponses :**\n`;
        questionAnswers.forEach((userAnswers, userId) => {
          userAnswers.forEach(({ username, answer }, index) => {
            reponses += `- ${username} (réponse ${index + 1}) : ${answer}\n`;
          });
        });
        await interaction.reply({ content: reponses, ephemeral: true });
      }
    }
  } 
  else if (interaction.isModalSubmit()) {
    if (interaction.customId === 'reponseModal') {
      if (!currentQuestionId) {
        return interaction.reply({ content: "Il n'y a pas de quiz actif.", ephemeral: true });
      }

      const reponse = interaction.fields.getTextInputValue('reponseInput');

      const questionAnswers = allAnswers.get(currentQuestionId);

      if (!questionAnswers) {
        allAnswers.set(currentQuestionId, new Map());
      }

      const userAnswers = questionAnswers.get(interaction.user.id) || [];
      userAnswers.push({ username: interaction.user.username, answer: reponse });
      questionAnswers.set(interaction.user.id, userAnswers);

      await interaction.reply({ content: "✅ Réponse enregistrée !", ephemeral: true });
    }
  }
});

client.login(process.env.TOKEN).catch(err => {
  console.error("Erreur lors de la connexion :", err);
});
