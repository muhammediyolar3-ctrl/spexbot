require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  SlashCommandBuilder,
  Routes,
  PermissionFlagsBits
} = require('discord.js');

const { REST } = require('@discordjs/rest');

const token = process.env.TOKEN;
const clientId = '1523174441482457249';
const guildId = '1502218298396381224';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions // Çekiliş emojilerini takip etmek için eklendi
  ],
  partials: [Partials.GuildMember, Partials.Message, Partials.Reaction] // Çekiliş için partials güncellendi
});

const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Ping gösterir'),

  new SlashCommandBuilder()
    .setName('sil')
    .setDescription('Mesaj siler')
    .addIntegerOption(option =>
      option
        .setName('miktar')
        .setDescription('Silinecek mesaj sayısı')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  // YENİ: Çekiliş Komutu
  new SlashCommandBuilder()
    .setName('çekiliş')
    .setDescription('Çekiliş başlatır')
    .addStringOption(option =>
      option
        .setName('ödül')
        .setDescription('Çekiliş ödülü nedir?')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('süre')
        .setDescription('Çekiliş süresi (saniye cinsinden)')
        .setRequired(true)
        .setMinValue(5)
    )
    .addIntegerOption(option =>
      option
        .setName('kazanan')
        .setDescription('Kaç kişi kazanacak?')
        .setRequired(true)
        .setMinValue(1)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Sadece yöneticiler kullanabilir

].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );
    console.log('Komutlar yüklendi!');
  } catch (error) {
    console.error(error);
  }
})();

// Düzeltme: Discord.js v14'te etkinlik ismi 'ready' olmalıdır
client.on('ready', () => {
  console.log(`${client.user.tag} aktif!`);
});

client.on('guildMemberAdd', member => {
  const kanal = member.guild.channels.cache.get('1504827930771980329');
  if (!kanal) return;
  kanal.send(`Hoş geldin ${member.displayName} 👋\nŞu an ${member.guild.memberCount} kişiyiz 🚀`);
});

client.on('guildMemberRemove', member => {
  const kanal = member.guild.channels.cache.get('1504827930771980329');
  if (!kanal) return;
  kanal.send(`${member.user.username} sunucudan ayrıldı 👋\nŞu an ${member.guild.memberCount} kişiyiz`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply(`${client.ws.ping}ms`);
  }

  if (interaction.commandName === 'sil') {
    const miktar = interaction.options.getInteger('miktar');
    try {
      await interaction.channel.bulkDelete(miktar, true);
      await interaction.reply({
        content: `🗑️ ${miktar} mesaj silindi!`,
        ephemeral: true
      });
    } catch (err) {
      await interaction.reply({
        content: 'Mesajlar silinemedi.',
        ephemeral: true
      });
    }
  }

  // YENİ: Çekiliş Mantığı
  if (interaction.commandName === 'çekiliş') {
    const odul = interaction.options.getString('ödül');
    const sure = interaction.options.getInteger('süre');
    const kazananSayisi = interaction.options.getInteger('kazanan');

    // İlk mesajı gönderiyoruz
    const cekilisMesaji = await interaction.reply({
      content: `🎉 **ÇEKİLİŞ BAŞLADI!** 🎉\n\n**Ödül:** ${odul}\n**Kazanan Sayısı:** ${kazananSayisi}\n**Süre:** ${sure} saniye\n\nKatılmak için 🎉 emojisinin üzerine tıklayın!`,
      fetchReply: true
    });

    // Mesaja 🎉 reaksiyonu ekliyoruz
    await cekilisMesaji.react('🎉');

    // Belirlenen süre kadar bekliyoruz (milisaniye cinsinden)
    setTimeout(async () => {
      try {
        // Mesajı ve reaksiyonları güncel haliyle yeniden çekiyoruz
        const güncelMesaj = await interaction.channel.messages.fetch(cekilisMesaji.id);
        const reaksiyon = güncelMesaj.reactions.cache.get('🎉');

        if (!reaksiyon) {
          return interaction.followUp({ content: 'Çekiliş reaksiyonu bulunamadı, iptal edildi.', ephemeral: true });
        }

        // Reaksiyon veren kullanıcıları listeliyoruz
        const kullanicilar = await reaksiyon.users.fetch();
        // Botun kendisini listeden eliyoruz ki bot kazanmasın
        const katilanlar = kullanicilar.filter(user => !user.bot).map(user => user);

        if (katilanlar.length === 0) {
          return interaction.followUp(`🎉 **Çekiliş Bitti!**\n**Ödül:** ${odul}\nKatılan olmadığı için kazanan seçilemedi. 😔`);
        }

        // Kazananları rastgele seçiyoruz
        const kazananlar = [];
        const secilecekMiktar = Math.min(kazananSayisi, katilanlar.length);

        for (let i = 0; i < secilecekMiktar; i++) {
          const rastgeleIndeks = Math.floor(Math.random() * katilanlar.length);
          // Seçilen kişiyi listeden çıkarıyoruz (tekrar seçilmesin diye)
          const secilen = katilanlar.splice(rastgeleIndeks, 1)[0];
          kazananlar.push(secilen.toString());
        }

        // Sonucu kanala duyuruyoruz
        await interaction.followUp(`🎉 **ÇEKİLİŞ SONUÇLANDI!** 🎉\n\n**Ödül:** ${odul}\n**Kazananlar:** ${kazananlar.join(', ')}\nTebrikler! 🥳`);

      } catch (error) {
        console.error('Çekiliş bitirilirken hata oluştu:', error);
      }
    }, sure * 1000);
  }
});

client.login(token);