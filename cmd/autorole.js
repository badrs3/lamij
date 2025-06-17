import {PermissionsBitField, SlashCommandBuilder} from'discord.js';
        import rolebase from'../mongodb/main.js'
export default {
    data: new SlashCommandBuilder()
    .setName('autorole')
    .setDescription('رتبه تلقائييه')
    .addRoleOption(s => s.setName('role').setDescription('الرول').setRequired(true)),

    async execute(int){
        await int.deferReply({ephemeral:true})
        if(!int.member.permissions.has(PermissionsBitField.Flags.ManageRoles)){
            return await int.editReply({content: "اخضع"})
        }
        const role = int.options.getRole('role')
        const roleid = role.id;
        const botpos = await int.guild.members.fetchMe()
        if(role.position >= botpos.roles.highest.position){
          return await int.editReply({content: "لازم رتبه البوت تكون فوق الرتبه الي تحددها"})
        }
          const savedata = await rolebase.findOne({serverId: int.guild.id})
          if(!savedata){
            await rolebase.create({serverId: int.guild.id, Roleid: roleid})
               return await int.editReply({content: "تم"})
            
          }
          if(!savedata.Roleid){
            await rolebase.findOneAndUpdate(
              {serverId: int.guild.id}, {Roleid: roleid}
            )
                           return await int.editReply({content: "تم"})
          }
          if(savedata.Roleid === roleid){
            return await int.editReply({content: "ماتحس انها موجوده اصلا؟ رح زرقها"})
          }
          if(savedata && savedata.Roleid !== roleid){
            await rolebase.findOneAndUpdate(
                {serverId: int.guild.id}, {Roleid: roleid}

            )
                return await int.editReply({content: "مبروك"})
          }
          
    }
}