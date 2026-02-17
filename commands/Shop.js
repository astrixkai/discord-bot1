const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const shopFile = path.join(__dirname, '../shop.json');

function getShop() {
    if (fs.existsSync(shopFile)) return JSON.parse(fs.readFileSync(shopFile, 'utf-8'));
    return { channelId: null, roles: {} };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('عرض رتب المتجر المتاحة للشراء'),

    async execute(interaction) {
        const shop = getShop();
        const roles = shop.roles || {};

        const embed = new EmbedBuilder()
            .setTitle('🛒 متجر الرتب')
            .setColor('#00BFFF')
            .setTimestamp();

        if (Object.keys(roles).length === 0) {
            embed.setDescription('لا توجد رتب للبيع حالياً');
            return await interaction.reply({ embeds: [embed] });
        }

        const lines = Object.entries(roles).map(([roleId, price]) => {
            const role = interaction.guild.roles.cache.get(roleId);
            const name = role ? role.toString() : `Unknown Role (${roleId})`;
            return `${name} — **${price}** نقطة`;
        });

        embed.setDescription(lines.join('\n'));

        if (shop.channelId) {
            const chan = interaction.guild.channels.cache.get(shop.channelId);
            if (chan) embed.addFields({ name: 'قناة الشراء', value: `${chan}`, inline: false });
        }

        await interaction.reply({ embeds: [embed] });
    }
};
