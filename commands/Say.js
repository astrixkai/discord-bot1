const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('البوت يكرر الكلام بدون ما يظهر اسمك')
        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('الرسالة التي تريد من البوت أن يكررها')
                .setRequired(true)
        ),
    
    async execute(interaction) {
        const message = interaction.options.getString('message');
        
        // حذف رسالة المستخدم الأصلية (اختياري)
        try {
            await interaction.message?.delete().catch(() => {});
        } catch (err) {
            // تجاهل الأخطاء
        }
        
        // إرسال الرسالة بدون اسم المستخدم
        await interaction.channel.send(message);
        
        // الرد بطريقة مخفية
        await interaction.reply({ content: '✅ تم إرسال الرسالة', ephemeral: true });
    },
};
