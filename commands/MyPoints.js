const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const pointsFile = path.join(__dirname, '../points.json');

function getPoints() {
    if (fs.existsSync(pointsFile)) {
        return JSON.parse(fs.readFileSync(pointsFile, 'utf-8'));
    }
    return {};
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mypoints')
        .setDescription('عرض نقاطك الشخصية')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('المستخدم (اتركه فارغ لنفسك)')
                .setRequired(false)
        ),
    
    async execute(interaction) {
        await interaction.deferReply();
        
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const points = getPoints();
        const userPoints = points[targetUser.id] || 0;
        
        // حساب الترتيب
        const sorted = Object.entries(points)
            .sort((a, b) => b[1] - a[1]);
        
        const rank = sorted.findIndex(entry => entry[0] === targetUser.id) + 1;
        
        const embed = new EmbedBuilder()
            .setTitle(`📊 نقاط ${targetUser.username}`)
            .setColor('#FFD700')
            .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: '⭐ النقاط', value: `**${userPoints}**`, inline: true },
                { name: '🏆 الترتيب', value: rank > 0 ? `**#${rank}**` : '**لا يوجد نقاط بعد**', inline: true },
                { name: '🎯 الإحصائيات', value: `من أصل ${sorted.length} شخص`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `السيرفر: ${interaction.guild.name}` });
        
        await interaction.editReply({ embeds: [embed] });
    },
};
