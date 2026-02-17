const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits, 
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');

const fs = require('fs');
const path = require('path');

// ✅ يقرأ من مجلد المشروع الرئيسي
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
    async handleButton(interaction) {

        const validButtons = [
            'create_ticket',
            'claim_ticket',
            'unclaim_ticket',
            'close_ticket',
            'escalate_claim_staff',
            'escalate_claim_middle',
            'escalate_claim_high',
            'escalate_claim_owner'
        ];

        if (!validButtons.includes(interaction.customId)) return;

        try {

            const ticketsData = getTicketsData();
            const guildConfig = ticketsData.config[interaction.guild.id] || {};

            // ===================================================
            // 🎫 إنشاء تكت - فتح نموذج السبب
            // ===================================================
            if (interaction.customId === 'create_ticket') {

                // التحقق من وجود تكت سابق
                const existing = Object.values(ticketsData.tickets).find(
                    t => t.userId === interaction.user.id && 
                         t.guildId === interaction.guild.id &&
                         !t.closed
                );

                if (existing) {
                    return interaction.reply({
                        content: `⚠️ لديك تكت مفتوح بالفعل: <#${existing.channelId}>\n\nيرجى استخدام التكت الموجود أو إغلاقه أولاً.`,
                        ephemeral: true
                    });
                }

                // فتح نموذج لكتابة سبب التكت
                const modal = new ModalBuilder()
                    .setCustomId('ticket_reason_modal')
                    .setTitle('📝 سبب فتح التكت');

                const reasonInput = new TextInputBuilder()
                    .setCustomId('ticket_reason')
                    .setLabel('ما هو سبب فتح التكت؟')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('اكتب هنا سبب فتحك للتكت بالتفصيل...')
                    .setRequired(true)
                    .setMinLength(10)
                    .setMaxLength(500);

                const actionRow = new ActionRowBuilder().addComponents(reasonInput);
                modal.addComponents(actionRow);

                await interaction.showModal(modal);
            }

            // ===================================================
            // ✅ استلام التكت
            // ===================================================
            if (interaction.customId === 'claim_ticket') {

                await interaction.deferReply({ ephemeral: true });

                const ticketId = `${interaction.guild.id}-${interaction.channel.id}`;
                const ticket = ticketsData.tickets[ticketId];

                if (!ticket)
                    return interaction.editReply({ 
                        content: '❌ هذه القناة ليست تكت صالح'
                    });

                if (ticket.claimed)
                    return interaction.editReply({
                        content: `⚠️ هذا التكت تم استلامه بالفعل من قبل <@${ticket.claimedBy}>`
                    });

                if (interaction.user.id === ticket.userId)
                    return interaction.editReply({
                        content: '❌ لا يمكنك استلام تكتك الخاص. يجب على أحد أعضاء فريق الدعم استلامه.'
                    });

                ticket.claimed = true;
                ticket.claimedBy = interaction.user.id;
                ticket.claimedAt = new Date().toISOString();
                saveTicketsData(ticketsData);

                const embed = new EmbedBuilder()
                    .setDescription(
                        `✅ **تم استلام التكت**\n\n` +
                        `👤 **المسؤول:** ${interaction.user}\n` +
                        `⏰ **الوقت:** <t:${Math.floor(Date.now() / 1000)}:R>\n\n` +
                        `سيتم الرد على استفساركم الآن`
                    )
                    .setColor('#00FF00')
                    .setTimestamp();

                await interaction.channel.send({ embeds: [embed] });

                // تحديث صلاحيات القناة - منح المستلم صلاحية الكتابة
                try {
                    await interaction.channel.permissionOverwrites.edit(
                        interaction.user.id,
                        {
                            ViewChannel: true,
                            SendMessages: true,
                            ReadMessageHistory: true,
                            AttachFiles: true,
                            EmbedLinks: true
                        }
                    );
                } catch (err) {
                    console.error('خطأ في تحديث الصلاحيات:', err);
                }

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('unclaim_ticket')
                        .setLabel('❌ إلغاء الاستلام')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('close_ticket')
                        .setLabel('🔒 إغلاق التكت')
                        .setStyle(ButtonStyle.Danger)
                );

                if (interaction.message) {
                    await interaction.message.edit({ components: [row] });
                }

                return interaction.editReply({ 
                    content: '✅ تم استلام التكت بنجاح! يمكنك الآن الرد على العضو.'
                });
            }

            // ===================================================
            // ❌ إلغاء الاستلام
            // ===================================================
            if (interaction.customId === 'unclaim_ticket') {

                await interaction.deferReply({ ephemeral: true });

                const ticketId = `${interaction.guild.id}-${interaction.channel.id}`;
                const ticket = ticketsData.tickets[ticketId];

                if (!ticket || !ticket.claimed)
                    return interaction.editReply({ 
                        content: '❌ هذا التكت غير مستلم من أي شخص'
                    });

                const canUnclaim = 
                    ticket.claimedBy === interaction.user.id ||
                    interaction.member.permissions.has(PermissionFlagsBits.Administrator);

                if (!canUnclaim)
                    return interaction.editReply({
                        content: `❌ لا يمكنك إلغاء استلام هذا التكت. تم استلامه من قبل <@${ticket.claimedBy}>`
                    });

                const previousClaimer = ticket.claimedBy;
                ticket.claimed = false;
                ticket.claimedBy = null;
                saveTicketsData(ticketsData);

                const embed = new EmbedBuilder()
                    .setDescription(
                        `❌ **تم إلغاء استلام التكت**\n\n` +
                        `👤 **تم الإلغاء بواسطة:** ${interaction.user}\n` +
                        `⏰ **الوقت:** <t:${Math.floor(Date.now() / 1000)}:R>\n\n` +
                        `يمكن الآن لأي عضو من فريق الدعم استلام التكت`
                    )
                    .setColor('#FFA500')
                    .setTimestamp();

                await interaction.channel.send({ embeds: [embed] });

                // إزالة صلاحية الكتابة من المستلم السابق - يبقى يشاهد فقط
                try {
                    // إذا كان المستلم السابق من رتبة الدعم، سيرث صلاحياتها (مشاهدة فقط)
                    // إذا لم يكن من رتبة الدعم، نزيله بالكامل
                    const member = await interaction.guild.members.fetch(previousClaimer);
                    const hasRole = guildConfig.supportRole && member.roles.cache.has(guildConfig.supportRole);
                    
                    if (hasRole) {
                        // لديه رتبة الدعم - سيرث صلاحيات الرتبة (مشاهدة فقط)
                        await interaction.channel.permissionOverwrites.delete(previousClaimer);
                    } else {
                        // ليس لديه رتبة الدعم - نزيله بالكامل
                        await interaction.channel.permissionOverwrites.delete(previousClaimer);
                    }
                } catch (err) {
                    console.error('خطأ في إزالة الصلاحيات:', err);
                }

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('claim_ticket')
                        .setLabel('✅ استلام التكت')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('close_ticket')
                        .setLabel('🔒 إغلاق التكت')
                        .setStyle(ButtonStyle.Danger)
                );

                if (interaction.message) {
                    await interaction.message.edit({ components: [row] });
                }

                return interaction.editReply({ 
                    content: '✅ تم إلغاء الاستلام. يمكن الآن لأي عضو دعم استلام التكت.'
                });
            }

            // ===================================================
            // 🆘 استلام طلب المساعدة
            // ===================================================
            if (interaction.customId.startsWith('escalate_claim_')) {

                await interaction.deferReply({ ephemeral: true });

                const ticketId = `${interaction.guild.id}-${interaction.channel.id}`;
                const ticket = ticketsData.tickets[ticketId];

                if (!ticket) {
                    return interaction.editReply({
                        content: '❌ هذه القناة ليست تكت صالح'
                    });
                }

                if (!ticket.escalated) {
                    return interaction.editReply({
                        content: '❌ لم يتم طلب مساعدة في هذا التكت'
                    });
                }

                if (ticket.escalateClaimed) {
                    return interaction.editReply({
                        content: `⚠️ تم استلام الطلب بالفعل من قبل <@${ticket.escalateClaimedBy}>`
                    });
                }

                // ❌ منع صاحب التكت من الاستلام
                if (interaction.user.id === ticket.userId) {
                    return interaction.editReply({
                        content: '❌ لا يمكنك استلام طلب المساعدة في تكتك الخاص!'
                    });
                }

                // التحقق من أن المستلم لديه الرتبة المطلوبة
                const escalateData = require(path.join(process.cwd(), 'escalate.json'));
                const config = escalateData[interaction.guild.id];
                
                if (config) {
                    const requiredRoleId = config[`${ticket.escalatedTo}Role`];
                    
                    if (requiredRoleId && !interaction.member.roles.cache.has(requiredRoleId)) {
                        return interaction.editReply({
                            content: `❌ يجب أن تكون لديك رتبة <@&${requiredRoleId}> لاستلام هذا الطلب!`
                        });
                    }
                }

                // حفظ معلومات الاستلام
                ticket.escalateClaimed = true;
                ticket.escalateClaimedBy = interaction.user.id;
                saveTicketsData(ticketsData);

                // ⭐ إضافة 3 نقاط للمستلم
                try {
                    const pointsFile = path.join(process.cwd(), 'points.json');
                    let points = {};
                    if (fs.existsSync(pointsFile)) {
                        points = JSON.parse(fs.readFileSync(pointsFile, 'utf-8'));
                    }
                    
                    const oldPoints = points[interaction.user.id] || 0;
                    points[interaction.user.id] = oldPoints + 3;
                    fs.writeFileSync(pointsFile, JSON.stringify(points, null, 2));
                    
                    console.log(`⭐ إضافة 3 نقاط لـ ${interaction.user.tag} (استلام طلب مساعدة)`);
                    console.log(`📊 النقاط: ${oldPoints} → ${points[interaction.user.id]}`);
                } catch (err) {
                    console.error('خطأ في إضافة النقاط:', err);
                }

                // منح صلاحية الكتابة للشخص الجديد
                try {
                    await interaction.channel.permissionOverwrites.edit(
                        interaction.user.id,
                        {
                            ViewChannel: true,
                            SendMessages: true,
                            ReadMessageHistory: true,
                            AttachFiles: true,
                            EmbedLinks: true
                        }
                    );
                } catch (err) {
                    console.error('خطأ في منح الصلاحيات:', err);
                }

                const embed = new EmbedBuilder()
                    .setDescription(
                        `✅ **تم استلام طلب المساعدة**\n\n` +
                        `👤 **المستلم:** ${interaction.user}\n` +
                        `⏰ **الوقت:** <t:${Math.floor(Date.now() / 1000)}:R>\n` +
                        `⭐ **النقاط:** +3 نقاط\n\n` +
                        `يمكنك الآن الكتابة في التكت والمساعدة`
                    )
                    .setColor('#00FF00')
                    .setTimestamp();

                await interaction.channel.send({ embeds: [embed] });

                // حذف الأزرار من الرسالة الأصلية
                if (interaction.message) {
                    await interaction.message.edit({ components: [] });
                }

                return interaction.editReply({
                    content: '✅ تم استلام طلب المساعدة! حصلت على **3 نقاط** ⭐\n\nيمكنك الآن الكتابة في التكت.'
                });
            }

            // ===================================================
            // 🔒 إغلاق التكت
            // ===================================================
            if (interaction.customId === 'close_ticket') {

                await interaction.deferReply({ ephemeral: true });

                const ticketId = `${interaction.guild.id}-${interaction.channel.id}`;
                const ticket = ticketsData.tickets[ticketId];

                if (!ticket)
                    return interaction.editReply({ 
                        content: '❌ هذه القناة ليست تكت صالح'
                    });

                const canClose =
                    interaction.user.id === ticket.userId ||
                    interaction.user.id === ticket.claimedBy ||
                    interaction.member.permissions.has(PermissionFlagsBits.Administrator);

                if (!canClose)
                    return interaction.editReply({
                        content: '❌ لا تملك صلاحية إغلاق هذا التكت.\n\nيمكن فقط لصاحب التكت، المسؤول الذي استلمه، أو الإدارة إغلاق التكت.'
                    });

                ticket.closed = true;
                ticket.closedBy = interaction.user.id;
                ticket.closedAt = new Date().toISOString();
                saveTicketsData(ticketsData);

                // ⭐ إضافة 5 نقاط للمستلم إذا كان التكت مستلماً
                let pointsMessage = '';
                if (ticket.claimed && ticket.claimedBy) {
                    try {
                        const pointsFile = path.join(process.cwd(), 'points.json');
                        let points = {};
                        if (fs.existsSync(pointsFile)) {
                            points = JSON.parse(fs.readFileSync(pointsFile, 'utf-8'));
                        }
                        
                        const oldPoints = points[ticket.claimedBy] || 0;
                        points[ticket.claimedBy] = oldPoints + 5;
                        fs.writeFileSync(pointsFile, JSON.stringify(points, null, 2));
                        
                        const claimer = await interaction.guild.members.fetch(ticket.claimedBy).catch(() => null);
                        if (claimer) {
                            pointsMessage = `\n⭐ ${claimer.user} حصل على **5 نقاط** لإغلاق التكت!`;
                            console.log(`⭐ إضافة 5 نقاط لـ ${claimer.user.tag} (إغلاق تكت)`);
                            console.log(`📊 النقاط: ${oldPoints} → ${points[ticket.claimedBy]}`);
                        }
                    } catch (err) {
                        console.error('خطأ في إضافة النقاط:', err);
                    }
                }

                const closeEmbed = new EmbedBuilder()
                    .setTitle('🔒 إغلاق التكت')
                    .setDescription(
                        `تم إغلاق التكت بواسطة ${interaction.user}\n\n` +
                        `⏰ سيتم حذف القناة بعد **5 ثوانٍ**...\n\n` +
                        `شكراً لاستخدامك نظام التكتات!${pointsMessage}`
                    )
                    .setColor('#FF0000')
                    .setTimestamp();

                await interaction.channel.send({ embeds: [closeEmbed] });
                await interaction.editReply({ 
                    content: '✅ جاري إغلاق التكت وحذف القناة...'
                });

                setTimeout(async () => {
                    try {
                        await interaction.channel.delete();
                    } catch (err) {
                        console.error('خطأ في حذف القناة:', err);
                    }
                }, 5000);
            }

        } catch (error) {
            console.error('خطأ في معالجة التكت:', error);

            const errorMessage = '❌ حدث خطأ أثناء معالجة التكت. يرجى المحاولة مرة أخرى أو الاتصال بالإدارة.';

            if (interaction.deferred) {
                await interaction.editReply({ content: errorMessage });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    },

    // ===================================================
    // 📝 معالجة نموذج سبب التكت
    // ===================================================
    async handleModal(interaction) {

        if (interaction.customId !== 'ticket_reason_modal') return;

        try {

            await interaction.deferReply({ ephemeral: true });

            const ticketsData = getTicketsData();
            const guildConfig = ticketsData.config[interaction.guild.id] || {};

            if (!guildConfig.category) {
                return interaction.editReply({
                    content: '❌ لم يتم إعداد نظام التكتات بعد. يرجى الاتصال بالإدارة.'
                });
            }

            // الحصول على السبب من النموذج
            const ticketReason = interaction.fields.getTextInputValue('ticket_reason');

            const ticketNumber = Date.now().toString().slice(-6);
            const category = await interaction.guild.channels.fetch(guildConfig.category);

            const ticketChannel = await interaction.guild.channels.create({
                name: `ticket-${ticketNumber}`,
                type: ChannelType.GuildText,
                parent: category.id,
                permissionOverwrites: [
                    // ❌ منع الجميع من رؤية التكت
                    {
                        id: interaction.guild.id,
                        deny: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages
                        ]
                    },
                    // ✅ السماح لصاحب التكت بالمشاهدة والكتابة
                    {
                        id: interaction.user.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.AttachFiles,
                            PermissionFlagsBits.EmbedLinks
                        ]
                    },
                    // ✅ السماح للبوت بإدارة التكت
                    {
                        id: interaction.client.user.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ManageChannels,
                            PermissionFlagsBits.ManageMessages
                        ]
                    },
                    // 👮 رتبة الدعم - مشاهدة فقط بدون كتابة
                    ...(guildConfig.supportRole ? [{
                        id: guildConfig.supportRole,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.ReadMessageHistory
                        ],
                        deny: [
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.AddReactions,
                            PermissionFlagsBits.CreatePublicThreads,
                            PermissionFlagsBits.CreatePrivateThreads
                        ]
                    }] : [])
                ]
            });

            const ticketId = `${interaction.guild.id}-${ticketChannel.id}`;

            ticketsData.tickets[ticketId] = {
                channelId: ticketChannel.id,
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                reason: ticketReason, // حفظ السبب
                claimed: false,
                claimedBy: null,
                closed: false,
                createdAt: new Date().toISOString(),
                ticketNumber: ticketNumber
            };

            saveTicketsData(ticketsData);

            const embed = new EmbedBuilder()
                .setTitle('🎫 نظام التكت')
                .setDescription(
                    `مرحباً بك ${interaction.user}\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `📝 **سبب فتح التكت:**\n${ticketReason}\n\n` +
                    `سيتم إشعار فريق الدعم لمساعدتك في أقرب وقت ممكن\n` +
                    `⏱️ يرجى الانتظار حتى يتم استلام التكت من أحد المسؤولين\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `⚠️ **للستاف:** يجب استلام التكت للكتابة`
                )
                .setColor('#5865F2')
                .setFooter({ 
                    text: `رقم التكت: ${ticketNumber} | ${interaction.guild.name}`,
                    iconURL: interaction.guild.iconURL()
                })
                .setTimestamp();

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('claim_ticket')
                    .setLabel('✅ استلام التكت')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('🔒 إغلاق التكت')
                    .setStyle(ButtonStyle.Danger)
            );

            await ticketChannel.send({
                content: `${interaction.user}${guildConfig.supportRole ? ` | <@&${guildConfig.supportRole}>` : ''}`,
                embeds: [embed],
                components: [buttons]
            });

            return interaction.editReply({
                content: `✅ **تم إنشاء التكت بنجاح!**\n\n${ticketChannel}\n\nيمكنك الآن التواصل مع فريق الدعم.`
            });

        } catch (error) {
            console.error('خطأ في إنشاء التكت:', error);

            try {
                await interaction.editReply({
                    content: '❌ حدث خطأ أثناء إنشاء التكت. يرجى المحاولة مرة أخرى لاحقاً.'
                });
            } catch (e) {
                console.error('خطأ في إرسال رسالة الخطأ:', e);
            }
        }
    }
};