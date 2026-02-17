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

const applicationsFile = path.join(process.cwd(), 'applications.json');

function getApplicationsData() {
    if (fs.existsSync(applicationsFile)) {
        return JSON.parse(fs.readFileSync(applicationsFile, 'utf-8'));
    }
    return { applications: {}, config: {} };
}

function saveApplicationsData(data) {
    fs.writeFileSync(applicationsFile, JSON.stringify(data, null, 2));
}

module.exports = {

    data: new SlashCommandBuilder()
        .setName('application-setup')
        .setDescription('📝 إعداد نظام التقديم')
        .addSubcommand(sub =>
            sub.setName('panel')
               .setDescription('إنشاء لوحة التقديم في القناة الحالية')
        )
        .addSubcommand(sub =>
            sub.setName('channel')
               .setDescription('تحديد قناة إرسال التقديمات')
               .addChannelOption(option =>
                    option.setName('channel')
                          .setDescription('اختر القناة التي ستظهر فيها التقديمات')
                          .addChannelTypes(ChannelType.GuildText)
                          .setRequired(true)
               )
        )
        .addSubcommand(sub =>
            sub.setName('role')
               .setDescription('تحديد الرتبة التي سيحصل عليها المقبول')
               .addRoleOption(option =>
                    option.setName('role')
                          .setDescription('اختر الرتبة')
                          .setRequired(true)
               )
        )
        .addSubcommand(sub =>
            sub.setName('questions')
               .setDescription('تعيين أسئلة التقديم (افصل بين الأسئلة بـ |)')
               .addStringOption(option =>
                    option.setName('questions')
                          .setDescription('مثال: ما اسمك؟|كم عمرك؟|لماذا تريد الانضمام؟')
                          .setRequired(true)
               )
        )
        .addSubcommand(sub =>
            sub.setName('info')
               .setDescription('عرض إعدادات نظام التقديم الحالية')
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
            const applicationsData = getApplicationsData();

            if (!applicationsData.config[interaction.guild.id]) {
                applicationsData.config[interaction.guild.id] = {
                    questions: [
                        'ما اسمك؟',
                        'كم عمرك؟',
                        'لماذا تريد الانضمام للفريق؟',
                        'ما خبراتك السابقة؟'
                    ]
                };
            }

            // =====================================================
            // 📢 تحديد قناة التقديمات
            // =====================================================
            if (subcommand === 'channel') {

                const channel = interaction.options.getChannel('channel');

                applicationsData.config[interaction.guild.id].channel = channel.id;
                saveApplicationsData(applicationsData);

                const embed = new EmbedBuilder()
                    .setTitle('✅ تم تحديد قناة التقديمات')
                    .setDescription(`سيتم إرسال جميع التقديمات الجديدة إلى:\n📢 ${channel}`)
                    .setColor('#00FF00')
                    .setTimestamp();

                return interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            }

            // =====================================================
            // 🏆 تحديد الرتبة
            // =====================================================
            if (subcommand === 'role') {

                const role = interaction.options.getRole('role');

                applicationsData.config[interaction.guild.id].role = role.id;
                saveApplicationsData(applicationsData);

                const embed = new EmbedBuilder()
                    .setTitle('✅ تم تحديد رتبة المقبولين')
                    .setDescription(`سيحصل المقبولون على الرتبة:\n🏆 ${role}`)
                    .setColor('#00FF00')
                    .setTimestamp();

                return interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            }

            // =====================================================
            // ❓ تحديد الأسئلة
            // =====================================================
            if (subcommand === 'questions') {

                const questionsInput = interaction.options.getString('questions');
                const questions = questionsInput.split('|').map(q => q.trim()).filter(q => q.length > 0);

                if (questions.length === 0) {
                    return interaction.reply({
                        content: '❌ يجب كتابة سؤال واحد على الأقل!',
                        ephemeral: true
                    });
                }

                if (questions.length > 10) {
                    return interaction.reply({
                        content: '❌ الحد الأقصى للأسئلة هو 10 أسئلة!',
                        ephemeral: true
                    });
                }

                applicationsData.config[interaction.guild.id].questions = questions;
                saveApplicationsData(applicationsData);

                const embed = new EmbedBuilder()
                    .setTitle('✅ تم تحديث أسئلة التقديم')
                    .setDescription(`**عدد الأسئلة:** ${questions.length}\n\n${questions.map((q, i) => `**${i + 1}.** ${q}`).join('\n')}`)
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

                const config = applicationsData.config[interaction.guild.id];

                if (!config) {
                    return interaction.reply({
                        content: '⚠️ لم يتم إعداد نظام التقديم بعد.\n\n' +
                                 'استخدم الأوامر التالية للإعداد:\n' +
                                 '`/application-setup channel` - لتحديد قناة التقديمات\n' +
                                 '`/application-setup role` - لتحديد رتبة المقبولين\n' +
                                 '`/application-setup questions` - لتحديد الأسئلة\n' +
                                 '`/application-setup panel` - لإنشاء لوحة التقديم',
                        ephemeral: true
                    });
                }

                const appChannel = config.channel ? await interaction.guild.channels.fetch(config.channel).catch(() => null) : null;
                const appRole = config.role ? await interaction.guild.roles.fetch(config.role).catch(() => null) : null;

                const totalApps = Object.values(applicationsData.applications).filter(a => a.guildId === interaction.guild.id).length;
                const pendingApps = Object.values(applicationsData.applications).filter(a => a.guildId === interaction.guild.id && a.status === 'pending').length;
                const acceptedApps = Object.values(applicationsData.applications).filter(a => a.guildId === interaction.guild.id && a.status === 'accepted').length;
                const rejectedApps = Object.values(applicationsData.applications).filter(a => a.guildId === interaction.guild.id && a.status === 'rejected').length;

                const embed = new EmbedBuilder()
                    .setTitle('⚙️ إعدادات نظام التقديم')
                    .setColor('#5865F2')
                    .addFields(
                        {
                            name: '📢 قناة التقديمات',
                            value: appChannel ? `${appChannel}` : '❌ لم يتم تحديدها',
                            inline: true
                        },
                        {
                            name: '🏆 رتبة المقبولين',
                            value: appRole ? `${appRole}` : '❌ لم يتم تحديدها',
                            inline: true
                        },
                        {
                            name: '❓ عدد الأسئلة',
                            value: `${config.questions ? config.questions.length : 0} سؤال`,
                            inline: true
                        },
                        {
                            name: '📊 الإحصائيات',
                            value: `**إجمالي التقديمات:** ${totalApps}\n` +
                                   `⏳ **قيد المراجعة:** ${pendingApps}\n` +
                                   `✅ **مقبول:** ${acceptedApps}\n` +
                                   `❌ **مرفوض:** ${rejectedApps}`,
                            inline: false
                        }
                    )
                    .setFooter({ text: 'استخدم /application-setup لتغيير الإعدادات' })
                    .setTimestamp();

                if (config.questions && config.questions.length > 0) {
                    embed.addFields({
                        name: '📝 الأسئلة المحددة',
                        value: config.questions.map((q, i) => `**${i + 1}.** ${q}`).join('\n').substring(0, 1024),
                        inline: false
                    });
                }

                return interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            }

            // =====================================================
            // 📝 إنشاء لوحة التقديم
            // =====================================================
            if (subcommand === 'panel') {

                await interaction.deferReply({ ephemeral: true });

                const config = applicationsData.config[interaction.guild.id];

                if (!config || !config.channel) {
                    return interaction.editReply({
                        content: '❌ **يجب تحديد قناة التقديمات أولاً!**\n\n' +
                                 'استخدم الأمر التالي:\n' +
                                 '`/application-setup channel`'
                    });
                }

                // التحقق من وجود القناة
                const channelExists = await interaction.guild.channels.fetch(config.channel).catch(() => null);
                if (!channelExists) {
                    return interaction.editReply({
                        content: '❌ قناة التقديمات المحددة غير موجودة! يرجى تحديد قناة جديدة.'
                    });
                }

                const embed = new EmbedBuilder()
                    .setTitle('📝 نظام التقديم')
                    .setDescription(
                        '━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
                        '**مرحباً بك في نظام التقديم!**\n\n' +
                        '🎯 هل تريد الانضمام إلى فريقنا؟\n' +
                        '📋 قدّم طلبك الآن بالضغط على الزر أدناه\n' +
                        '⏱️ سيتم مراجعة طلبك من قبل الإدارة\n' +
                        '✅ ستصلك رسالة بالنتيجة فوراً\n\n' +
                        '━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
                        '**ملاحظات مهمة:**\n' +
                        '• يمكنك التقديم مرة واحدة فقط\n' +
                        '• أجب على جميع الأسئلة بصدق ووضوح\n' +
                        '• التقديمات المزيفة سيتم رفضها\n' +
                        '• قد يستغرق الرد بضع ساعات'
                    )
                    .setColor('#5865F2')
                    .setThumbnail(interaction.guild.iconURL({ size: 256 }))
                    .setFooter({ 
                        text: `${interaction.guild.name} | نظام التقديم`,
                        iconURL: interaction.guild.iconURL()
                    })
                    .setTimestamp();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('start_application')
                        .setLabel('📝 تقديم طلب')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('📝')
                );

                try {

                    await interaction.channel.send({
                        embeds: [embed],
                        components: [row]
                    });

                    const successEmbed = new EmbedBuilder()
                        .setTitle('✅ تم إنشاء لوحة التقديم بنجاح!')
                        .setDescription(
                            `تم إنشاء اللوحة في ${interaction.channel}\n\n` +
                            `**الإعدادات الحالية:**\n` +
                            `📢 قناة التقديمات: ${channelExists}\n` +
                            `${config.role ? `🏆 رتبة المقبولين: <@&${config.role}>` : '⚠️ لم يتم تحديد رتبة المقبولين'}\n` +
                            `❓ عدد الأسئلة: ${config.questions.length}\n\n` +
                            `الأعضاء الآن يمكنهم التقديم!`
                        )
                        .setColor('#00FF00')
                        .setTimestamp();

                    return interaction.editReply({
                        embeds: [successEmbed]
                    });

                } catch (err) {

                    console.error('خطأ في إنشاء لوحة التقديم:', err);

                    return interaction.editReply({
                        content: '❌ **حدث خطأ!**\n\n' +
                                 'تأكد من أن البوت يملك الصلاحيات التالية:\n' +
                                 '• إرسال رسائل\n' +
                                 '• تضمين روابط\n\n' +
                                 `تفاصيل الخطأ: ${err.message}`
                    });
                }
            }

        } catch (error) {

            console.error('خطأ في إعداد التقديمات:', error);

            const errorMessage = '❌ حدث خطأ غير متوقع.\n\nيرجى المحاولة مرة أخرى.';

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