import {SlashCommandBuilder} from'discord.js'

export default {
    data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('ping'),

    async execute(int, bot){
        const ping = bot.ws.ping;
        await int.deferReply()
       await int.editReply({content: `${ping}`, ephemeral:true})
    }
}