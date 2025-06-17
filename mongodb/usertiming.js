import mongo from'mongoose';

const base = new mongo.Schema({
    timeTotal: Number,
    serverId: String,
    userId: String,
    roleId: String,
})

const moa = mongo.model('Voiceactiviting', base)

export default moa