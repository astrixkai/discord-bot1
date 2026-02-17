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
        .setName('resetpoints')
        .setDescription('إعادة تعيين نقاط شخص (Admin فقط)')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('المستخدم المراد إعادة تعيين نقاطه')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('points')
                .setDescription('القيمة الجديدة للنقاط (اتركها 0 لحذف النقاط)')
                .setRequired(false)
                .setMinValue(0)
        )
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
        
        const user = interaction.options.getUser('user');
        const newPoints = interaction.options.getInteger('points') ?? 0;
        
        const points = getPoints();
        const oldPoints = points[user.id] || 0;
        
        // تحديث أو حذف النقاط
        if (newPoints === 0) {
            delete points[user.id];
        } else {
            points[user.id] = newPoints;
        }
        
        savePoints(points);
        
        const embed = new EmbedBuilder()
            .setTitle('✅ تم إعادة تعيين النقاط')
            .setColor('#00FF00')
            .setThumbnail(user.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: '👤 المستخدم', value: `${user.username}`, inline: true },
                { name: '⭐ النقاط القديمة', value: `${oldPoints}`, inline: true },
                { name: '🔄 النقاط الجديدة', value: `${newPoints}`, inline: true },
                { name: '🔧 تم بواسطة', value: `${interaction.user.username}`, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: `السيرفر: ${interaction.guild.name}` });
        
        await interaction.reply({ embeds: [embed] });
    },
};
