const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionFlagsBits
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
    async handleButton(interaction) {

        const validButtons = [
            'start_application',
            'accept_application',
            'reject_application'
        ];

        if (!validButtons.some(id => interaction.customId.startsWith(id))) return;

        try {

            const applicationsData = getApplicationsData();
            const guildConfig = applicationsData.config[interaction.guild.id] || {};

            // ===================================================
            // 📝 بدء التقديم - فتح النموذج
            // ===================================================
            if (interaction.customId === 'start_application') {

                // التحقق من وجود تقديم سابق
                const existingApp = Object.values(applicationsData.applications).find(
                    app => app.userId === interaction.user.id && 
                           app.guildId === interaction.guild.id &&
                           app.status === 'pending'
                );

                if (existingApp) {
                    return interaction.reply({
                        content: '⚠️ لديك تقديم قيد المراجعة بالفعل!\n\nيرجى انتظار الرد على تقديمك السابق.',
                        ephemeral: true
                    });
                }

                const questions = guildConfig.questions || [
                    'ما اسمك؟',
                    'كم عمرك؟',
                    'لماذا تريد الانضمام؟'
                ];

                // نأخذ أول 5 أسئلة فقط (حد Discord للـ Modal)
                const modalQuestions = questions.slice(0, 5);

                const modal = new ModalBuilder()
                    .setCustomId('application_modal')
                    .setTitle('📝 نموذج التقديم');

                // إضافة الأسئلة للـ Modal
                modalQuestions.forEach((question, index) => {
                    const questionLower = question.toLowerCase();
                    
                    // تحديد نوع السؤال
                    const isAgeQuestion = questionLower.includes('عمر') || 
                                         questionLower.includes('age') ||
                                         (questionLower.includes('كم') && questionLower.includes('عمر'));
                    
                    const isNameQuestion = questionLower.includes('اسم') || 
                                          questionLower.includes('name') ||
                                          questionLower.includes('ما اسم');
                    
                    const isShortAnswer = isAgeQuestion || isNameQuestion;
                    
                    const textInput = new TextInputBuilder()
                        .setCustomId(`question_${index}`)
                        .setLabel(question.substring(0, 45)) // Discord limit
                        .setStyle(isShortAnswer ? TextInputStyle.Short : TextInputStyle.Paragraph)
                        .setRequired(true)
                        .setMinLength(isAgeQuestion ? 1 : (isNameQuestion ? 2 : 5))
                        .setMaxLength(isAgeQuestion ? 3 : (isNameQuestion ? 50 : 1000))
                        .setPlaceholder(
                            isAgeQuestion ? 'مثال: 18' : 
                            isNameQuestion ? 'مثال: أحمد' : 
                            'اكتب إجابتك هنا...'
                        );

                    const actionRow = new ActionRowBuilder().addComponents(textInput);
                    modal.addComponents(actionRow);
                });

                await interaction.showModal(modal);
            }

            // ===================================================
            // ✅ قبول التقديم
            // ===================================================
            if (interaction.customId.startsWith('accept_application_')) {

                const appId = interaction.customId.replace('accept_application_', '');
                const application = applicationsData.applications[appId];

                if (!application) {
                    return interaction.reply({
                        content: '❌ التقديم غير موجود',
                        ephemeral: true
                    });
                }

                if (application.status !== 'pending') {
                    return interaction.reply({
                        content: `⚠️ تم ${application.status === 'accepted' ? 'قبول' : 'رفض'} هذا التقديم بالفعل`,
                        ephemeral: true
                    });
                }

                // تحديث الحالة
                application.status = 'accepted';
                application.reviewedBy = interaction.user.id;
                application.reviewedAt = new Date().toISOString();
                saveApplicationsData(applicationsData);

                // إعطاء الرتبة
                if (guildConfig.role) {
                    try {
                        const member = await interaction.guild.members.fetch(application.userId);
                        await member.roles.add(guildConfig.role);
                    } catch (err) {
                        console.error('خطأ في إعطاء الرتبة:', err);
                    }
                }

                // إرسال رسالة للمتقدم
                try {
                    const user = await interaction.client.users.fetch(application.userId);
                    const acceptEmbed = new EmbedBuilder()
                        .setTitle('✅ تم قبول تقديمك!')
                        .setDescription(
                            `مبروك! تم قبول تقديمك في **${interaction.guild.name}**\n\n` +
                            `🎉 مرحباً بك في الفريق!\n` +
                            `${guildConfig.role ? `🏆 تم منحك رتبة: <@&${guildConfig.role}>` : ''}`
                        )
                        .setColor('#00FF00')
                        .setThumbnail(interaction.guild.iconURL())
                        .setTimestamp();

                    await user.send({ embeds: [acceptEmbed] });
                } catch (err) {
                    console.log('لم نتمكن من إرسال رسالة للعضو');
                }

                // تحديث الرسالة الأصلية
                const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                    .setColor('#00FF00')
                    .setFooter({ text: `تم القبول بواسطة ${interaction.user.tag}` });

                await interaction.update({
                    embeds: [updatedEmbed],
                    components: [] // إزالة الأزرار
                });

                await interaction.followUp({
                    content: `✅ تم قبول تقديم <@${application.userId}> بنجاح!`,
                    ephemeral: true
                });
            }

            // ===================================================
            // ❌ رفض التقديم
            // ===================================================
            if (interaction.customId.startsWith('reject_application_')) {

                const appId = interaction.customId.replace('reject_application_', '');
                const application = applicationsData.applications[appId];

                if (!application) {
                    return interaction.reply({
                        content: '❌ التقديم غير موجود',
                        ephemeral: true
                    });
                }

                if (application.status !== 'pending') {
                    return interaction.reply({
                        content: `⚠️ تم ${application.status === 'accepted' ? 'قبول' : 'رفض'} هذا التقديم بالفعل`,
                        ephemeral: true
                    });
                }

                // تحديث الحالة
                application.status = 'rejected';
                application.reviewedBy = interaction.user.id;
                application.reviewedAt = new Date().toISOString();
                saveApplicationsData(applicationsData);

                // إرسال رسالة للمتقدم
                try {
                    const user = await interaction.client.users.fetch(application.userId);
                    const rejectEmbed = new EmbedBuilder()
                        .setTitle('❌ تم رفض تقديمك')
                        .setDescription(
                            `نأسف لإبلاغك بأن تقديمك في **${interaction.guild.name}** لم يتم قبوله هذه المرة.\n\n` +
                            `لا تستسلم! يمكنك المحاولة مرة أخرى لاحقاً.\n` +
                            `نتمنى لك حظاً أوفر في المرات القادمة! 💪`
                        )
                        .setColor('#FF0000')
                        .setThumbnail(interaction.guild.iconURL())
                        .setTimestamp();

                    await user.send({ embeds: [rejectEmbed] });
                } catch (err) {
                    console.log('لم نتمكن من إرسال رسالة للعضو');
                }

                // تحديث الرسالة الأصلية
                const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                    .setColor('#FF0000')
                    .setFooter({ text: `تم الرفض بواسطة ${interaction.user.tag}` });

                await interaction.update({
                    embeds: [updatedEmbed],
                    components: [] // إزالة الأزرار
                });

                await interaction.followUp({
                    content: `❌ تم رفض تقديم <@${application.userId}>`,
                    ephemeral: true
                });
            }

        } catch (error) {
            console.error('خطأ في معالجة التقديم:', error);

            const errorMessage = '❌ حدث خطأ أثناء معالجة التقديم.';

            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: errorMessage, ephemeral: true });
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true });
                }
            } catch (e) {
                console.error('خطأ في إرسال رسالة الخطأ:', e);
            }
        }
    },

    async handleModal(interaction) {

        if (interaction.customId !== 'application_modal') return;

        try {

            await interaction.deferReply({ ephemeral: true });

            const applicationsData = getApplicationsData();
            const guildConfig = applicationsData.config[interaction.guild.id] || {};

            if (!guildConfig.channel) {
                return interaction.editReply({
                    content: '❌ لم يتم إعداد نظام التقديم بشكل صحيح. يرجى الاتصال بالإدارة.'
                });
            }

            const questions = guildConfig.questions || [];
            const answers = [];

            // جمع الإجابات
            for (let i = 0; i < Math.min(5, questions.length); i++) {
                const answer = interaction.fields.getTextInputValue(`question_${i}`);
                answers.push({
                    question: questions[i],
                    answer: answer
                });
            }

            // إنشاء ID فريد للتقديم
            const appId = `${interaction.guild.id}-${interaction.user.id}-${Date.now()}`;

            // حفظ التقديم
            applicationsData.applications[appId] = {
                id: appId,
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                answers: answers,
                status: 'pending',
                createdAt: new Date().toISOString()
            };

            saveApplicationsData(applicationsData);

            // إرسال التقديم لقناة المراجعة
            const reviewChannel = await interaction.guild.channels.fetch(guildConfig.channel);

            const embed = new EmbedBuilder()
                .setTitle('📝 تقديم جديد!')
                .setDescription(
                    `**المتقدم:** ${interaction.user} (${interaction.user.tag})\n` +
                    `**ID:** \`${interaction.user.id}\`\n` +
                    `**التاريخ:** <t:${Math.floor(Date.now() / 1000)}:F>\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━`
                )
                .setColor('#5865F2')
                .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
                .setTimestamp();

            // إضافة الأسئلة والإجابات
            answers.forEach((qa, index) => {
                embed.addFields({
                    name: `${index + 1}. ${qa.question}`,
                    value: qa.answer.substring(0, 1024),
                    inline: false
                });
            });

            embed.setFooter({ text: `Application ID: ${appId}` });

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`accept_application_${appId}`)
                    .setLabel('✅ قبول')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`reject_application_${appId}`)
                    .setLabel('❌ رفض')
                    .setStyle(ButtonStyle.Danger)
            );

            await reviewChannel.send({
                content: `${guildConfig.reviewRole ? `<@&${guildConfig.reviewRole}>` : '@here'} تقديم جديد!`,
                embeds: [embed],
                components: [buttons]
            });

            // تأكيد للمتقدم
            const confirmEmbed = new EmbedBuilder()
                .setTitle('✅ تم إرسال تقديمك بنجاح!')
                .setDescription(
                    `شكراً لك على التقديم في **${interaction.guild.name}**!\n\n` +
                    `⏳ سيتم مراجعة تقديمك من قبل الإدارة\n` +
                    `📩 ستصلك رسالة خاصة بالنتيجة قريباً\n` +
                    `⏱️ قد يستغرق الأمر بضع ساعات\n\n` +
                    `نتمنى لك التوفيق! 🍀`
                )
                .setColor('#00FF00')
                .setTimestamp();

            await interaction.editReply({
                embeds: [confirmEmbed]
            });

        } catch (error) {
            console.error('خطأ في معالجة النموذج:', error);

            try {
                await interaction.editReply({
                    content: '❌ حدث خطأ أثناء إرسال تقديمك. يرجى المحاولة مرة أخرى لاحقاً.'
                });
            } catch (e) {
                console.error('خطأ في إرسال رسالة الخطأ:', e);
            }
        }
    }
};