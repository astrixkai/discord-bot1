const { EmbedBuilder } = require('discord.js');

// تخزين بيانات AFK في الذاكرة
// الصيغة: afkData[guildId][userId] = { reason, timestamp }
const afkData = {};

/**
 * تفعيل وضع AFK لمستخدم
 */
function setAfk(userId, guildId, reason = 'AFK') {
    if (!afkData[guildId]) afkData[guildId] = {};
    afkData[guildId][userId] = {
        reason: reason,
        timestamp: Date.now()
    };
}

/**
 * إلغاء وضع AFK لمستخدم
 */
function removeAfk(userId, guildId) {
    if (afkData[guildId] && afkData[guildId][userId]) {
        delete afkData[guildId][userId];
    }
}

/**
 * التحقق إذا كان المستخدم في وضع AFK
 * يرجع بيانات AFK أو null
 */
function isAfk(userId, guildId) {
    if (!afkData[guildId]) return null;
    return afkData[guildId][userId] || null;
}

/**
 * تحويل الوقت المنقضي إلى نص مقروء
 */
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} يوم`;
    if (hours > 0) return `${hours} ساعة`;
    if (minutes > 0) return `${minutes} دقيقة`;
    return `${seconds} ثانية`;
}

/**
 * معالجة الرسائل - يتم استدعاؤها من messageCreate
 */
async function handleMessage(message) {
    try {
        if (!message.guild) return;

        const guildId = message.guild.id;
        const userId = message.author.id;

        // ========================
        // 1. إلغاء AFK إذا كتب الشخص رسالة وهو AFK
        //    (ما عدا أمر afk نفسه)
        // ========================
        const userAfk = isAfk(userId, guildId);
        const content = message.content.trim().toLowerCase();
        
        // تجاهل تغيير الحالة إذا كان المستخدم يكتب أمر afk
        if (userAfk && !content.startsWith('afk')) {
            removeAfk(userId, guildId);

            // إعادة الاسم الأصلي
            try {
                const member = await message.guild.members.fetch(userId);
                if (member.nickname && member.nickname.startsWith('[AFK]')) {
                    const originalName = member.nickname.replace('[AFK] ', '');
                    await member.setNickname(
                        originalName === member.user.username ? null : originalName
                    );
                }
            } catch (err) {}

            // حساب المدة
            const duration = formatDuration(Date.now() - userAfk.timestamp);

            const embed = new EmbedBuilder()
                .setDescription(`✅ **${message.author.username}** تم إلغاء وضع AFK\n⏱️ كنت غائباً لمدة: **${duration}**`)
                .setColor('#00FF00')
                .setTimestamp();

            try {
                const reply = await message.reply({ embeds: [embed] });
                setTimeout(() => reply.delete().catch(() => {}), 5000);
            } catch (err) {}
        }

        // ========================
        // 2. إذا تم منشن شخص AFK، أخبر المُرسِل
        // ========================
        if (message.mentions.users.size > 0) {
            for (const [mentionedId, mentionedUser] of message.mentions.users) {
                // تجاهل منشن البوت نفسه
                if (mentionedId === message.client.user.id) continue;
                // تجاهل المستخدم لو منشن نفسه
                if (mentionedId === userId) continue;

                const mentionedAfk = isAfk(mentionedId, guildId);
                if (mentionedAfk) {
                    const duration = formatDuration(Date.now() - mentionedAfk.timestamp);

                    const embed = new EmbedBuilder()
                        .setTitle('😴 هذا الشخص في وضع AFK')
                        .setDescription(
                            `**${mentionedUser.username}** غير متاح الآن\n\n` +
                            `📝 **السبب:** ${mentionedAfk.reason}\n` +
                            `⏱️ **منذ:** ${duration}`
                        )
                        .setColor('#FFA500')
                        .setThumbnail(mentionedUser.displayAvatarURL({ size: 128 }))
                        .setTimestamp();

                    try {
                        const reply = await message.reply({ embeds: [embed] });
                        setTimeout(() => reply.delete().catch(() => {}), 8000);
                    } catch (err) {}
                }
            }
        }

    } catch (error) {
        console.error('❌ خطأ في نظام AFK:', error);
    }
}

module.exports = {
    setAfk,
    removeAfk,
    isAfk,
    handleMessage,
    formatDuration
};