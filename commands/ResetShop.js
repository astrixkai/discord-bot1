const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const shopFile = path.join(__dirname, '../shop.json');

function saveShop(shop) { fs.writeFileSync(shopFile, JSON.stringify(shop, null, 2)); }

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resetshop')
    .setDescription('إعادة تعيين متجر الشراء (حذف كل العناصر) - Admin فقط')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
    const isOwner = interaction.user.id === interaction.guild.ownerId;
    if (!isAdmin && !isOwner) return interaction.reply({ content: '❌ هذا الأمر للمشرفين فقط', ephemeral: true });

    const shop = { channelId: null, roles: {} };
    saveShop(shop);
    await interaction.reply({ content: '✅ تم إعادة تعيين المتجر وحذف جميع العناصر', ephemeral: true });
  }
};
