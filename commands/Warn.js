const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const warningsFile = path.join(__dirname, '../warnings.json');
const pointsFile = path.join(__dirname, '../points.json');

function getWarnings() {
    if (fs.existsSync(warningsFile)) {
        return JSON.parse(fs.readFileSync(warningsFile, 'utf-8'));
    }
    return {};
}

function saveWarnings(warnings) {
    fs.writeFileSync(warningsFile, JSON.stringify(warnings, null, 2));
}

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
        .setName('warn')
        .setDescription('إعطاء تحذير لشخص')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('المستخدم المراد تحذيره')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('سبب التحذير')
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
        const reason = interaction.options.getString('reason') || 'لا يوجد سبب';
        
        try {
            const warnings = getWarnings();
            const userId = user.id;
            
            if (!warnings[userId]) {
                warnings[userId] = [];
            }
            
            warnings[userId].push({
                reason: reason,
                date: new Date().toLocaleString('ar-SA'),
                moderator: interaction.user.tag
            });
            
            saveWarnings(warnings);
            
            // إضافة نقاط
            const points = getPoints();
            const moderatorId = interaction.user.id;
            points[moderatorId] = (points[moderatorId] || 0) + 1;
            savePoints(points);
            
            const warnCount = warnings[userId].length;
            
            await interaction.reply({
                content: `⚠️ تم تحذير ${user.tag}\n📝 السبب: ${reason}\n📊 عدد التحذيرات: ${warnCount}\n⭐ حصلت على 1 نقطة`,
                ephemeral: true
            });
            
            // إرسال رسالة خاصة للمستخدم
            try {
                await user.send(`⚠️ لقد تم تحذيرك من قبل ${interaction.user.tag}\n📝 السبب: ${reason}\n📊 عدد التحذيرات: ${warnCount}`);
            } catch (error) {
                console.log('لم أتمكن من إرسال رسالة خاصة');
            }
        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: '❌ حدث خطأ في تحذير المستخدم', 
                ephemeral: true 
            });
        }
    },
};
