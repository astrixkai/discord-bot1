const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('فك التايم أوت من شخص')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('المستخدم المراد فك التايم منه')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('السبب')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(interaction) {
        // التحقق من أن المستخدم Admin أو Owner
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        const isOwner = interaction.user.id === interaction.guild.ownerId;
        
        if (!isAdmin && !isOwner) {
            return await interaction.reply({ 
                content: '❌ هذا الأمر متاح فقط للمدراء أو مالك السيرفر', 
                ephemeral: true 
            });
        }
        
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'لا يوجد سبب';
        
        try {
            const member = await interaction.guild.members.fetch(user.id);
            
            // التحقق من وجود timeout
            if (!member.communicationDisabledUntil) {
                return await interaction.reply({ 
                    content: '⚠️ هذا الشخص لا يملك timeout', 
                    ephemeral: true 
                });
            }
            
            // فك التايم
            await member.timeout(null, reason);
            
            await interaction.reply({
                content: `✅ تم فك التايم من ${user.tag}\n📝 السبب: ${reason}`,
                ephemeral: true
            });
            
            // إرسال رسالة خاصة
            try {
                await user.send(`✅ تم فك التايم أوت من قبل ${interaction.user.tag}\n📝 السبب: ${reason}`);
            } catch (error) {
                console.log('لم أتمكن من إرسال رسالة خاصة');
            }
        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: '❌ حدث خطأ في فك التايم', 
                ephemeral: true 
            });
        }
    },
};
