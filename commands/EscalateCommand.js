const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const escalateFile = path.join(process.cwd(), 'escalate.json');

function getEscalateData() {
    if (fs.existsSync(escalateFile)) {
        return JSON.parse(fs.readFileSync(escalateFile, 'utf-8'));
    }
    return {};
}

function saveEscalateData(data) {
    fs.writeFileSync(escalateFile, JSON.stringify(data, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('escalate-setup')
        .setDescription('⚙️ إعداد نظام طلب المساعدة في التكتات')
        .addSubcommand(sub =>
            sub.setName('staff')
               .setDescription('تحديد رتبة الستاف (المستوى الأول)')
               .addRoleOption(option =>
                    option.setName('role')
                          .setDescription('اختر رتبة الستاف')
                          .setRequired(true)
               )
        )
        .addSubcommand(sub =>
            sub.setName('middle')
               .setDescription('تحديد رتبة الوسطى (المستوى الثاني)')
               .addRoleOption(option =>
                    option.setName('role')
                          .setDescription('اختر رتبة الوسطى')
                          .setRequired(true)
               )
        )
        .addSubcommand(sub =>
            sub.setName('high')
               .setDescription('تحديد رتبة العليا (المستوى الثالث)')
               .addRoleOption(option =>
                    option.setName('role')
                          .setDescription('اختر رتبة العليا')
                          .setRequired(true)
               )
        )
        .addSubcommand(sub =>
            sub.setName('owner')
               .setDescription('تحديد رتبة صاحب البوت (المستوى الرابع)')
               .addRoleOption(option =>
                    option.setName('role')
                          .setDescription('اختر رتبة صاحب البوت')
                          .setRequired(true)
               )
        )
        .addSubcommand(sub =>
            sub.setName('info')
               .setDescription('عرض إعدادات نظام طلب المساعدة')
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
            const escalateData = getEscalateData();

            if (!escalateData[interaction.guild.id]) {
                escalateData[interaction.guild.id] = {};
            }

            const config = escalateData[interaction.guild.id];

            if (subcommand === 'staff') {
                const role = interaction.options.getRole('role');
                config.staffRole = role.id;
                saveEscalateData(escalateData);

                return interaction.reply({
                    content: `✅ تم تحديد رتبة **الستاف**: ${role}\n\nالأمر: \`/staff\``,
                    ephemeral: true
                });
            }

            if (subcommand === 'middle') {
                const role = interaction.options.getRole('role');
                config.middleRole = role.id;
                saveEscalateData(escalateData);

                return interaction.reply({
                    content: `✅ تم تحديد رتبة **الوسطى**: ${role}\n\nالأمر: \`/middle\``,
                    ephemeral: true
                });
            }

            if (subcommand === 'high') {
                const role = interaction.options.getRole('role');
                config.highRole = role.id;
                saveEscalateData(escalateData);

                return interaction.reply({
                    content: `✅ تم تحديد رتبة **العليا**: ${role}\n\nالأمر: \`/high\``,
                    ephemeral: true
                });
            }

            if (subcommand === 'owner') {
                const role = interaction.options.getRole('role');
                config.ownerRole = role.id;
                saveEscalateData(escalateData);

                return interaction.reply({
                    content: `✅ تم تحديد رتبة **صاحب البوت**: ${role}\n\nالأمر: \`/owner\``,
                    ephemeral: true
                });
            }

            if (subcommand === 'info') {
                const { EmbedBuilder } = require('discord.js');

                const staffRole = config.staffRole ? `<@&${config.staffRole}>` : '❌ غير محدد';
                const middleRole = config.middleRole ? `<@&${config.middleRole}>` : '❌ غير محدد';
                const highRole = config.highRole ? `<@&${config.highRole}>` : '❌ غير محدد';
                const ownerRole = config.ownerRole ? `<@&${config.ownerRole}>` : '❌ غير محدد';

                const embed = new EmbedBuilder()
                    .setTitle('⚙️ إعدادات نظام طلب المساعدة')
                    .setColor('#5865F2')
                    .addFields(
                        { name: '👮 رتبة الستاف', value: `${staffRole}\nالأمر: \`/staff\``, inline: true },
                        { name: '👔 رتبة الوسطى', value: `${middleRole}\nالأمر: \`/middle\``, inline: true },
                        { name: '👑 رتبة العليا', value: `${highRole}\nالأمر: \`/high\``, inline: true },
                        { name: '⭐ رتبة صاحب البوت', value: `${ownerRole}\nالأمر: \`/owner\``, inline: false }
                    )
                    .setFooter({ text: 'استخدم هذه الأوامر داخل التكتات لطلب المساعدة' })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

        } catch (error) {
            console.error('خطأ في إعداد نظام طلب المساعدة:', error);
            return interaction.reply({
                content: '❌ حدث خطأ أثناء تنفيذ الأمر',
                ephemeral: true
            });
        }
    }
};