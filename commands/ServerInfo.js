const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('عرض معلومات السيرفر'),
    
    async execute(interaction) {
        await interaction.deferReply();
        
        const guild = interaction.guild;
        const owner = await guild.fetchOwner();
        
        // احصائيات الأعضاء
        const totalMembers = guild.memberCount;
        const botMembers = guild.members.cache.filter(m => m.user.bot).size;
        const humanMembers = totalMembers - botMembers;
        
        // الرتب
        const roleCount = guild.roles.cache.size - 1; // -1 لإزالة الـ @everyone
        
        // القنوات
        const textChannels = guild.channels.cache.filter(c => c.isTextBased()).size;
        const voiceChannels = guild.channels.cache.filter(c => c.isVoiceBased()).size;
        
        // وقت الإنشاء
        const createdDate = guild.createdAt.toLocaleString('ar-SA');
        
        const embed = new EmbedBuilder()
            .setTitle(`📊 معلومات السيرفر - ${guild.name}`)
            .setColor('#4B0082')
            .setThumbnail(guild.iconURL({ size: 256 }))
            .addFields(
                { name: '👑 صاحب السيرفر', value: `${owner.user.tag}`, inline: true },
                { name: '🆔 معرّف السيرفر', value: `${guild.id}`, inline: true },
                { name: '📅 تاريخ الإنشاء', value: createdDate, inline: true },
                { name: '👥 إجمالي الأعضاء', value: `**${totalMembers}**`, inline: true },
                { name: '🧑 الأعضاء', value: `**${humanMembers}**`, inline: true },
                { name: '🤖 البوتات', value: `**${botMembers}**`, inline: true },
                { name: '🏆 عدد الرتب', value: `**${roleCount}**`, inline: true },
                { name: '💬 قنوات النصوص', value: `**${textChannels}**`, inline: true },
                { name: '🔊 القنوات الصوتية', value: `**${voiceChannels}**`, inline: true },
                { name: '📈 مستوى التحقق', value: `**${guild.verificationLevel}**`, inline: true },
                { name: '🎯 مستوى المحتوى', value: `**${guild.explicitContentFilter}**`, inline: true },
                { name: '📍 المنطقة', value: `**${guild.preferredLocale}**`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `تم الطلب من قبل ${interaction.user.tag}` });
        
        await interaction.editReply({ embeds: [embed] });
    },
};
