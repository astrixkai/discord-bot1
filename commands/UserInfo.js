const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('عرض معلومات المستخدم')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('المستخدم (اتركه فارغ لنفسك)')
                .setRequired(false)
        ),
    
    async execute(interaction) {
        await interaction.deferReply();
        
        const user = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(user.id);
        
        // المعلومات الأساسية
        const joinedDate = member.joinedAt.toLocaleString('ar-SA');
        const createdDate = user.createdAt.toLocaleString('ar-SA');
        
        // الرتب
        const roles = member.roles.cache
            .filter(role => role.id !== interaction.guild.id)
            .sort((a, b) => b.position - a.position)
            .map(role => role.toString())
            .slice(0, 10);
        
        const rolesText = roles.length > 0 ? roles.join(', ') : 'لا توجد رتب';
        
        // الحالة
        const status = member.presence?.status || 'offline';
        const statusEmoji = {
            'online': '🟢',
            'idle': '🟡',
            'dnd': '🔴',
            'offline': '⚫'
        };
        
        const embed = new EmbedBuilder()
            .setTitle(`👤 معلومات ${user.username}`)
            .setColor('#6B5B95')
            .setThumbnail(user.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: '👤 اسم المستخدم', value: `${user.tag}`, inline: true },
                { name: '🆔 معرّف المستخدم', value: `${user.id}`, inline: true },
                { name: `${statusEmoji[status]} الحالة`, value: `${status}`, inline: true },
                { name: '📅 تاريخ إنشاء الحساب', value: createdDate, inline: true },
                { name: '📅 تاريخ الانضمام للسيرفر', value: joinedDate, inline: true },
                { name: '🤖 بوت؟', value: user.bot ? 'نعم ✅' : 'لا ❌', inline: true },
                { name: `🏆 الرتب (${roles.length})`, value: rolesText, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: `تم الطلب من قبل ${interaction.user.tag}` });
        
        await interaction.editReply({ embeds: [embed] });
    },
};
