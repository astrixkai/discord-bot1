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
        .setName('removeshoprole')
        .setDescription('إزالة رتبة من متجر الشراء (Admin فقط)')
        .addRoleOption(option => option.setName('role').setDescription('الرتبة المراد إزالتها').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        const isOwner = interaction.user.id === interaction.guild.ownerId;
        if (!isAdmin && !isOwner) return interaction.reply({ content: '❌ هذا الأمر للمشرفين فقط', ephemeral: true });

        const role = interaction.options.getRole('role');
        const shop = getShop();
        shop.roles = shop.roles || {};

        if (!shop.roles[role.id]) return interaction.reply({ content: '⚠️ هذه الرتبة غير موجودة في المتجر', ephemeral: true });

        delete shop.roles[role.id];
        saveShop(shop);

        await interaction.reply({ content: `✅ تم إزالة الرتبة ${role.name} من المتجر`, ephemeral: true });
    }
};
