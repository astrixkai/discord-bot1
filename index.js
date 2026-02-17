const { Client, GatewayIntentBits, Collection, EmbedBuilder, AuditLogEvent, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
    ],
});

client.commands = new Collection();
client.slashCommands = new Collection();

// ========================
// تحميل نظام تسجيل الدخول/الخروج
// ========================
const loginCommand = require('./LoginSystem.js');
const setupLoginCommand = require('./SetupLogin.js');
const loginButtonHandler = require('./LoginButtonHandler.js');
client.slashCommands.set(loginCommand.data.name, loginCommand);
client.slashCommands.set(setupLoginCommand.data.name, setupLoginCommand);

// ========================
// تحميل نظام التكتات
// ========================
const ticketSetupCommand = require('./commands/TicketSetup.js');
const ticketButtonHandler = require('./TicketButtonHandler.js');
client.slashCommands.set(ticketSetupCommand.data.name, ticketSetupCommand);

// ========================
// تحميل نظام التقديم
// ========================
const applicationSetupCommand = require('./commands/ApplicationSetup.js');
const applicationHandler = require('./commands/ApplicationHandler.js');
client.slashCommands.set(applicationSetupCommand.data.name, applicationSetupCommand);

// ========================
// تحميل نظام طلب المساعدة
// ========================
const escalateSetupCommand = require('./commands/EscalateCommand.js');
const { staffCommand, middleCommand, highCommand, ownerCommand } = require('./commands/EscalateCommands.js');
client.slashCommands.set(escalateSetupCommand.data.name, escalateSetupCommand);
client.slashCommands.set(staffCommand.data.name, staffCommand);
client.slashCommands.set(middleCommand.data.name, middleCommand);
client.slashCommands.set(highCommand.data.name, highCommand);
client.slashCommands.set(ownerCommand.data.name, ownerCommand);

// ========================
// تحميل نظام AFK
// ========================
const afkSystem = require('./AfkSystem.js');

// Slash Command لنظام AFK
const afkSlashCommand = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('تفعيل أو إلغاء وضع AFK')
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('سبب الغياب')
                .setRequired(false)
        ),
    async execute(interaction) {
        const reason = interaction.options.getString('reason') || 'AFK';
        const member = interaction.member;

        const existingAfk = afkSystem.isAfk(interaction.user.id, interaction.guild.id);

        if (existingAfk) {
            // إلغاء AFK
            afkSystem.removeAfk(interaction.user.id, interaction.guild.id);

            try {
                if (member.nickname && member.nickname.startsWith('[AFK]')) {
                    const originalName = member.nickname.replace('[AFK] ', '');
                    await member.setNickname(
                        originalName === interaction.user.username ? null : originalName
                    );
                }
            } catch (err) {}

            const embed = new EmbedBuilder()
                .setDescription('✅ تم إلغاء وضع AFK')
                .setColor('#00FF00')
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
            setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);

        } else {
            // تفعيل AFK
            afkSystem.setAfk(interaction.user.id, interaction.guild.id, reason);

            try {
                const currentName = member.nickname || interaction.user.username;
                if (!currentName.startsWith('[AFK]')) {
                    await member.setNickname(`[AFK] ${currentName}`);
                }
            } catch (err) {}

            const embed = new EmbedBuilder()
                .setTitle('😴 وضع AFK مفعّل')
                .setDescription(
                    `**${interaction.user.username}** الآن في وضع AFK\n\n` +
                    `📝 **السبب:** ${reason}\n\n` +
                    `سيتم إخبار الآخرين عند منشنتك`
                )
                .setColor('#FFA500')
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
        }
    }
};

client.slashCommands.set(afkSlashCommand.data.name, afkSlashCommand);

