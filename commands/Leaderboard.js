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
        .setName('points')
        .setDescription('عرض ترتيب النقاط'),
    
    async execute(interaction) {
        await interaction.deferReply();
        
        const points = getPoints();
        
        if (Object.keys(points).length === 0) {
            return await interaction.editReply('📊 لا توجد نقاط حالياً');
        }
        
        // ترتيب النقاط تنازلياً
        const sorted = Object.entries(points)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10); // أفضل 10
        
        let leaderboardText = '';
        
        for (let i = 0; i < sorted.length; i++) {
            const [userId, points_val] = sorted[i];
            try {
                const user = await interaction.client.users.fetch(userId);
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
                leaderboardText += `${medal} **${user.username}** - ⭐ ${points_val} نقطة\n`;
            } catch (error) {
                leaderboardText += `${i + 1}. مستخدم غير معروف - ⭐ ${points_val} نقطة\n`;
            }
        }
        
        const embed = new EmbedBuilder()
            .setTitle('🏆 لائحة النقاط')
            .setDescription(leaderboardText)
            .setColor('#FFD700')
            .setThumbnail(interaction.guild.iconURL({ size: 512 }))
            .addFields(
                { name: '📊 معلومات', value: `السيرفر: **${interaction.guild.name}**\nإجمالي الأعضاء: **${interaction.guild.memberCount}**`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `اطلب الأمر في أي وقت لتحديث النقاط` });
        
        await interaction.editReply({ embeds: [embed] });
    },
};
