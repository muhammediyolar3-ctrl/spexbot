require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  SlashCommandBuilder,
  Routes
} = require('discord.js');

const { REST } = require('@discordjs/rest');

const token = process.env.TOKEN;
const clientId = '1523174441482457249';
const guildId = '1502218298396381224';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.GuildMember]
});

const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Ping gösterir')
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(token);

(async () => {

  await rest.put(
    Routes.applicationGuildCommands(clientId, guildId),
    { body: commands }
  );

  console.log('Komutlar yüklendi!');

})();

client.on('clientReady', () => {
  console.log(`${client.user.tag} aktif!`);
});

client.on('guildMemberAdd', member => {

  const kanal = member.guild.channels.cache.get('1504827930771980329');

  if (!kanal) return;

  kanal.send(
`Hoş geldin ${member.displayName} 👋
Şu an ${member.guild.memberCount} kişiyiz 🚀`
  );

});

client.on('guildMemberRemove', member => {

  const kanal = member.guild.channels.cache.get('1504827930771980329');

  if (!kanal) return;

  kanal.send(
`${member.user.username} sunucudan ayrıldı 👋
Şu an ${member.guild.memberCount} kişiyiz`
  );

});

client.on('interactionCreate', async interaction => {

  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {

    await interaction.reply(`${client.ws.ping}ms`);

  }

});

client.login(token);