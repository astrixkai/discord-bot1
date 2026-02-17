require('dotenv').config();

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];

// 📂 مسار مجلد الأوامر
const commandsPath = path.join(__dirname, 'commands');

// 📄 قراءة جميع ملفات js داخل مجلد commands
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {

    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    // نتأكد أن الملف يحتوي على data و execute
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
    } else {
        console.log(`⚠️ الملف ${file} لا يحتوي على data أو execute`);
    }
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {

        console.log(`⏳ جاري تسجيل ${commands.length} أمر...`);

        // تسجيل أوامر عالمية
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log('✅ تم تسجيل الأوامر بنجاح!');

    } catch (error) {
        console.error('❌ خطأ أثناء تسجيل الأوامر:', error);
    }
})();
