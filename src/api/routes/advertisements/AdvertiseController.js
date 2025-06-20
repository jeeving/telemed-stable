const {
    models: { Advertisement },
} = require('../../../../lib/models');

class AdvertiseController {

    /**
     * 
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async advertisement(req, res) {
        try{
            const { user } = req;
            const countryId = user.countryId;
            const specality = user.specality;
            console.log({countryId,specality})

            let qry = {
                "$and": [
                    {isDeleted: false},
                    {isSuspended: false},
                ]
            }
                
            
            console.log( "1",qry )
            if( specality ){
                qry["$and"].push(
                    { "specialityIds": specality },
                )
            }
            if( countryId ){
                qry["$and"].push(
                    { "countryId": countryId },
                )
            }

            let advertise = await Advertisement.find(qry).sort({_id : -1}).lean();
    
            advertise = advertise.map( x=> {
                if( !x.description ){
                    x.description = ""
                }
                return x;
            })
    
            if (!advertise) {
                return res.warn({}, req.__('ADVERTISEMENT_NOT_EXISTS'));
            }
    
            return res.success(advertise, req.__('ADVERTISEMENT_LIST'));
        }catch(err){
            console.log(err)
        }
        
    }
}

module.exports = new AdvertiseController();
