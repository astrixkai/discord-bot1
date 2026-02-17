const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const shopFile = path.join(__dirname, '../shop.json');
const pointsFile = path.join(__dirname, '../points.json');

// تحديد متطلبات الرتب - إذا كنت تريد شراء رتبة، يجب أن تملك الرتبة المطلوبة أولاً
const rankHierarchy = {
    // Staff Track
    '𝐓𝐫𝐚𝐢𝐥': { prerequisite: null, level: 1 },
    '𝐒𝐮𝐩𝐩𝐨𝐫𝐭': { prerequisite: '𝐓𝐫𝐚𝐢𝐥', level: 2 },
    '𝐌𝐨𝐝 𝐒𝐭𝐚𝐟𝐟': { prerequisite: '𝐒𝐮𝐩𝐩𝐨𝐫𝐭', level: 3 },
    'Helper': { prerequisite: '𝐌𝐨𝐝 𝐒𝐭𝐚𝐟𝐟', level: 4 },
    
    // Admin Track
    '𝐀𝐝𝐦𝐢𝐧': { prerequisite: 'Helper', level: 5 },
    '𝐒𝐮𝐩𝐞𝐫 𝐀𝐝𝐦𝐢𝐧': { prerequisite: '𝐀𝐝𝐦𝐢𝐧', level: 6 },
    '𝐒𝐞𝐧𝐢𝐨𝐫 𝐀𝐝𝐦𝐢𝐧': { prerequisite: '𝐒𝐮𝐩𝐞𝐫 𝐀𝐝𝐦𝐢𝐧', level: 7 },
    '𝐌𝐢𝐝 𝐀𝐝𝐦𝐢𝐧': { prerequisite: '𝐒𝐞𝐧𝐢𝐨𝐫 𝐀𝐝𝐦𝐢𝐧', level: 8 },
    '𝐇𝐞𝐚𝐝 𝐀𝐝𝐦𝐢𝐧': { prerequisite: '𝐌𝐢𝐝 𝐀𝐝𝐦𝐢𝐧', level: 9 },
    '𝐔𝐥𝐭𝐢𝐦𝐚𝐭𝐞 𝐀𝐝𝐦𝐢𝐧': { prerequisite: '𝐇𝐞𝐚𝐝 𝐀𝐝𝐦𝐢𝐧', level: 10 },
    
    // Visor Track
    '𝐕𝐢𝐬𝐨𝐫': { prerequisite: '𝐔𝐥𝐭𝐢𝐦𝐚𝐭𝐞 𝐀𝐝𝐦𝐢𝐧', level: 11 },
    '𝐒𝐮𝐩𝐞𝐫 𝐕𝐢𝐬𝐨𝐫': { prerequisite: '𝐕𝐢𝐬𝐨𝐫', level: 12 },
};

function getShop() {
    if (fs.existsSync(shopFile)) return JSON.parse(fs.readFileSync(shopFile, 'utf-8'));
    return { channelId: null, roles: {} };
}

function getPoints() {
    if (fs.existsSync(pointsFile)) return JSON.parse(fs.readFileSync(pointsFile, 'utf-8'));
    return {};
}

function savePoints(points) {
    fs.writeFileSync(pointsFile, JSON.stringify(points, null, 2));
}

// التحقق من أن المستخدم يملك الرتبة المطلوبة قبل الشراء
function checkRankPrerequisite(member, roleId, guild, shop) {
    const role = guild.roles.cache.get(roleId);
    if (!role) return { valid: true, message: '' };

    const roleName = role.name;
    const rankInfo = rankHierarchy[roleName];
    
    if (!rankInfo || !rankInfo.prerequisite) {
        return { valid: true, message: '' };
    }

    // البحث عن الرتبة المطلوبة
    const prerequisiteRole = guild.roles.cache.find(r => r.name === rankInfo.prerequisite);
    
    if (!prerequisiteRole) {
        return { valid: true, message: '' };
    }

    // التحقق من امتلاك المستخدم للرتبة المطلوبة
    if (!member.roles.cache.has(prerequisiteRole.id)) {
        return { 
            valid: false, 
            message: `❌ لا يمكنك شراء رتبة **${roleName}** إلا إذا كان لديك رتبة **${rankInfo.prerequisite}** أولاً!` 
        };
    }

    return { valid: true, message: '' };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('شراء رتبة من المتجر باستخدام نقاطك')
        .addRoleOption(option => option.setName('role').setDescription('الرتبة التي تريد شرائها').setRequired(true)),

    async execute(interaction) {
        const shop = getShop();
        const role = interaction.options.getRole('role');
        if (!role) return interaction.reply({ content: '⚠️ الرجاء اختيار رتبة صحيحة', ephemeral: true });

        const price = shop.roles?.[role.id];
        if (!price) return interaction.reply({ content: '⚠️ هذه الرتبة غير موجودة في المتجر', ephemeral: true });

        // منع الشراء إذا كان المستخدم يمتلك الرتبة بالفعل
        if (interaction.member.roles.cache.has(role.id)) {
            return interaction.reply({ content: '⚠️ لديك هذه الرتبة بالفعل ولا يمكنك شرائها.', ephemeral: true });
        }

        // التحقق من متطلبات الرتبة
        const prerequisiteCheck = checkRankPrerequisite(interaction.member, role.id, interaction.guild, shop);
        if (!prerequisiteCheck.valid) {
            return interaction.reply({ content: prerequisiteCheck.message, ephemeral: true });
        }

        const points = getPoints();
        const userPoints = points[interaction.user.id] || 0;
        if (userPoints < price) return interaction.reply({ content: `❌ ليس لديك ما يكفي من النقاط. السعر: ${price} نقطة، لديك: ${userPoints}`, ephemeral: true });

        // تحقق من صلاحيات البوت لإعطاء الرتبة
        const botMember = interaction.guild.members.me;
        if (!botMember.permissions.has('ManageRoles')) return interaction.reply({ content: '❌ لا أملك صلاحية إدارة الرتب، رجاءً أعطني Manage Roles', ephemeral: true });

        // حاول إضافة الرتبة
        try {
            await interaction.member.roles.add(role);
        } catch (err) {
            return interaction.reply({ content: '❌ حدث خطأ أثناء منح الرتبة. تأكد أن ترتيب الرتب مناسب وأن لدي صلاحيات كافية.', ephemeral: true });
        }

        // خصم النقاط
        points[interaction.user.id] = userPoints - price;
        savePoints(points);

        await interaction.reply({ content: `✅ تم منحك الرتبة ${role.name} مقابل ${price} نقطة. نقاطك المتبقية: ${points[interaction.user.id]}`, ephemeral: true });
    }
};
