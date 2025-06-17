import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clear messages from the channel')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of messages to delete (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(int) {
        const amount = int.options.getInteger('amount');
        
        // Check if the bot has permission to manage messages
        if (!int.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return await int.reply({
                content: '❌ I don\'t have permission to manage messages in this server.',
                ephemeral: true
            });
        }

        try {
            // Defer the reply since bulk delete can take time
            await int.deferReply({ ephemeral: true });

            const channel = int.channel;
            
            // Fetch messages and delete them
            const messages = await channel.messages.fetch({ limit: amount });
            const deletedMessages = await channel.bulkDelete(messages, true);

            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Messages Cleared')
                .setDescription(`Successfully deleted ${deletedMessages.size} messages from ${channel}`)
                .setTimestamp()
                .setFooter({ 
                    text: `Requested by ${int.user.tag}`, 
                    iconURL: int.user.displayAvatarURL() 
                });

            await int.editReply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Error clearing messages:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Error')
                .setDescription('An error occurred while clearing messages. Messages older than 14 days cannot be bulk deleted.')
                .setTimestamp();

            await int.editReply({ embeds: [errorEmbed] });
        }
    }
};