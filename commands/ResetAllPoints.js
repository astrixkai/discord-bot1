const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const pointsFile = path.join(__dirname, '../points.json');

function getPoints() {
    if (fs.existsSync(pointsFile)) {
        return JSON.parse(fs.readFileSync(pointsFile, 'utf-8'));
    }
    return {};
}

function savePoints(points) {
    fs.writeFileSync(pointsFile, JSON.stringify(points, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resetallpoints')
        .setDescription('إعادة تعيين نقاط جميع المستخدمين (Admin فقط)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        // التحقق من أن المستخدم Admin أو Owner
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        const isOwner = interaction.user.id === interaction.guild.ownerId;
        
        if (!isAdmin && !isOwner) {
            return await interaction.reply({ 
                content: '❌ هذا الأمر متاح فقط للمشرفين', 
                ephemeral: true 
            });
        }
        
        const points = getPoints();
        const totalUsers = Object.keys(points).length;
        
        // إعادة تعيين جميع النقاط
        const clearedPoints = {};
        savePoints(clearedPoints);
        
        const embed = new EmbedBuilder()
            .setTitle('🔄 تم إعادة تعيين جميع النقاط')
            .setColor('#FF0000')
            .addFields(
                { name: '👥 عدد المستخدمين المتأثرين', value: `**${totalUsers}**`, inline: true },
                { name: '💾 الحالة', value: '✅ تم حذف جميع النقاط', inline: true },
                { name: '🔧 تم بواسطة', value: `${interaction.user.username}`, inline: false },
                { name: '⚠️ تنبيه', value: 'هذه العملية لا يمكن التراجع عنها!', inline: false }
            )
            .setTimestamp()
            .setFooter({ text: `السيرفر: ${interaction.guild.name}` });
        
        await interaction.reply({ embeds: [embed] });
    },
};
