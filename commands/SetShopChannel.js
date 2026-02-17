const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const shopFile = path.join(__dirname, '../shop.json');

function getShop() {
    if (fs.existsSync(shopFile)) return JSON.parse(fs.readFileSync(shopFile, 'utf-8'));
    return { channelId: null, roles: {} };
}

function saveShop(shop) {
    fs.writeFileSync(shopFile, JSON.stringify(shop, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setshopchannel')
        .setDescription('تعيين روم مخصص لعمليات الشراء (Admin فقط)')
        .addChannelOption(option => option.setName('channel').setDescription('القناة المخصصة للشراء').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        const isOwner = interaction.user.id === interaction.guild.ownerId;
        if (!isAdmin && !isOwner) return interaction.reply({ content: '❌ هذا الأمر للمشرفين فقط', ephemeral: true });

        const channel = interaction.options.getChannel('channel');
        const shop = getShop();
        shop.channelId = channel.id;
        saveShop(shop);

        await interaction.reply({ content: `✅ تم تعيين قناة الشراء إلى ${channel}`, ephemeral: true });
    }
};
