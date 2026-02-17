const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const escalateFile = path.join(process.cwd(), 'escalate.json');
const ticketsFile = path.join(process.cwd(), 'ticket.json');

function getEscalateData() {
    if (fs.existsSync(escalateFile)) {
        return JSON.parse(fs.readFileSync(escalateFile, 'utf-8'));
    }
    return {};
}

function getTicketsData() {
    if (fs.existsSync(ticketsFile)) {
        return JSON.parse(fs.readFileSync(ticketsFile, 'utf-8'));
    }
    return { tickets: {}, config: {} };
}

function saveTicketsData(data) {
    fs.writeFileSync(ticketsFile, JSON.stringify(data, null, 2));
}

// دالة مشتركة لطلب المساعدة
async function requestHelp(interaction, level, levelName, emoji) {
    try {
        await interaction.deferReply({ ephemeral: true });

        const escalateData = getEscalateData();
        const config = escalateData[interaction.guild.id];

        if (!config || !config[`${level}Role`]) {
            return interaction.editReply({
                content: `❌ لم يتم تحديد رتبة **${levelName}** بعد.\n\nيرجى من الإدارة استخدام \`/escalate-setup ${level}\``
            });
        }

        // التحقق من أن القناة تكت
        const ticketsData = getTicketsData();
        const ticketId = `${interaction.guild.id}-${interaction.channel.id}`;
        const ticket = ticketsData.tickets[ticketId];

        if (!ticket) {
            return interaction.editReply({
                content: '❌ هذا الأمر يعمل فقط داخل التكتات!'
            });
        }

        // التحقق من أن المستخدم هو المستلم
        if (!ticket.claimed || ticket.claimedBy !== interaction.user.id) {
            return interaction.editReply({
                content: '❌ يجب أن تكون مستلم التكت لطلب المساعدة!'
            });
        }

        // التحقق من وجود طلب سابق
        if (ticket.escalated) {
            return interaction.editReply({
                content: '⚠️ تم طلب مساعدة في هذا التكت بالفعل!'
            });
        }

        // حفظ حالة الطلب
        ticket.escalated = true;
        ticket.escalatedTo = level;
        ticket.escalatedBy = interaction.user.id;
        saveTicketsData(ticketsData);

        const roleId = config[`${level}Role`];

        const embed = new EmbedBuilder()
            .setTitle(`${emoji} طلب مساعدة - ${levelName}`)
            .setDescription(
                `تم طلب مساعدة من <@&${roleId}>\n\n` +
                `**طالب المساعدة:** ${interaction.user}\n` +
                `**التكت:** ${interaction.channel}\n` +
                `**الوقت:** <t:${Math.floor(Date.now() / 1000)}:R>\n\n` +
                `اضغط على زر "✅ استلام الطلب" للرد على التكت`
            )
            .setColor('#FFA500')
            .setTimestamp();

        const button = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`escalate_claim_${level}`)
                .setLabel('✅ استلام الطلب')
                .setStyle(ButtonStyle.Success)
        );

        await interaction.channel.send({
            content: `<@&${roleId}>`,
            embeds: [embed],
            components: [button]
        });

        return interaction.editReply({
            content: `✅ تم طلب مساعدة من **${levelName}**!`
        });

    } catch (error) {
        console.error('خطأ في طلب المساعدة:', error);
        return interaction.editReply({
            content: '❌ حدث خطأ أثناء طلب المساعدة'
        });
    }
}

// أمر staff
const staffCommand = {
    data: new SlashCommandBuilder()
        .setName('staff')
        .setDescription('👮 طلب مساعدة من رتبة الستاف'),

    async execute(interaction) {
        await requestHelp(interaction, 'staff', 'الستاف', '👮');
    }
};

// أمر middle
const middleCommand = {
    data: new SlashCommandBuilder()
        .setName('middle')
        .setDescription('👔 طلب مساعدة من رتبة الوسطى'),

    async execute(interaction) {
        await requestHelp(interaction, 'middle', 'الوسطى', '👔');
    }
};

// أمر high
const highCommand = {
    data: new SlashCommandBuilder()
        .setName('high')
        .setDescription('👑 طلب مساعدة من رتبة العليا'),

    async execute(interaction) {
        await requestHelp(interaction, 'high', 'العليا', '👑');
    }
};

// أمر owner
const ownerCommand = {
    data: new SlashCommandBuilder()
        .setName('owner')
        .setDescription('⭐ طلب مساعدة من صاحب البوت'),

    async execute(interaction) {
        await requestHelp(interaction, 'owner', 'صاحب البوت', '⭐');
    }
};

module.exports = {
    staffCommand,
    middleCommand,
    highCommand,
    ownerCommand
};