// ========================
// نظام التقييم الإداري — الإعدادات
// ========================
const rateSetupCommand = {
    data: new SlashCommandBuilder()
        .setName('rate-setup')
        .setDescription('تحديد قناة تقييمات الإدارة (Admin/Owner)')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('القناة التي سيتم إرسال التقييمات فيها')
                .setRequired(true)
        ),

    async execute(interaction) {
        // Owner أو Administrator
        const isOwner = interaction.user.id === interaction.guild.ownerId;
        const isAdmin = interaction.member.permissions.has('Administrator');
        if (!isOwner && !isAdmin) {
            return interaction.reply({ content: '❌ هذا الأمر للمدراء وصاحب السيرفر فقط!', ephemeral: true });
        }

        const channel = interaction.options.getChannel('channel');

        const configFile = path.join(__dirname, 'rate-config.json');
        let config = {};
        if (fs.existsSync(configFile)) config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));

        config[interaction.guild.id] = { channelId: channel.id };
        fs.writeFileSync(configFile, JSON.stringify(config, null, 2));

        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('⚙️  تم إعداد قناة التقييمات')
            .setDescription(`✅  سيتم إرسال جميع التقييمات الإدارية إلى ${channel}`)
            .setFooter({ text: `تم الإعداد بواسطة ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};

client.slashCommands.set(rateSetupCommand.data.name, rateSetupCommand);

// ========================
// Slash Command نظام التقييم الإداري
// ========================
const rateCommand = {
    data: new SlashCommandBuilder()
        .setName('rate')
        .setDescription('تقييم إداري لعضو')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('العضو المراد تقييمه')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('type')
                .setDescription('نوع التقييم')
                .setRequired(true)
                .addChoices(
                    { name: '✅  إيجابي', value: 'positive' },
                    { name: '❌  سلبي',   value: 'negative' },
                )
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('الملاحظة أو سبب التقييم')
                .setRequired(true)
        ),

    async execute(interaction) {
        const target    = interaction.options.getUser('user');
        const type      = interaction.options.getString('type');
        const reason    = interaction.options.getString('reason');
        const evaluator = interaction.user;
        const guild     = interaction.guild;

        if (target.id === evaluator.id)
            return interaction.reply({ content: '❌ لا يمكنك تقييم نفسك!', ephemeral: true });
        if (target.bot)
            return interaction.reply({ content: '❌ لا يمكن تقييم البوتات!', ephemeral: true });

        // ── قناة التقييمات ──────────────────────────────
        const configFile = path.join(__dirname, 'rate-config.json');
        let config = {};
        if (fs.existsSync(configFile)) config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));

        const guildConfig  = config[guild.id];
        const rateChannel  = guildConfig ? guild.channels.cache.get(guildConfig.channelId) : null;

        if (!rateChannel) {
            return interaction.reply({
                content: '⚠️ لم يتم تحديد قناة التقييمات بعد!\nاستخدم `/rate-setup #القناة` أولاً.',
                ephemeral: true
            });
        }

        const isPositive = type === 'positive';
        const color  = isPositive ? 0x57F287 : 0xED4245;
        const icon   = isPositive ? '✅' : '❌';
        const label  = isPositive ? 'تقييم إيجابي' : 'تقييم سلبي';
        const badge  = isPositive
            ? '```ansi\n\u001b[2;32m▌ إيجابي\u001b[0m\n```'
            : '```ansi\n\u001b[2;31m▌ سلبي\u001b[0m\n```';

        // ── جلب بيانات العضو ────────────────────────────
        let targetMember;
        try { targetMember = await guild.members.fetch(target.id); } catch {}

        const topRole = targetMember?.roles.cache
            .filter(r => r.id !== guild.id)
            .sort((a, b) => b.position - a.position)
            .first();

        const topRoleText   = topRole ? topRole.toString() : '—';
        const joinedDate    = targetMember
            ? `<t:${Math.floor(targetMember.joinedAt.getTime() / 1000)}:D>`
            : '—';
        const joinedRelative = targetMember
            ? `<t:${Math.floor(targetMember.joinedAt.getTime() / 1000)}:R>`
            : '';

        // ── حفظ التقييم ─────────────────────────────────
        const ratingsFile = path.join(__dirname, 'ratings.json');
        let ratings = {};
        if (fs.existsSync(ratingsFile)) ratings = JSON.parse(fs.readFileSync(ratingsFile, 'utf-8'));

        if (!ratings[target.id]) ratings[target.id] = { positive: 0, negative: 0, history: [] };
        if (isPositive) ratings[target.id].positive++;
        else            ratings[target.id].negative++;

        ratings[target.id].history.unshift({
            type, reason,
            evaluator: evaluator.tag,
            evaluatorId: evaluator.id,
            date: new Date().toISOString()
        });
        ratings[target.id].history = ratings[target.id].history.slice(0, 20);
        fs.writeFileSync(ratingsFile, JSON.stringify(ratings, null, 2));

        const pos   = ratings[target.id].positive;
        const neg   = ratings[target.id].negative;
        const total = pos + neg;
        const pct   = total > 0 ? Math.round((pos / total) * 100) : 0;

        const barLen  = 14;
        const filled  = Math.round((pct / 100) * barLen);
        const bar     = '█'.repeat(filled) + '░'.repeat(barLen - filled);

        // ── Embed الرئيسي (للقناة) ───────────────────────
        const mainEmbed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({
                name: `${guild.name}  •  تقييم إداري`,
                iconURL: guild.iconURL({ size: 128 }) ?? undefined
            })
            .setTitle(`${icon}  ${label}`)
            .setThumbnail(target.displayAvatarURL({ size: 256, forceStatic: false }))
            .addFields(
                {
                    name: '👤  العضو المُقيَّم',
                    value: `${target}\n> \`${target.tag}\`\n> ID: \`${target.id}\``,
                    inline: true
                },
                {
                    name: '🔰  أعلى رتبة',
                    value: `${topRoleText}`,
                    inline: true
                },
                {
                    name: '📅  انضمام',
                    value: `${joinedDate}\n${joinedRelative}`,
                    inline: true
                },
                { name: '\u200B', value: '\u200B', inline: false },
                {
                    name: '📝  الملاحظة',
                    value: `>>> ${reason}`,
                    inline: false
                },
                { name: '\u200B', value: '\u200B', inline: false },
                {
                    name: '📊  سجل التقييمات الكلي',
                    value: `\`\`\`\n  ✅  إيجابي  :  ${pos}\n  ❌  سلبي    :  ${neg}\n  📈  النسبة  :  ${pct}%\n  [${bar}]\n\`\`\``,
                    inline: false
                }
            )
            .setFooter({
                text: `قُيِّم بواسطة: ${evaluator.tag}`,
                iconURL: evaluator.displayAvatarURL({ size: 64 })
            })
            .setTimestamp();

        // ── الإرسال ──────────────────────────────────────
        // 1) قناة التقييمات
        await rateChannel.send({ embeds: [mainEmbed] });

        // 2) رسالة خاصة للعضو — نفس الـ embed الكامل
        let dmSent = true;
        try { await target.send({ embeds: [mainEmbed] }); }
        catch { dmSent = false; }

        // 3) رد سريع للأونر (ephemeral)
        const confirmEmbed = new EmbedBuilder()
            .setColor(color)
            .setDescription(
                `${icon}  تم إرسال التقييم بنجاح!\n\n` +
                `📢  **القناة:** ${rateChannel}\n` +
                `📩  **رسالة خاصة:** ${dmSent ? '✅ تم' : '❌ لم يستطع البوت إرسالها (الخاص مغلق)'}`
            )
            .setTimestamp();

        await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
    }
};

client.slashCommands.set(rateCommand.data.name, rateCommand);

