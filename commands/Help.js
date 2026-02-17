const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('عرض قائمة الأوامر المتاحة'),
    
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('📚 قائمة الأوامر')
            .setColor('#FF6B6B')
            .addFields(
                { name: '🛡️ أوامر الإدارة (Admin/Owner فقط)', value: 
                    `\`/timeout\` - إسكات شخص مؤقتاً ⏱️\n` +
                    `\`/warn\` - تحذير شخص ⚠️\n` +
                    `\`/removewarn\` - حذف تحذير 🗑️\n` +
                    `\`/untimeout\` - فك التايم ✅\n` +
                    `\`/kick\` - طرد شخص 👢\n` +
                    `\`/ban\` - حظر شخص 🚫\n` +
                    `\`/resetpoints\` - إعادة تعيين النقاط 💰\n` +
                    `\`/resetallpoints\` - إعادة تعيين جميع النقاط 🔄\n` +
                    `\`/setshopchannel\` - تعيين روم الشراء 🏷️\n` +
                    `\`/addshoprole\` - إضافة رتبة للبيع 🛒\n` +
                    `\`/removeshoprole\` - إزالة رتبة من المتجر 🗑️\n` +
                    `\`/resetshop\` - إعادة تعيين المتجر (حذف الكل) ⚠️`, 
                    inline: false },
                { name: '📊 أوامر المعلومات', value: 
                    `\`/leaderboard\` - لائحة النقاط 🏆\n` +
                    `\`/mypoints\` - نقاطك الشخصية ⭐\n` +
                    `\`/serverinfo\` - معلومات السيرفر 📊\n` +
                    `\`/userinfo\` - معلومات المستخدم 👤\n` +
                    `\`/ping\` - اختبار سرعة البوت 🏓`, 
                    inline: false },
                { name: '🎤 أوامر الكلام', value: 
                    `\`/say\` - البوت يكرر كلامك بدون ما يظهر اسمك 📢`, 
                    inline: false },
                { name: '⌨️ اختصارات البريفكس (!)', value: 
                    `\`!timeout\` / \`!tm\` - إسكات\n` +
                    `\`!warn\` / \`!w\` - تحذير\n` +
                    `\`!kick\` / \`!k\` - طرد\n` +
                    `\`!ban\` / \`!b\` - حظر\n` +
                    `\`!serverinfo\` / \`!si\` - معلومات السيرفر\n` +
                    `\`!userinfo\` / \`!ui\` - معلومات المستخدم`, 
                    inline: false },
                { name: '💡 أمثلة الاستخدام', value: 
                    `\`/timeout @Ahmed duration:30 reason:spam\`\n` +
                    `\`!warn @Sara تنمر\`\n` +
                    `\`!kick @Omar spam\`\n` +
                    `\`/leaderboard\`\n` +
                    `\`/serverinfo\``, 
                    inline: false }
            )
            .setTimestamp()
            .setFooter({ text: '🎯 استخدم Slash Commands (/) لأفضل تجربة' });
        
        await interaction.reply({ embeds: [embed] });
    },
};
