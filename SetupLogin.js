const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'setup-login',
    data: new SlashCommandBuilder()
        .setName('setup-login')
        .setDescription('🔧 إنشاء لوحة تسجيل الدخول/الخروج في القناة الحالية')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        try {
            // التحقق من الصلاحيات
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return await interaction.reply({
                    content: '❌ هذا الأمر متاح فقط للمدراء!',
                    ephemeral: true
                });
            }
            
            // إنشاء Embed
            const embed = new EmbedBuilder()
                .setTitle('🔐 لوحة تسجيل الدخول والخروج')
                .setColor('#5865F2')
                .setDescription(
                    '**مرحباً بك في نظام تسجيل الدخول والخروج!**\n\n' +
                    '**📋 كيف يعمل النظام:**\n' +
                    '🚪 **تسجيل خروج:** يحفظ جميع رتبك ويزيلها مؤقتاً\n' +
                    '✅ **تسجيل دخول:** يسترجع جميع رتبك المحفوظة\n\n' +
                    '**💡 ملاحظات مهمة:**\n' +
                    '• الرتب المحفوظة تبقى آمنة حتى تسجل دخول\n' +
                    '• يمكنك استخدام `/login` في أي قناة أيضاً\n' +
                    '• النظام يحفظ جميع رتبك تلقائياً'
                )
                .setThumbnail(interaction.guild.iconURL({ size: 256 }))
                .setTimestamp()
                .setFooter({ text: `${interaction.guild.name}` });
            
            // إنشاء الأزرار
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('logout_btn')
                        .setLabel('🚪 تسجيل خروج')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('login_btn')
                        .setLabel('✅ تسجيل دخول')
                        .setStyle(ButtonStyle.Success)
                );
            
            // إرسال اللوحة في القناة
            await interaction.channel.send({
                embeds: [embed],
                components: [row]
            });
            
            // رد على الأمر
            await interaction.reply({
                content: '✅ تم إنشاء لوحة تسجيل الدخول/الخروج بنجاح في هذه القناة!',
                ephemeral: true
            });
            
        } catch (error) {
            console.error('خطأ في أمر setup-login:', error);
            await interaction.reply({
                content: '❌ حدث خطأ في إنشاء اللوحة',
                ephemeral: true
            });
        }
    }
};