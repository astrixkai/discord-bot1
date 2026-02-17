const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// ملف لحفظ بيانات تسجيل الدخول/الخروج
const loginDataFile = path.join(__dirname, 'login_data.json');

// دالة لقراءة بيانات تسجيل الدخول
function getLoginData() {
    if (fs.existsSync(loginDataFile)) {
        return JSON.parse(fs.readFileSync(loginDataFile, 'utf-8'));
    }
    return {};
}

// دالة لحفظ بيانات تسجيل الدخول
function saveLoginData(data) {
    fs.writeFileSync(loginDataFile, JSON.stringify(data, null, 2));
}

module.exports = {
    name: 'login',
    data: new SlashCommandBuilder()
        .setName('login')
        .setDescription('🔐 نظام تسجيل الدخول والخروج')
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
    
    async execute(interaction) {
        try {
            const loginData = getLoginData();
            const userId = interaction.user.id;
            const member = await interaction.guild.members.fetch(userId);
            
            // التحقق من رتبة Logged Out
            const loggedOutRole = interaction.guild.roles.cache.find(r => 
                r.name === 'Logged Out' || 
                r.name === '🚪 Logged Out' ||
                r.name.toLowerCase().includes('logged out') || 
                r.name.toLowerCase().includes('logout')
            );
            
            // المستخدم مسجل خروج إذا عنده الرتبة أو عنده بيانات محفوظة
            const isLoggedOut = (loggedOutRole && member.roles.cache.has(loggedOutRole.id)) || 
                               (loginData[userId]?.isLoggedOut || false);
            
            // إنشاء Embed
            const embed = new EmbedBuilder()
                .setTitle('🔐 نظام تسجيل الدخول والخروج')
                .setColor(isLoggedOut ? '#FF0000' : '#00FF00')
                .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
                .addFields(
                    { name: '👤 المستخدم', value: `${interaction.user.tag}`, inline: true },
                    { name: '📊 الحالة الحالية', value: isLoggedOut ? '❌ مسجل خروج' : '✅ مسجل دخول', inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'اضغط على الزر المناسب' });
            
            // إضافة معلومات الرتب المحفوظة إذا كان مسجل خروج
            if (isLoggedOut && loginData[userId]?.savedRoles) {
                const savedRoles = loginData[userId].savedRoles;
                const rolesText = savedRoles.map(roleId => {
                    const role = interaction.guild.roles.cache.get(roleId);
                    return role ? `✅ ${role.name}` : '❓ رتبة محذوفة';
                }).join('\n').substring(0, 1020);
                
                if (rolesText) {
                    embed.addFields({ 
                        name: `🏆 الرتب المحفوظة (${savedRoles.length})`, 
                        value: rolesText, 
                        inline: false 
                    });
                }
            }
            
            // إنشاء الأزرار
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('logout_btn')
                        .setLabel('🚪 تسجيل خروج')
                        .setStyle(ButtonStyle.Danger)
                        .setDisabled(isLoggedOut),
                    new ButtonBuilder()
                        .setCustomId('login_btn')
                        .setLabel('✅ تسجيل دخول')
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(!isLoggedOut)
                );
            
            await interaction.reply({ 
                embeds: [embed], 
                components: [row],
                ephemeral: true 
            });
            
        } catch (error) {
            console.error('خطأ في أمر login:', error);
            await interaction.reply({ 
                content: '❌ حدث خطأ في تنفيذ الأمر',
                ephemeral: true 
            });
        }
    }
};