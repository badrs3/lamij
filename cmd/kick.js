import { SlashCommandBuilder } from "discord.js";

export default {
    data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('kick any bitch')
    .addUserOption(s => s.setName('user').setDescription('user').setRequired(true)),

    async execute(int, bot){
    await int.deferReply({ephemeral:true})
     const user = int.options.getMember('user')
     if(!int.guildId) return;
     if(user.id === int.member.id) return;
     if(user.id === bot.user.id){
        return await int.editReply({content: "Fuck ur self"})
     }
     user.kick()
    }
}