// ========================
// Slash Command عرض التقييمات
// ========================
const myratesCommand = {
    data: new SlashCommandBuilder()
        .setName('myrates')
        .setDescription('عرض سجل تقييمات عضو')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('العضو (اتركه فارغاً لعرض تقييماتك)')
                .setRequired(false)
        ),

    async execute(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;

        const ratingsFile = path.join(__dirname, 'ratings.json');
        let ratings = {};
        if (fs.existsSync(ratingsFile)) ratings = JSON.parse(fs.readFileSync(ratingsFile, 'utf-8'));

        const data = ratings[target.id];

        if (!data || (data.positive === 0 && data.negative === 0)) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x95A5A6)
                        .setThumbnail(target.displayAvatarURL({ size: 128 }))
                        .setDescription(`📭  **${target.username}** لا يوجد لديه أي تقييمات حتى الآن`)
                        .setTimestamp()
                ],
                ephemeral: true
            });
        }

        const pos   = data.positive  || 0;
        const neg   = data.negative  || 0;
        const total = pos + neg;
        const pct   = total > 0 ? Math.round((pos / total) * 100) : 0;

        const barLen = 14;
        const filled = Math.round((pct / 100) * barLen);
        const bar    = '█'.repeat(filled) + '░'.repeat(barLen - filled);

        // لون حسب النسبة
        const color = pct >= 70 ? 0x57F287 : pct >= 40 ? 0xFEE75C : 0xED4245;

        // آخر 5 تقييمات
        const last5 = (data.history || []).slice(0, 5)
            .map(h => {
                const t  = h.type === 'positive' ? '✅' : '❌';
                const ts = `<t:${Math.floor(new Date(h.date).getTime() / 1000)}:D>`;
                return `${t}  **${h.evaluator}**  •  ${ts}\n> ${h.reason}`;
            }).join('\n\n') || '—';

        const embed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({
                name: `سجل التقييمات  •  ${interaction.guild.name}`,
                iconURL: interaction.guild.iconURL({ size: 64 }) ?? undefined
            })
            .setTitle(`📋  تقييمات ${target.username}`)
            .setThumbnail(target.displayAvatarURL({ size: 256, forceStatic: false }))
            .addFields(
                {
                    name: '📊  الإحصائيات',
                    value: `\`\`\`\n  ✅  إيجابي  :  ${pos}\n  ❌  سلبي    :  ${neg}\n  📈  النسبة  :  ${pct}%\n  [${bar}]\n\`\`\``,
                    inline: false
                },
                {
                    name: `🕓  آخر ${Math.min(5, data.history?.length || 0)} تقييمات`,
                    value: last5,
                    inline: false
                }
            )
            .setFooter({ text: `إجمالي التقييمات: ${total}  •  ${target.tag}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};

client.slashCommands.set(myratesCommand.data.name, myratesCommand);


const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));
    for (const file of commandFiles) {
        const command = require(`./commands/${file}`);
        client.commands.set(command.name, command);
        if (command.data) {
            client.slashCommands.set(command.data.name, command);
        }
    }
}

// ========================
// Ready Event
// ========================
client.once('ready', async () => {
    console.log(`✅ Bot is ready as ${client.user.tag}`);

    try {
        const commands = Array.from(client.slashCommands.values()).map(cmd => cmd.data);
        if (commands.length > 0) {
            await client.application.commands.set(commands);
            console.log(`📝 تم تسجيل ${commands.length} أوامر`);
        }
    } catch (error) {
        console.error('خطأ في تسجيل الأوامر:', error);
    }
});

// ========================
// معالجة التفاعلات
// ========================
client.on('interactionCreate', async interaction => {
    try {
        // إلغاء AFK تلقائياً عند استخدام أي slash command (عدا /afk نفسه)
        if (interaction.isChatInputCommand() && interaction.commandName !== 'afk' && interaction.guild) {
            const afkData = afkSystem.isAfk(interaction.user.id, interaction.guild.id);
            if (afkData) {
                afkSystem.removeAfk(interaction.user.id, interaction.guild.id);
                try {
                    const member = await interaction.guild.members.fetch(interaction.user.id);
                    if (member.nickname && member.nickname.startsWith('[AFK]')) {
                        const originalName = member.nickname.replace('[AFK] ', '');
                        await member.setNickname(
                            originalName === interaction.user.username ? null : originalName
                        );
                    }
                } catch (err) {}
            }
        }

        // Slash Commands
        if (interaction.isChatInputCommand()) {
            const command = client.slashCommands.get(interaction.commandName);
            if (!command) return;
            await command.execute(interaction);
            return;
        }

        // Buttons
        if (interaction.isButton()) {
            await loginButtonHandler.handleButton(interaction);
            await ticketButtonHandler.handleButton(interaction);
            await applicationHandler.handleButton(interaction);
            return;
        }

        // Modals
        if (interaction.isModalSubmit()) {
            await applicationHandler.handleModal(interaction);
            await ticketButtonHandler.handleModal(interaction);
            return;
        }

    } catch (error) {
        console.error('خطأ في معالجة التفاعل:', error);
        try {
            if (interaction.replied === false && interaction.deferred === false)
                await interaction.reply({ content: '❌ حدث خطأ', ephemeral: true });
        } catch (e) {}
    }
});

// ========================
// معالجة الرسائل
// ========================
client.on('messageCreate', async message => {
    try {
        if (message.author.bot) {
            // مراقبة رسائل ProBot
            if (message.author.id === '282859044593598464') {
                console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('📨 ProBot Message Detected!');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('📝 Content:', message.content);
                console.log('📊 Embeds Count:', message.embeds.length);

                if (message.embeds.length > 0) {
                    message.embeds.forEach((embed, index) => {
                        console.log(`\n📋 Embed #${index + 1}:`);
                        console.log('  Title:', embed.title);
                        console.log('  Description:', embed.description);
                        console.log('  Color:', embed.color);
                        console.log('  Fields:', JSON.stringify(embed.fields, null, 2));
                        console.log('  Footer:', embed.footer);
                        console.log('  Author:', embed.author);
                    });
                }
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

                try {
                    const embeds = message.embeds || [];
                    let actionType = null;
                    let moderatorMention = null;

                    if (embeds.length > 0) {
                        const embed = embeds[0];
                        const description = embed.description || '';
                        const title = embed.title || '';
                        const fields = embed.fields || [];
                        const fullText = (title + ' ' + description).toLowerCase();

                        if (fullText.includes('تم تحذير') || fullText.includes('warned') || fullText.includes('warn')) {
                            actionType = 'warn';
                        } else if (fullText.includes('تم إسكات') || fullText.includes('muted') || fullText.includes('mute') || fullText.includes('timeout')) {
                            actionType = 'timeout';
                        } else if (fullText.includes('تم طرد') || fullText.includes('kicked') || fullText.includes('kick')) {
                            actionType = 'kick';
                        } else if (fullText.includes('تم حظر') || fullText.includes('banned') || fullText.includes('ban')) {
                            actionType = 'ban';
                        }

                        for (const field of fields) {
                            const mentionMatch = field.value.match(/<@!?(\d+)>/);
                            if (mentionMatch) { moderatorMention = mentionMatch[1]; break; }
                        }

                        if (!moderatorMention) {
                            const mentions = description.match(/<@!?(\d+)>/g);
                            if (mentions && mentions.length > 0) {
                                const lastMention = mentions[mentions.length - 1];
                                const match = lastMention.match(/<@!?(\d+)>/);
                                if (match) moderatorMention = match[1];
                            }
                        }

                        if (!moderatorMention && embed.footer && embed.footer.text) {
                            const mentionMatch = embed.footer.text.match(/(\d+)/);
                            if (mentionMatch) moderatorMention = mentionMatch[1];
                        }

                        if (actionType && moderatorMention) {
                            let points = 0;
                            switch (actionType) {
                                case 'warn': case 'timeout': points = 1; break;
                                case 'kick': points = 2; break;
                                case 'ban': points = 3; break;
                            }

                            if (points > 0) {
                                const pointsFile = path.join(__dirname, 'points.json');
                                let pointsData = {};
                                if (fs.existsSync(pointsFile)) pointsData = JSON.parse(fs.readFileSync(pointsFile, 'utf-8'));
                                const oldPoints = pointsData[moderatorMention] || 0;
                                pointsData[moderatorMention] = oldPoints + points;
                                fs.writeFileSync(pointsFile, JSON.stringify(pointsData, null, 2));
                                console.log(`⭐ إضافة ${points} نقطة للمشرف ID: ${moderatorMention}`);
                            }
                        }
                    }
                } catch (err) {
                    console.error('❌ Error processing ProBot message:', err);
                }
            }
            return;
        }

        if (!message.guild) return;

        const content = message.content.trim();
        const args = content.split(/ +/);
        const commandName = args[0].toLowerCase();

        // ========================
        // نظام AFK - يعمل على الرسائل العادية
        // ========================
        await afkSystem.handleMessage(message);

        // ========================
        // أمر afk (prefix)
        // ========================
        if (commandName === 'afk') {
            const reason = args.slice(1).join(' ') || 'AFK';
            const existingAfk = afkSystem.isAfk(message.author.id, message.guild.id);

            if (existingAfk) {
                afkSystem.removeAfk(message.author.id, message.guild.id);
                try {
                    const member = await message.guild.members.fetch(message.author.id);
                    if (member.nickname && member.nickname.startsWith('[AFK]')) {
                        const originalName = member.nickname.replace('[AFK] ', '');
                        await member.setNickname(originalName === member.user.username ? null : originalName);
                    }
                } catch (err) {}

                const embed = new EmbedBuilder()
                    .setDescription('✅ تم إلغاء وضع AFK')
                    .setColor('#00FF00')
                    .setTimestamp();

                const reply = await message.reply({ embeds: [embed] });
                setTimeout(() => reply.delete().catch(() => {}), 5000);
                return;
            }

            afkSystem.setAfk(message.author.id, message.guild.id, reason);

            try {
                const member = await message.guild.members.fetch(message.author.id);
                const currentName = member.nickname || member.user.username;
                if (!currentName.startsWith('[AFK]')) {
                    await member.setNickname(`[AFK] ${currentName}`);
                }
            } catch (err) {}

            const embed = new EmbedBuilder()
                .setTitle('😴 وضع AFK مفعّل')
                .setDescription(
                    `**${message.author.username}** الآن في وضع AFK\n\n` +
                    `📝 **السبب:** ${reason}\n\n` +
                    `سيتم إخبار الآخرين عند منشنتك`
                )
                .setColor('#FFA500')
                .setTimestamp();

            const reply = await message.reply({ embeds: [embed] });
            setTimeout(() => reply.delete().catch(() => {}), 5000);
            return;
        }

        // ========================
        // أمر dm / msg
        // ========================
        if (commandName === 'dm' || commandName === 'msg') {
            const isAdmin = message.member.permissions.has('Administrator');
            const isOwner = message.author.id === message.guild.ownerId;
            if (!isAdmin && !isOwner) return message.reply('❌ هذا الأمر متاح فقط للمدراء أو مالك السيرفر');

            const user = message.mentions.users.first();
            const messageContent = args.slice(2).join(' ');

            if (!user) return message.reply('❌ يجب أن تذكر شخصاً\n💡 مثال: `dm @user الرسالة هنا`');
            if (!messageContent) return message.reply('❌ يجب أن تكتب رسالة\n💡 مثال: `dm @user مرحباً بك في السيرفر`');

            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle(`📩 رسالة من ${message.guild.name}`)
                    .setDescription(messageContent)
                    .setColor('#5865F2')
                    .setThumbnail(message.guild.iconURL({ size: 256 }))
                    .setFooter({ text: `تم الإرسال بواسطة: ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                    .setTimestamp();

                await user.send({ embeds: [dmEmbed] });

                const confirmEmbed = new EmbedBuilder()
                    .setTitle('✅ تم إرسال الرسالة')
                    .setDescription(`تم إرسال الرسالة إلى ${user.tag}`)
                    .setColor('#00FF00')
                    .addFields(
                        { name: '👤 المستلم', value: `${user.tag}`, inline: true },
                        { name: '📝 الرسالة', value: messageContent.substring(0, 1024), inline: false }
                    )
                    .setTimestamp();

                message.reply({ embeds: [confirmEmbed] });
            } catch (error) {
                console.error(error);
                if (error.code === 50007) {
                    message.reply('❌ لا يمكن إرسال رسائل لهذا المستخدم (ربما أغلق الرسائل الخاصة أو حظر البوت)');
                } else {
                    message.reply('❌ حدث خطأ في إرسال الرسالة');
                }
            }
            return;
        }

        // ========================
        // أمر timeout / tm
        // ========================
        if (commandName === 'timeout' || commandName === 'tm') {
            const isAdmin = message.member.permissions.has('Administrator');
            const isOwner = message.author.id === message.guild.ownerId;
            if (!isAdmin && !isOwner) return message.reply('❌ هذا الأمر متاح فقط للمدراء أو مالك السيرفر');

            const user = message.mentions.users.first();
            const duration = parseInt(args[2]);
            const reason = args.slice(3).join(' ') || 'لا يوجد سبب';

            if (!user) return message.reply('❌ يجب أن تذكر شخصاً\n💡 مثال: `timeout @user 30 السبب`');
            if (!duration || isNaN(duration) || duration < 1) return message.reply('❌ يجب أن تحدد مدة صحيحة بالدقائق');

            try {
                const member = await message.guild.members.fetch(user.id);
                if (member.permissions.has('Administrator')) return message.reply('❌ لا يمكنك إسكات مسؤول');
                if (member.communicationDisabledUntil && member.communicationDisabledUntil > new Date()) return message.reply('⚠️ هذا الشخص مُسكّت بالفعل');

                const durationMs = duration * 60 * 1000;
                await member.timeout(durationMs, reason);

                const pointsFile = path.join(__dirname, 'points.json');
                let points = {};
                if (fs.existsSync(pointsFile)) points = JSON.parse(fs.readFileSync(pointsFile, 'utf-8'));
                points[message.author.id] = (points[message.author.id] || 0) + 1;
                fs.writeFileSync(pointsFile, JSON.stringify(points, null, 2));

                message.reply(`✅ تم إسكات ${user.tag} لمدة ${duration} دقيقة\n📝 السبب: ${reason}\n⭐ حصلت على 1 نقطة`);
            } catch (error) {
                console.error(error);
                message.reply('❌ حدث خطأ في إسكات المستخدم');
            }
            return;
        }

        // ========================
        // أمر warn / w
        // ========================
        if (commandName === 'warn' || commandName === 'w') {
            const isAdmin = message.member.permissions.has('Administrator');
            const isOwner = message.author.id === message.guild.ownerId;
            if (!isAdmin && !isOwner) return message.reply('❌ هذا الأمر متاح فقط للمدراء أو مالك السيرفر');

            const user = message.mentions.users.first();
            const reason = args.slice(2).join(' ') || 'لا يوجد سبب';

            if (!user) return message.reply('❌ يجب أن تذكر شخصاً\n💡 مثال: `warn @user السبب`');

            try {
                const warningsFile = path.join(__dirname, 'warnings.json');
                let warnings = {};
                if (fs.existsSync(warningsFile)) warnings = JSON.parse(fs.readFileSync(warningsFile, 'utf-8'));

                if (!warnings[user.id]) warnings[user.id] = [];
                warnings[user.id].push({
                    reason: reason,
                    date: new Date().toLocaleString('ar-SA'),
                    moderator: message.author.tag
                });
                fs.writeFileSync(warningsFile, JSON.stringify(warnings, null, 2));

                const pointsFile = path.join(__dirname, 'points.json');
                let points = {};
                if (fs.existsSync(pointsFile)) points = JSON.parse(fs.readFileSync(pointsFile, 'utf-8'));
                points[message.author.id] = (points[message.author.id] || 0) + 1;
                fs.writeFileSync(pointsFile, JSON.stringify(points, null, 2));

                const warnCount = warnings[user.id].length;
                message.reply(`⚠️ تم تحذير ${user.tag}\n📝 السبب: ${reason}\n📊 عدد التحذيرات: ${warnCount}\n⭐ حصلت على 1 نقطة`);

                try {
                    await user.send(`⚠️ لقد تم تحذيرك من قبل ${message.author.tag}\n📝 السبب: ${reason}\n📊 عدد التحذيرات: ${warnCount}`);
                } catch (error) {}
            } catch (error) {
                console.error(error);
                message.reply('❌ حدث خطأ في تحذير المستخدم');
            }
            return;
        }

        // ========================
        // أمر kick / k
        // ========================
        if (commandName === 'kick' || commandName === 'k') {
            const isAdmin = message.member.permissions.has('Administrator');
            const isOwner = message.author.id === message.guild.ownerId;
            if (!isAdmin && !isOwner) return message.reply('❌ هذا الأمر متاح فقط للمدراء أو مالك السيرفر');

            const user = message.mentions.users.first();
            const reason = args.slice(2).join(' ') || 'لا يوجد سبب';

            if (!user) return message.reply('❌ يجب أن تذكر شخصاً\n💡 مثال: `kick @user السبب`');

            try {
                const member = await message.guild.members.fetch(user.id);
                if (member.permissions.has('Administrator')) return message.reply('❌ لا يمكنك طرد مسؤول');

                await member.kick(reason);

                const pointsFile = path.join(__dirname, 'points.json');
                let points = {};
                if (fs.existsSync(pointsFile)) points = JSON.parse(fs.readFileSync(pointsFile, 'utf-8'));
                points[message.author.id] = (points[message.author.id] || 0) + 2;
                fs.writeFileSync(pointsFile, JSON.stringify(points, null, 2));

                message.reply(`✅ تم طرد ${user.tag}\n📝 السبب: ${reason}\n⭐ حصلت على 2 نقطة`);
            } catch (error) {
                console.error(error);
                message.reply('❌ حدث خطأ في طرد المستخدم');
            }
            return;
        }

        // ========================
        // أمر ban / b
        // ========================
        if (commandName === 'ban' || commandName === 'b') {
            const isAdmin = message.member.permissions.has('Administrator');
            const isOwner = message.author.id === message.guild.ownerId;
            if (!isAdmin && !isOwner) return message.reply('❌ هذا الأمر متاح فقط للمدراء أو مالك السيرفر');

            const user = message.mentions.users.first();
            const reason = args.slice(2).join(' ') || 'لا يوجد سبب';

            if (!user) return message.reply('❌ يجب أن تذكر شخصاً\n💡 مثال: `ban @user السبب`');
            if (user.id === message.guild.ownerId) return message.reply('❌ لا يمكنك حظر مالك السيرفر');

            try {
                const member = await message.guild.members.fetch(user.id);
                if (member.permissions.has('Administrator')) return message.reply('❌ لا يمكنك حظر مسؤول');

                await message.guild.members.ban(user, { reason: reason });

                const pointsFile = path.join(__dirname, 'points.json');
                let points = {};
                if (fs.existsSync(pointsFile)) points = JSON.parse(fs.readFileSync(pointsFile, 'utf-8'));
                points[message.author.id] = (points[message.author.id] || 0) + 3;
                fs.writeFileSync(pointsFile, JSON.stringify(points, null, 2));

                message.reply(`✅ تم حظر ${user.tag}\n📝 السبب: ${reason}\n⭐ حصلت على 3 نقاط`);
            } catch (error) {
                console.error(error);
                message.reply('❌ حدث خطأ في حظر المستخدم');
            }
            return;
        }

        // ========================
        // أمر serverinfo
        // ========================
        if (commandName === 'serverinfo' || commandName === 'si' || commandName === 'server') {
            try {
                const guild = message.guild;
                const owner = await guild.fetchOwner();
                const totalMembers = guild.memberCount;
                const botMembers = guild.members.cache.filter(m => m.user.bot).size;
                const humanMembers = totalMembers - botMembers;
                const roleCount = guild.roles.cache.size - 1;
                const textChannels = guild.channels.cache.filter(c => c.isTextBased()).size;
                const voiceChannels = guild.channels.cache.filter(c => c.isVoiceBased()).size;
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
                        { name: '🔊 القنوات الصوتية', value: `**${voiceChannels}**`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: `تم الطلب من قبل ${message.author.tag}` });

                message.reply({ embeds: [embed] });
            } catch (error) {
                console.error(error);
                message.reply('❌ حدث خطأ في جلب معلومات السيرفر');
            }
            return;
        }

        // ========================
        // أمر userinfo
        // ========================
        if (commandName === 'userinfo' || commandName === 'ui' || commandName === 'user') {
            try {
                const targetUser = message.mentions.users.first() || message.author;
                const member = await message.guild.members.fetch(targetUser.id);
                const joinedDate = member.joinedAt.toLocaleString('ar-SA');
                const createdDate = targetUser.createdAt.toLocaleString('ar-SA');

                const roles = member.roles.cache
                    .filter(role => role.id !== message.guild.id)
                    .sort((a, b) => b.position - a.position)
                    .map(role => role.toString())
                    .slice(0, 10);

                const rolesText = roles.length > 0 ? roles.join(', ') : 'لا توجد رتب';

                const status = member.presence?.status || 'offline';
                const statusEmoji = { 'online': '🟢', 'idle': '🟡', 'dnd': '🔴', 'offline': '⚫' };

                const embed = new EmbedBuilder()
                    .setTitle(`👤 معلومات ${targetUser.username}`)
                    .setColor('#6B5B95')
                    .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
                    .addFields(
                        { name: '👤 اسم المستخدم', value: `${targetUser.tag}`, inline: true },
                        { name: '🆔 معرّف المستخدم', value: `${targetUser.id}`, inline: true },
                        { name: `${statusEmoji[status]} الحالة`, value: `${status}`, inline: true },
                        { name: '📅 تاريخ إنشاء الحساب', value: createdDate, inline: true },
                        { name: '📅 تاريخ الانضمام', value: joinedDate, inline: true },
                        { name: '🤖 بوت؟', value: targetUser.bot ? 'نعم ✅' : 'لا ❌', inline: true },
                        { name: `🏆 الرتب (${roles.length})`, value: rolesText, inline: false }
                    )
                    .setTimestamp()
                    .setFooter({ text: `تم الطلب من قبل ${message.author.tag}` });

                message.reply({ embeds: [embed] });
            } catch (error) {
                console.error(error);
                message.reply('❌ حدث خطأ في جلب معلومات المستخدم');
            }
            return;
        }

        // ========================
        // أمر help
        // ========================
        if (commandName === 'help' || commandName === 'h') {
            try {
                const embed = new EmbedBuilder()
                    .setTitle('📚 قائمة الأوامر')
                    .setColor('#FF6B6B')
                    .setDescription('**جميع الأوامر تعمل بدون علامة ! أو /**')
                    .addFields(
                        {
                            name: '🛡️ أوامر الإدارة (Admin/Owner فقط)', value:
                                `\`dm @user الرسالة\` - إرسال رسالة خاصة 📩\n` +
                                `\`msg @user الرسالة\` - إرسال رسالة (مختصر) 📩\n` +
                                `\`timeout @user دقائق سبب\` - إسكات ⏱️\n` +
                                `\`tm @user دقائق سبب\` - إسكات (مختصر) ⏱️\n` +
                                `\`warn @user سبب\` - تحذير ⚠️\n` +
                                `\`w @user سبب\` - تحذير (مختصر) ⚠️\n` +
                                `\`kick @user سبب\` - طرد 👢\n` +
                                `\`k @user سبب\` - طرد (مختصر) 👢\n` +
                                `\`ban @user سبب\` - حظر 🚫\n` +
                                `\`b @user سبب\` - حظر (مختصر) 🚫`,
                            inline: false
                        },
                        {
                            name: '💎 أوامر المتجر والنقاط', value:
                                `\`shop\` - عرض الرتب المتاحة 🛒\n` +
                                `\`buy اسم-الرتبة\` - شراء رتبة 💳\n` +
                                `\`mypoints\` أو \`points\` - نقاطك ⭐\n` +
                                `\`leaderboard\` أو \`top\` - لائحة الأفضل 🏆`,
                            inline: false
                        },
                        {
                            name: '⭐ نظام التقييم الإداري', value:
                                `\`/rate-setup #قناة\` - تحديد قناة التقييمات (Admin/Owner) ⚙️\n` +
                                `\`/rate @user ✅/❌ ملاحظة\` - تقييم عضو (للجميع) 📝\n` +
                                `\`/myrates\` - عرض تقييماتك 📋\n` +
                                `\`/myrates @user\` - عرض تقييمات عضو آخر 📋`,
                            inline: false
                        },
                        {
                            name: '😴 نظام AFK', value:
                                `\`/afk\` - تفعيل وضع AFK 😴\n` +
                                `\`/afk سبب\` - تفعيل AFK مع سبب 😴\n` +
                                `\`/afk\` (مرة ثانية) - إلغاء AFK ✅\n` +
                                `\`afk\` - نفس الأوامر بدون / ✅\n\n` +
                                `**كيف يعمل؟**\n` +
                                `• عند تفعيله يتغير اسمك لـ \`[AFK] اسمك\`\n` +
                                `• عند منشنتك يتم إخبار المرسل أنك AFK\n` +
                                `• عند كتابة أي رسالة يُلغى AFK تلقائياً`,
                            inline: false
                        },
                        {
                            name: '🎫 نظام التكتات', value:
                                `• اضغط زر "🎫 إنشاء تكت جديد" في لوحة التكتات\n` +
                                `\`/ticket-setup\` - إعداد نظام التكتات\n` +
                                `\`/staff\` \`/middle\` \`/high\` \`/owner\` - طلب مساعدة`,
                            inline: false
                        },
                        {
                            name: '📝 نظام التقديم', value:
                                `• اضغط زر "📝 تقديم طلب" في لوحة التقديم\n` +
                                `\`/application-setup\` - إعداد نظام التقديم`,
                            inline: false
                        },
                        {
                            name: '🔐 تسجيل الدخول/الخروج', value:
                                `\`/login\` - فتح قائمة تسجيل الدخول/الخروج 🚪\n` +
                                `\`/setup-login\` - إنشاء لوحة ثابتة (Admin فقط) ⚙️`,
                            inline: false
                        },
                        {
                            name: '📊 أوامر المعلومات', value:
                                `\`serverinfo\` أو \`si\` - معلومات السيرفر 📊\n` +
                                `\`userinfo @user\` أو \`ui\` - معلومات المستخدم 👤\n` +
                                `\`help\` أو \`h\` - عرض هذه القائمة 📚`,
                            inline: false
                        },
                        {
                            name: '⭐ نظام النقاط', value:
                                `• Timeout/Warn = 1 نقطة ⏱️\n` +
                                `• Kick = 2 نقطة 👢\n` +
                                `• Ban = 3 نقاط 🚫\n` +
                                `• استلام طلب مساعدة = 3 نقاط 🆘\n` +
                                `• إغلاق تكت مستلم = 5 نقاط 🎫\n\n` +
                                `استخدم النقاط لشراء الرتب من المتجر!`,
                            inline: false
                        }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'اكتب الأوامر مباشرة أو استخدم / للأوامر الخاصة' });

                message.reply({ embeds: [embed] });
            } catch (error) {
                console.error(error);
                message.reply('❌ حدث خطأ في عرض قائمة الأوامر');
            }
            return;
        }

        // ========================
        // أمر shop
        // ========================
        if (commandName === 'shop') {
            try {
                const shopFile = path.join(__dirname, 'shop.json');
                const shop = fs.existsSync(shopFile) ? JSON.parse(fs.readFileSync(shopFile, 'utf-8')) : { roles: {} };

                const embed = new EmbedBuilder()
                    .setTitle('🛒 متجر الرتب')
                    .setColor('#00BFFF')
                    .setTimestamp();

                if (Object.keys(shop.roles).length === 0) {
                    embed.setDescription('لا توجد رتب للبيع حالياً');
                    return message.reply({ embeds: [embed] });
                }

                const lines = Object.entries(shop.roles).map(([roleId, price]) => {
                    const role = message.guild.roles.cache.get(roleId);
                    const name = role ? role.toString() : `Unknown Role (${roleId})`;
                    return `${name} — **${price}** نقطة`;
                });

                embed.setDescription(lines.join('\n'));
                embed.addFields({ name: '💡 كيفية الشراء؟', value: `استخدم: \`buy اسم-الرتبة\`\nمثال: \`buy Trail\`` });

                message.reply({ embeds: [embed] });
            } catch (error) {
                console.error(error);
                message.reply('❌ حدث خطأ في عرض المتجر');
            }
            return;
        }

        // ========================
        // أمر buy
        // ========================
        if (commandName === 'buy') {
            try {
                const shopFile = path.join(__dirname, 'shop.json');
                const pointsFile = path.join(__dirname, 'points.json');

                const shop = fs.existsSync(shopFile) ? JSON.parse(fs.readFileSync(shopFile, 'utf-8')) : { roles: {} };
                let points = fs.existsSync(pointsFile) ? JSON.parse(fs.readFileSync(pointsFile, 'utf-8')) : {};

                let roleId = null;
                let targetRole = null;

                if (message.mentions.roles.size > 0) {
                    targetRole = message.mentions.roles.first();
                    roleId = targetRole.id;
                } else if (args.length > 1) {
                    const roleName = args.slice(1).join(' ');
                    targetRole = message.guild.roles.cache.find(r => r.name.toLowerCase().includes(roleName.toLowerCase()));
                    if (targetRole) roleId = targetRole.id;
                }

                if (!roleId || !targetRole) return message.reply('❌ يجب أن تحدد رتبة صحيحة!\n💡 مثال: `buy Trail` أو `buy @Trail`');

                const price = shop.roles?.[roleId];
                if (!price) return message.reply('⚠️ هذه الرتبة غير موجودة في المتجر');
                if (message.member.roles.cache.has(roleId)) return message.reply('⚠️ لديك هذه الرتبة بالفعل ولا يمكنك شرائها');

                const userPoints = points[message.author.id] || 0;
                if (userPoints < price) return message.reply(`❌ ليس لديك ما يكفي من النقاط\n💰 السعر: ${price} نقطة\n⭐ لديك: ${userPoints} نقطة`);

                const rankHierarchy = {
                    '𝐓𝐫𝐚𝐢𝐥': { prerequisite: null, level: 1 },
                    '𝐒𝐮𝐩𝐩𝐨𝐫𝐭': { prerequisite: '𝐓𝐫𝐚𝐢𝐥', level: 2 },
                    '𝐌𝐨𝐝 𝐒𝐭𝐚𝐟𝐟': { prerequisite: '𝐒𝐮𝐩𝐩𝐨𝐫𝐭', level: 3 },
                    'Helper': { prerequisite: '𝐌𝐨𝐝 𝐒𝐭𝐚𝐟𝐟', level: 4 },
                    '𝐀𝐝𝐦𝐢𝐧': { prerequisite: 'Helper', level: 5 },
                    '𝐒𝐮𝐩𝐞𝐫 𝐀𝐝𝐦𝐢𝐧': { prerequisite: '𝐀𝐝𝐦𝐢𝐧', level: 6 },
                    '𝐒𝐞𝐧𝐢𝐨𝐫 𝐀𝐝𝐦𝐢𝐧': { prerequisite: '𝐒𝐮𝐩𝐞𝐫 𝐀𝐝𝐦𝐢𝐧', level: 7 },
                    '𝐌𝐢𝐝 𝐀𝐝𝐦𝐢𝐧': { prerequisite: '𝐒𝐞𝐧𝐢𝐨𝐫 𝐀𝐝𝐦𝐢𝐧', level: 8 },
                    '𝐇𝐞𝐚𝐝 𝐀𝐝𝐦𝐢𝐧': { prerequisite: '𝐌𝐢𝐝 𝐀𝐝𝐦𝐢𝐧', level: 9 },
                    '𝐔𝐥𝐭𝐢𝐦𝐚𝐭𝐞 𝐀𝐝𝐦𝐢𝐧': { prerequisite: '𝐇𝐞𝐚𝐝 𝐀𝐝𝐦𝐢𝐧', level: 10 },
                    '𝐕𝐢𝐬𝐨𝐫': { prerequisite: '𝐔𝐥𝐭𝐢𝐦𝐚𝐭𝐞 𝐀𝐝𝐦𝐢𝐧', level: 11 },
                    '𝐒𝐮𝐩𝐞𝐫 𝐕𝐢𝐬𝐨𝐫': { prerequisite: '𝐕𝐢𝐬𝐨𝐫', level: 12 },
                };

                const roleInfo = rankHierarchy[targetRole.name];
                if (roleInfo && roleInfo.prerequisite) {
                    const prereqRole = message.guild.roles.cache.find(r => r.name === roleInfo.prerequisite);
                    if (prereqRole && !message.member.roles.cache.has(prereqRole.id)) {
                        return message.reply(`❌ لا يمكنك شراء رتبة **${targetRole.name}** إلا إذا كان لديك رتبة **${roleInfo.prerequisite}** أولاً!`);
                    }
                }

                const botMember = message.guild.members.me;
                if (!botMember.permissions.has('ManageRoles')) return message.reply('❌ لا أملك صلاحية إدارة الرتب، رجاءً أعطني Manage Roles');

                try {
                    await message.member.roles.add(targetRole);
                } catch (err) {
                    console.error(err);
                    return message.reply('❌ حدث خطأ أثناء منح الرتبة. تأكد أن ترتيب الرتب مناسب وأن لدي صلاحيات كافية');
                }

                points[message.author.id] = userPoints - price;
                fs.writeFileSync(pointsFile, JSON.stringify(points, null, 2));

                message.reply(`✅ تم منحك الرتبة ${targetRole.name} مقابل ${price} نقطة\n⭐ نقاطك المتبقية: ${points[message.author.id]}`);
            } catch (error) {
                console.error(error);
                message.reply('❌ حدث خطأ في عملية الشراء');
            }
            return;
        }

        // ========================
        // أمر mypoints
        // ========================
        if (commandName === 'mypoints' || commandName === 'points') {
            try {
                const pointsFile = path.join(__dirname, 'points.json');
                const points = fs.existsSync(pointsFile) ? JSON.parse(fs.readFileSync(pointsFile, 'utf-8')) : {};
                const userPoints = points[message.author.id] || 0;

                const embed = new EmbedBuilder()
                    .setTitle('⭐ نقاطك')
                    .setColor('#FFD700')
                    .setThumbnail(message.author.displayAvatarURL({ size: 256 }))
                    .addFields(
                        { name: '👤 المستخدم', value: `${message.author.tag}`, inline: true },
                        { name: '⭐ النقاط', value: `**${userPoints}**`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'استخدم shop لعرض الرتب المتاحة' });

                message.reply({ embeds: [embed] });
            } catch (error) {
                console.error(error);
                message.reply('❌ حدث خطأ في جلب النقاط');
            }
            return;
        }

        // ========================
        // أمر leaderboard
        // ========================
        if (commandName === 'leaderboard' || commandName === 'top') {
            try {
                const pointsFile = path.join(__dirname, 'points.json');
                const points = fs.existsSync(pointsFile) ? JSON.parse(fs.readFileSync(pointsFile, 'utf-8')) : {};
                const sorted = Object.entries(points).sort((a, b) => b[1] - a[1]).slice(0, 10);

                if (sorted.length === 0) {
                    const embed = new EmbedBuilder()
                        .setTitle('🏆 لائحة أفضل 10 أعضاء')
                        .setColor('#FFD700')
                        .setDescription('لم يكن هناك نقاط حتى الآن')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }

                let description = '';
                for (let i = 0; i < sorted.length; i++) {
                    const userId = sorted[i][0];
                    const userPoints = sorted[i][1];
                    const user = await client.users.fetch(userId).catch(() => null);
                    const username = user ? user.tag : 'Unknown User';
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                    description += `${medal} **${username}** — ${userPoints} ⭐\n`;
                }

                const embed = new EmbedBuilder()
                    .setTitle('🏆 لائحة أفضل 10 أعضاء')
                    .setColor('#FFD700')
                    .setDescription(description)
                    .setTimestamp()
                    .setFooter({ text: `إجمالي المستخدمين: ${Object.keys(points).length}` });

                message.reply({ embeds: [embed] });
            } catch (error) {
                console.error(error);
                message.reply('❌ حدث خطأ في عرض الترتيب');
            }
            return;
        }

    } catch (error) {
        console.error('خطأ في معالجة الأمر:', error);
    }
});

