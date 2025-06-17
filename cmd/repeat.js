import {ChannelType, PermissionsBitField, SlashCommandBuilder} from'discord.js'

export default {
    data: new SlashCommandBuilder()
    .setName('repeat')
    .setDescription('حسن')
    .addChannelOption(t => t.setName("channel").setDescription('Channel').addChannelTypes(ChannelType.GuildText).setRequired(false))
    ,

    async execute(int){
        await int.deferReply({ephemeral:true})
        if(!int.member.permissions.has(PermissionsBitField.Flags.ManageChannels)){
            return await int.editReply({content: "كل زق"})
        }
        const channel = int.options.getChannel("channel") || int.channel;
        const channelID = channel.id
        const mychannel = int.channel;
       await int.editReply({content: `لك 20 ثانيه علشان ترسل ال في ال ${channel}`})
        const filter = (msg) => msg.author.id === int.user.id;
        await mychannel.awaitMessages({filter, max: 1, time: 20_000,
        errors: ['time']}).then((collect) => {
            const content = collect.first()
            content.delete().then(() => {
            channel.send({content: `${content}`})
            })
        }).catch((err) => {
            int.editReply({content: "الوقت خلص"})
        })



    }   
}