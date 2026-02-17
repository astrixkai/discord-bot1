const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('اختبار سرعة البوت'),
    
    async execute(interaction) {
        await interaction.deferReply();
        
        const sent = await interaction.editReply({ content: 'حساب البينج...', fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        
        await interaction.editReply(`🏓 Pong!\n⏱️ البينج: ${latency}ms\n🌐 سرعة الاتصال: ${Math.round(interaction.client.ws.ping)}ms`);
    },
};