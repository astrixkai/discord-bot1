const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits, 
    ChannelType 
} = require('discord.js');

const fs = require('fs');
const path = require('path');

// ✅ نفس المسار المستخدم في TicketButtonHandler
const ticketsFile = path.join(process.cwd(), 'ticket.json');

function getTicketsData() {
    if (fs.existsSync(ticketsFile)) {
        return JSON.parse(fs.readFileSync(ticketsFile, 'utf-8'));
    }
    return { tickets: {}, config: {} };
}

function saveTicketsData(data) {
    fs.writeFileSync(ticketsFile, JSON.stringify(data, null, 2));
}

module.exports = {

    data: new SlashCommandBuilder()
        .setName('ticket-setup')
        .setDescription('🎫 إعداد نظام التكتات')
        .addSubcommand(sub =>
            sub.setName('panel')
               .setDescription('إنشاء لوحة التكتات في القناة الحالية')
        )
        .addSubcommand(sub =>
            sub.setName('category')
               .setDescription('تحديد فئة التكتات')
               .addChannelOption(option =>
                    option.setName('category')
                          .setDescription('اختر الفئة التي سيتم إنشاء التكتات فيها')
                          .addChannelTypes(ChannelType.GuildCategory)
                          .setRequired(true)
               )
        )
        .addSubcommand(sub =>
            sub.setName('role')
               .setDescription('تحديد رتبة فريق الدعم')
               .addRoleOption(option =>
                    option.setName('role')
                          .setDescription('اختر رتبة فريق الدعم')
                          .setRequired(true)
               )
        )
        .addSubcommand(sub =>
            sub.setName('info')
               .setDescription('عرض إعدادات نظام التكتات الحالية')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {

        try {

            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({
                    content: '❌ هذا الأمر متاح للإدارة فقط',
                    ephemeral: true
                });
            }

            const subcommand = interaction.options.getSubcommand();
            const ticketsData = getTicketsData();

            if (!ticketsData.config[interaction.guild.id]) {
                ticketsData.config[interaction.guild.id] = {};
            }

            // =====================================================
            // 📂 تحديد الفئة
            // =====================================================
            if (subcommand === 'category') {

                const category = interaction.options.getChannel('category');

                ticketsData.config[interaction.guild.id].category = category.id;
                saveTicketsData(ticketsData);

                const embed = new EmbedBuilder()
                    .setTitle('✅ تم تحديد فئة التكتات')
                    .setDescription(`سيتم إنشاء جميع التكتات الجديدة في:\n📂 **${category.name}**`)
                    .setColor('#00FF00')
                    .setTimestamp();

                return interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            }

            // =====================================================
            // 👮 تحديد رتبة فريق الدعم
            // =====================================================
            if (subcommand === 'role') {

                const role = interaction.options.getRole('role');

                ticketsData.config[interaction.guild.id].supportRole = role.id;
                saveTicketsData(ticketsData);

                const embed = new EmbedBuilder()
                    .setTitle('✅ تم تحديد رتبة فريق الدعم')
                    .setDescription(`سيتم إشعار أعضاء الرتبة التالية عند إنشاء تكت جديد:\n👮 ${role}`)
                    .setColor('#00FF00')
                    .setTimestamp();

                return interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            }

            // =====================================================
            // ℹ️ عرض معلومات الإعدادات
            // =====================================================
            if (subcommand === 'info') {

                const config = ticketsData.config[interaction.guild.id];

                if (!config || (!config.category && !config.supportRole)) {
                    return interaction.reply({
                        content: '⚠️ لم يتم إعداد نظام التكتات بعد.\n\n' +
                                 'استخدم الأوامر التالية للإعداد:\n' +
                                 '`/ticket-setup category` - لتحديد الفئة\n' +
                                 '`/ticket-setup role` - لتحديد رتبة الدعم\n' +
                                 '`/ticket-setup panel` - لإنشاء لوحة التكتات',
                        ephemeral: true
                    });
                }

                const categoryChannel = config.category ? await interaction.guild.channels.fetch(config.category).catch(() => null) : null;
                const supportRole = config.supportRole ? await interaction.guild.roles.fetch(config.supportRole).catch(() => null) : null;

                const embed = new EmbedBuilder()
                    .setTitle('⚙️ إعدادات نظام التكتات')
                    .setColor('#5865F2')
                    .addFields(
                        {
                            name: '📂 فئة التكتات',
                            value: categoryChannel ? `${categoryChannel.name}` : '❌ لم يتم تحديدها',
                            inline: true
                        },
                        {
                            name: '👮 رتبة فريق الدعم',
                            value: supportRole ? `${supportRole}` : '❌ لم يتم تحديدها',
                            inline: true
                        },
                        {
                            name: '📊 إحصائيات',
                            value: `**التكتات النشطة:** ${Object.values(ticketsData.tickets).filter(t => t.guildId === interaction.guild.id && !t.closed).length}\n` +
                                   `**إجمالي التكتات:** ${Object.values(ticketsData.tickets).filter(t => t.guildId === interaction.guild.id).length}`,
                            inline: false
                        }
                    )
                    .setFooter({ text: 'استخدم /ticket-setup لتغيير الإعدادات' })
                    .setTimestamp();

                return interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            }

            // =====================================================
            // 🎫 إنشاء لوحة التكتات
            // =====================================================
            if (subcommand === 'panel') {

                await interaction.deferReply({ ephemeral: true });

                const config = ticketsData.config[interaction.guild.id];

                if (!config || !config.category) {
                    return interaction.editReply({
                        content: '❌ **يجب تحديد الفئة أولاً!**\n\n' +
                                 'استخدم الأمر التالي لتحديد الفئة:\n' +
                                 '`/ticket-setup category`\n\n' +
                                 'ثم استخدم `/ticket-setup panel` لإنشاء اللوحة'
                    });
                }

                // التحقق من وجود الفئة
                const categoryExists = await interaction.guild.channels.fetch(config.category).catch(() => null);
                if (!categoryExists) {
                    return interaction.editReply({
                        content: '❌ الفئة المحددة غير موجودة! يرجى تحديد فئة جديدة باستخدام `/ticket-setup category`'
                    });
                }

                const embed = new EmbedBuilder()
                    .setTitle('🎫 نظام الدعم - التكتات')
                    .setDescription(
                        '━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
                        '**مرحباً بك في نظام الدعم الفني!**\n\n' +
                        '📝 لإنشاء تكت جديد، اضغط على الزر بالأسفل\n' +
                        '🔒 سيتم إنشاء قناة خاصة بك فقط\n' +
                        '👮 سيتم إشعار فريق الدعم فوراً\n' +
                        '⚡ سنرد عليك في أقرب وقت ممكن\n\n' +
                        '━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
                        '**يرجى استخدام التكتات للأمور التالية:**\n' +
                        '• الإبلاغ عن مشكلة\n' +
                        '• طلب دعم فني\n' +
                        '• استفسارات عامة\n' +
                        '• شكاوى أو مقترحات'
                    )
                    .setColor('#5865F2')
                    .setThumbnail(interaction.guild.iconURL({ size: 256 }))
                    .setFooter({ 
                        text: `${interaction.guild.name} | نظام التكتات`,
                        iconURL: interaction.guild.iconURL()
                    })
                    .setTimestamp();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('create_ticket')
                        .setLabel('🎫 إنشاء تكت جديد')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🎫')
                );

                try {

                    await interaction.channel.send({
                        embeds: [embed],
                        components: [row]
                    });

                    const successEmbed = new EmbedBuilder()
                        .setTitle('✅ تم إنشاء لوحة التكتات بنجاح!')
                        .setDescription(
                            `تم إنشاء اللوحة في ${interaction.channel}\n\n` +
                            `**الإعدادات الحالية:**\n` +
                            `📂 الفئة: ${categoryExists.name}\n` +
                            `${config.supportRole ? `👮 رتبة الدعم: <@&${config.supportRole}>` : '⚠️ لم يتم تحديد رتبة الدعم'}\n\n` +
                            `الأعضاء الآن يمكنهم إنشاء تكتات!`
                        )
                        .setColor('#00FF00')
                        .setTimestamp();

                    return interaction.editReply({
                        embeds: [successEmbed]
                    });

                } catch (err) {

                    console.error('خطأ في إنشاء لوحة التكتات:', err);

                    return interaction.editReply({
                        content: '❌ **حدث خطأ!**\n\n' +
                                 'تأكد من أن البوت يملك الصلاحيات التالية:\n' +
                                 '• إرسال رسائل (Send Messages)\n' +
                                 '• تضمين روابط (Embed Links)\n' +
                                 '• قراءة الرسائل (View Channel)\n\n' +
                                 `تفاصيل الخطأ: ${err.message}`
                    });
                }
            }

        } catch (error) {

            console.error('خطأ في إعداد التكتات:', error);

            const errorMessage = '❌ حدث خطأ غير متوقع أثناء تنفيذ الأمر.\n\n' +
                               'يرجى التأكد من صلاحيات البوت والمحاولة مرة أخرى.';

            if (interaction.deferred) {
                await interaction.editReply({ content: errorMessage });
            } else {
                await interaction.reply({
                    content: errorMessage,
                    ephemeral: true
                });
            }
        }
    }
};