// ========================
// Timeout من أي بوت
// ========================
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    try {
        const wasTimedOut = oldMember.communicationDisabledUntil;
        const isTimedOut = newMember.communicationDisabledUntil;

        if (!wasTimedOut && isTimedOut) {
            await new Promise(resolve => setTimeout(resolve, 1000));

            const auditLogs = await newMember.guild.fetchAuditLogs({ limit: 5, type: AuditLogEvent.MemberUpdate });
            const relevantLog = auditLogs.entries.find(log =>
                log.target.id === newMember.id &&
                log.changes.some(change => change.key === 'communication_disabled_until')
            );

            if (relevantLog) {
                const moderator = relevantLog.executor;
                if (moderator.bot) return;

                const pointsFile = path.join(__dirname, 'points.json');
                let points = {};
                if (fs.existsSync(pointsFile)) points = JSON.parse(fs.readFileSync(pointsFile, 'utf-8'));
                const oldPoints = points[moderator.id] || 0;
                points[moderator.id] = oldPoints + 1;
                fs.writeFileSync(pointsFile, JSON.stringify(points, null, 2));
                console.log(`⭐ إضافة نقطة لـ ${moderator.tag} (Timeout)`);
            }
        }
    } catch (error) {
        console.error('❌ خطأ في معالجة Timeout:', error);
    }
});

