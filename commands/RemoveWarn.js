const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const warningsFile = path.join(__dirname, '../warnings.json');

function getWarnings() {
    if (fs.existsSync(warningsFile)) {
        return JSON.parse(fs.readFileSync(warningsFile, 'utf-8'));
    }
    return {};
}

function saveWarnings(warnings) {
    fs.writeFileSync(warningsFile, JSON.stringify(warnings, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removewarn')
        .setDescription('إزالة تحذير من شخص')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('المستخدم المراد إزالة التحذير منه')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('warn_number')
                .setDescription('رقم التحذير المراد حذفه (1 = الأول)')
                .setRequired(false)
                .setMinValue(1)
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
        const warnNumber = interaction.options.getInteger('warn_number') || 1;
        
        try {
            const warnings = getWarnings();
            const userId = user.id;
            
            if (!warnings[userId] || warnings[userId].length === 0) {
                return await interaction.reply({ 
                    content: `❌ لا يوجد تحذيرات لـ ${user.tag}`, 
                    ephemeral: true 
                });
            }
            
            if (warnNumber > warnings[userId].length) {
                return await interaction.reply({ 
                    content: `❌ رقم التحذير غير صحيح. عدد التحذيرات: ${warnings[userId].length}`, 
                    ephemeral: true 
                });
            }
            
            const removedWarn = warnings[userId].splice(warnNumber - 1, 1)[0];
            
            if (warnings[userId].length === 0) {
                delete warnings[userId];
            }
            
            saveWarnings(warnings);
            
            await interaction.reply({
                content: `✅ تم حذف التحذير من ${user.tag}\n📝 السبب الذي تم حذفه: ${removedWarn.reason}\n📊 التحذيرات المتبقية: ${warnings[userId]?.length || 0}`,
                ephemeral: true
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: '❌ حدث خطأ في حذف التحذير', 
                ephemeral: true 
            });
        }
    },
};
