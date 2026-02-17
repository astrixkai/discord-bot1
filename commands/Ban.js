const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
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
        .setName('ban')
        .setDescription('حظر شخص من السيرفر')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('المستخدم المراد حظره')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('السبب')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
    async execute(interaction) {
        // التحقق من أن المستخدم Admin أو Owner
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        const isOwner = interaction.user.id === interaction.guild.ownerId;
        
        if (!isAdmin && !isOwner) {
            return await interaction.reply({ 
                content: '❌ هذا الأمر متاح فقط للمدراء أو مالك السيرفر', 
                ephemeral: true 
            });
        }
        
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'لا يوجد سبب';
        
        // التحقق من أن الشخص ليس الـ Owner
        if (user.id === interaction.guild.ownerId) {
            return await interaction.reply({ 
                content: '❌ لا يمكنك حظر مالك السيرفر', 
                ephemeral: true 
            });
        }
        
        try {
            const member = await interaction.guild.members.fetch(user.id);
            
            if (member.permissions.has(PermissionFlagsBits.Administrator)) {
                return await interaction.reply({ 
                    content: '❌ لا يمكنك حظر مسؤول', 
                    ephemeral: true 
                });
            }
            
            await interaction.guild.members.ban(user, { reason: reason });
            
            // إضافة نقاط
            const points = getPoints();
            const userId = interaction.user.id;
            points[userId] = (points[userId] || 0) + 3;
            savePoints(points);
            
            await interaction.reply({
                content: `✅ تم حظر ${user.tag}\n📝 السبب: ${reason}\n⭐ حصلت على 3 نقاط`,
                ephemeral: true
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: '❌ حدث خطأ في حظر المستخدم', 
                ephemeral: true 
            });
        }
    },
};
