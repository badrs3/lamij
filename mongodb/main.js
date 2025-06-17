import { model, Schema} from'mongoose'

const data = new Schema({
    Roleid: String,
    serverId: String
})
const modale = model('autorole', data)
export default modale