// ========================
// Ban من أي بوت
// ========================
client.on('guildBanAdd', async (ban) => {
    try {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const auditLogs = await ban.guild.fetchAuditLogs({ limit: 5, type: AuditLogEvent.MemberBanAdd });
        const relevantLog = auditLogs.entries.find(log => log.target.id === ban.user.id);

        if (relevantLog) {
            const moderator = relevantLog.executor;
            if (moderator.bot) return;

            const pointsFile = path.join(__dirname, 'points.json');
            let points = {};
            if (fs.existsSync(pointsFile)) points = JSON.parse(fs.readFileSync(pointsFile, 'utf-8'));
            const oldPoints = points[moderator.id] || 0;
            points[moderator.id] = oldPoints + 3;
            fs.writeFileSync(pointsFile, JSON.stringify(points, null, 2));
            console.log(`⭐ إضافة 3 نقاط لـ ${moderator.tag} (Ban)`);
        }
    } catch (error) {
        console.error('❌ خطأ في معالجة Ban:', error);
    }
});

// ========================
// Kick من أي بوت
// ========================
client.on('guildMemberRemove', async (member) => {
    try {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const auditLogs = await member.guild.fetchAuditLogs({ limit: 5, type: AuditLogEvent.MemberKick });
        const relevantLog = auditLogs.entries.find(log => {
            const timeDiff = Date.now() - log.createdTimestamp;
            return log.target.id === member.id && timeDiff < 5000;
        });

        if (relevantLog) {
            const moderator = relevantLog.executor;
            if (moderator.bot) return;

            const pointsFile = path.join(__dirname, 'points.json');
            let points = {};
            if (fs.existsSync(pointsFile)) points = JSON.parse(fs.readFileSync(pointsFile, 'utf-8'));
            const oldPoints = points[moderator.id] || 0;
            points[moderator.id] = oldPoints + 2;
            fs.writeFileSync(pointsFile, JSON.stringify(points, null, 2));
            console.log(`⭐ إضافة 2 نقطة لـ ${moderator.tag} (Kick)`);
        }
    } catch (error) {
        console.error('❌ خطأ في معالجة Kick:', error);
    }
});

client.login(process.env.TOKEN || 'MTQ3MjI2NzMyMTU2MDAwNjczOA.Gh0GLK.LNqbJLDjUTQIimayByUSE1ESqwT0zQPCEiet38');