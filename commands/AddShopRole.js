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
        .setName('addshoprole')
        .setDescription('إضافة رتبة للبيع بنقاط (Admin فقط)')
        .addRoleOption(option => option.setName('role').setDescription('الرتبة المراد بيعها').setRequired(true))
        .addIntegerOption(option => option.setName('price').setDescription('سعر الرتبة بالنقاط').setRequired(true).setMinValue(1))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        const isOwner = interaction.user.id === interaction.guild.ownerId;
        if (!isAdmin && !isOwner) return interaction.reply({ content: '❌ هذا الأمر للمشرفين فقط', ephemeral: true });

        const role = interaction.options.getRole('role');
        const price = interaction.options.getInteger('price');

        const shop = getShop();
        shop.roles = shop.roles || {};
        shop.roles[role.id] = price;
        saveShop(shop);

        await interaction.reply({ content: `✅ تم إضافة الرتبة ${role.name} بسعر ${price} نقطة`, ephemeral: true });
    }
};
