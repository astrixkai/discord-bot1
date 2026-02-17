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
        .setName('timeout')
        .setDescription('إسكات شخص مؤقتاً')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('المستخدم المراد إسكاته')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('duration')
                .setDescription('مدة الإسكات بالدقائق')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320) // 28 أيام
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('السبب')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
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
        const duration = interaction.options.getInteger('duration');
        const reason = interaction.options.getString('reason') || 'لا يوجد سبب';
        
        const member = await interaction.guild.members.fetch(user.id);
        
        // التحقق من أن الشخص متاح للإسكات
        if (member.communicationDisabledUntil) {
            return await interaction.reply({ 
                content: '⚠️ هذا الشخص مُسكّت بالفعل', 
                ephemeral: true 
            });
        }
        
        try {
            const durationMs = duration * 60 * 1000;
            await member.timeout(durationMs, reason);
            
            // إضافة نقاط
            const points = getPoints();
            const userId = interaction.user.id;
            points[userId] = (points[userId] || 0) + 1;
            savePoints(points);
            
            await interaction.reply({
                content: `✅ تم إسكات ${user.tag} لمدة ${duration} دقيقة\n📝 السبب: ${reason}\n⭐ حصلت على 1 نقطة`,
                ephemeral: true
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: '❌ حدث خطأ في إسكات المستخدم', 
                ephemeral: true 
            });
        }
    },
};
