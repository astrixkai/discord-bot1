const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const loginDataFile = path.join(__dirname, 'login_data.json');

function getLoginData() {
    if (fs.existsSync(loginDataFile)) {
        return JSON.parse(fs.readFileSync(loginDataFile, 'utf-8'));
    }
    return {};
}

function saveLoginData(data) {
    fs.writeFileSync(loginDataFile, JSON.stringify(data, null, 2));
}

module.exports = {
    async handleButton(interaction) {
        if (!interaction.customId.endsWith('_btn')) return;
        if (interaction.customId !== 'login_btn' && interaction.customId !== 'logout_btn') return;
        
        try {
            // استخدام reply بدلاً من update لجعل الرد خاص
            await interaction.deferReply({ ephemeral: true });
            
            const loginData = getLoginData();
            const userId = interaction.user.id;
            const member = await interaction.guild.members.fetch(userId);
            const botMember = interaction.guild.members.me;
            
            // ============================
            // زر تسجيل الخروج
            // ============================
            if (interaction.customId === 'logout_btn') {
                console.log('\n🔄 بدء عملية تسجيل الخروج للمستخدم:', interaction.user.tag);
                
                // التحقق من صلاحيات البوت
                if (!botMember.permissions.has('ManageRoles')) {
                    console.log('❌ البوت لا يملك صلاحية Manage Roles');
                    const errorEmbed = new EmbedBuilder()
                        .setTitle('❌ خطأ في الصلاحيات')
                        .setColor('#FF0000')
                        .setDescription('البوت لا يملك صلاحية **Manage Roles**\n\nالحل: Server Settings → Roles → [رتبة البوت] → Manage Roles ✓')
                        .setTimestamp();
                    
                    return await interaction.editReply({ embeds: [errorEmbed] });
                }
                
                // جلب رتب المستخدم القابلة للإدارة
                const userRoles = member.roles.cache
                    .filter(role => role.id !== interaction.guild.id) // استبعاد @everyone
                    .filter(role => role.position < botMember.roles.highest.position); // فقط الرتب تحت رتبة البوت
                
                console.log(`📋 عدد الرتب القابلة للإزالة: ${userRoles.size}`);
                
                if (userRoles.size === 0) {
                    const errorEmbed = new EmbedBuilder()
                        .setTitle('⚠️ تنبيه')
                        .setColor('#FFA500')
                        .setDescription('ليس لديك رتب يمكن إزالتها!\n\n**الحل:** ارفع رتبة البوت إلى الأعلى')
                        .setTimestamp();
                    
                    return await interaction.editReply({ embeds: [errorEmbed] });
                }
                
                // حفظ IDs الرتب
                const roleIds = Array.from(userRoles.values()).map(r => r.id);
                
                loginData[userId] = {
                    isLoggedOut: true,
                    savedRoles: roleIds,
                    logoutDate: new Date().toISOString()
                };
                saveLoginData(loginData);
                
                // إزالة الرتب واحدة واحدة
                let removedCount = 0;
                for (const role of userRoles.values()) {
                    try {
                        await member.roles.remove(role);
                        removedCount++;
                        console.log(`✅ تم إزالة: ${role.name}`);
                        await new Promise(resolve => setTimeout(resolve, 150));
                    } catch (err) {
                        console.error(`❌ فشل: ${role.name}`);
                    }
                }
                
                // إضافة رتبة Logged Out
                const loggedOutRole = interaction.guild.roles.cache.find(r => 
                    r.name.includes('Logged Out') || r.name.includes('logout')
                );
                
                if (loggedOutRole && loggedOutRole.position < botMember.roles.highest.position) {
                    try {
                        await member.roles.add(loggedOutRole);
                        console.log('✅ تم إضافة رتبة Logged Out');
                    } catch (err) {
                        console.error('خطأ في إضافة رتبة Logged Out');
                    }
                }
                
                console.log(`📊 تم إزالة ${removedCount}/${userRoles.size} رتبة\n`);
                
                // إنشاء الرد
                const rolesText = roleIds.map(id => {
                    const role = interaction.guild.roles.cache.get(id);
                    return role ? `✅ ${role.name}` : '❓ رتبة';
                }).join('\n').substring(0, 1020);
                
                const embed = new EmbedBuilder()
                    .setTitle('🔐 تسجيل خروج ناجح')
                    .setColor('#00FF00')
                    .setDescription('تم حفظ جميع رتبك وإزالتها مؤقتاً.\nاضغط على **"✅ تسجيل دخول"** لاسترجاعها.')
                    .addFields(
                        { name: '👤 المستخدم', value: interaction.user.tag, inline: true },
                        { name: '✅ تم إزالة', value: `${removedCount} رتبة`, inline: true },
                        { name: '🏆 الرتب المحفوظة', value: rolesText || 'لا توجد', inline: false }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'هذه الرسالة خاصة بك فقط' });
                
                await interaction.editReply({ embeds: [embed] });
            }
            
            // ============================
            // زر تسجيل الدخول
            // ============================
            else if (interaction.customId === 'login_btn') {
                console.log('\n🔄 بدء عملية تسجيل الدخول للمستخدم:', interaction.user.tag);
                
                const userData = loginData[userId];
                
                // إزالة رتبة Logged Out أولاً
                const loggedOutRole = interaction.guild.roles.cache.find(r => 
                    r.name.includes('Logged Out') || r.name.includes('logout')
                );
                
                if (loggedOutRole && member.roles.cache.has(loggedOutRole.id)) {
                    try {
                        await member.roles.remove(loggedOutRole);
                        console.log('✅ تم إزالة رتبة Logged Out');
                    } catch (err) {
                        console.error('خطأ في إزالة رتبة Logged Out');
                    }
                }
                
                // إذا ما في بيانات محفوظة، نكتفي بإزالة رتبة Logged Out
                if (!userData || !userData.savedRoles || userData.savedRoles.length === 0) {
                    console.log('⚠️ لا توجد رتب محفوظة، تم إزالة رتبة Logged Out فقط');
                    
                    const embed = new EmbedBuilder()
                        .setTitle('✅ تم تسجيل الدخول')
                        .setColor('#00FF00')
                        .setDescription('تم إزالة رتبة Logged Out\n\n**ملاحظة:** لم تكن هناك رتب محفوظة لاسترجاعها.')
                        .setTimestamp()
                        .setFooter({ text: 'هذه الرسالة خاصة بك فقط' });
                    
                    return await interaction.editReply({ embeds: [embed] });
                }
                
                console.log(`📋 رتب محفوظة: ${userData.savedRoles.length}`);
                
                // استرجاع الرتب
                let restoredCount = 0;
                const validRoles = [];
                
                for (const roleId of userData.savedRoles) {
                    const role = interaction.guild.roles.cache.get(roleId);
                    if (role && role.position < botMember.roles.highest.position) {
                        validRoles.push(role);
                    }
                }
                
                for (const role of validRoles) {
                    try {
                        if (!member.roles.cache.has(role.id)) {
                            await member.roles.add(role);
                            restoredCount++;
                            console.log(`✅ تم استرجاع: ${role.name}`);
                            await new Promise(resolve => setTimeout(resolve, 150));
                        } else {
                            restoredCount++;
                        }
                    } catch (err) {
                        console.error(`❌ فشل: ${role.name}`);
                    }
                }
                
                // حذف البيانات المحفوظة
                delete loginData[userId];
                saveLoginData(loginData);
                
                console.log(`📊 تم استرجاع ${restoredCount}/${validRoles.length} رتبة\n`);
                
                // إنشاء الرد
                const rolesText = validRoles.map(role => {
                    const hasRole = member.roles.cache.has(role.id);
                    return `${hasRole ? '✅' : '❌'} ${role.name}`;
                }).join('\n').substring(0, 1020);
                
                const embed = new EmbedBuilder()
                    .setTitle('🔐 تسجيل دخول ناجح')
                    .setColor('#00FF00')
                    .setDescription('تم استرجاع جميع رتبك بنجاح.\nمرحباً بك مجدداً!')
                    .addFields(
                        { name: '👤 المستخدم', value: interaction.user.tag, inline: true },
                        { name: '✅ تم استرجاع', value: `${restoredCount} رتبة`, inline: true },
                        { name: '🏆 الرتب', value: rolesText || 'لا توجد', inline: false }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'هذه الرسالة خاصة بك فقط' });
                
                await interaction.editReply({ embeds: [embed] });
            }
            
        } catch (error) {
            console.error('❌ خطأ في معالجة الزر:', error);
            try {
                await interaction.editReply({ 
                    content: '❌ حدث خطأ: ' + error.message
                });
            } catch (e) {
                console.error('خطأ في الرد:', e);
            }
        }
    }
};