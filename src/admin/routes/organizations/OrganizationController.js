const {
    models: { OrganizationRequest,Organization,User }
} = require('../../../../lib/models');
const { sendMail } = require('../../../../lib/mailer');

const moment = require("moment");
//const { _digestEncoding } = require('@skavinvarnan/cryptlib');

class OrganizationController {
    async requests(req, res) {
        let allRequests = await OrganizationRequest.find({
            isDeleted: false
        })
        .sort({_id: -1})
        .lean()

        return res.render( 'organization/requests',{allRequests,moment} );
    }

    async requestDelete( req,res,next ){
        try{
            let {
                _id
            } = req.params
            console.log({_id});
            //await OrganizationRequest.deleteOne({_id: _id});

            await OrganizationRequest.updateOne({
                _id: _id
            },{
                $set: {
                    isDeleted: true,
                }
            });




            req.flash('success', "Request deleted successfully." );
            return res.redirect('/organizations/requests')

        }catch(err){
            return next(err)
        }
    }

    async add( req,res,next ){
        try{
            let {
                reqId
            } = req.params

            let currentDate = moment().add({"days":30}).format("YYYY-MM-DD")
            let orgRequest = {
                "name": "",
                "numAccount": 0,
                "email": "",
                "phone": ""
            }
            if( reqId ){
                orgRequest = await OrganizationRequest.findOne({_id: reqId}).lean()
            }else{
                reqId = ""
            }
            orgRequest['tenureDate'] = currentDate
            

            return res.render( 'organization/add',{orgRequest,moment,reqId} );

        }catch(err){
            console.log({err})
            return next(err)
        }
    }

    async addOrganization( req,res,next ){
        try{
            let {
                requestId,
                name,
                numAccount,
                email,
                countryCode,
                phone,
                password,
                tenureDate,
                amountReceived,
                remarks
            } = req.body;

            let tenureStamp = moment( tenureDate ).endOf('day').unix()
            email = email.toLowerCase()
            let organization = await Organization.create({
                name,
                numAccount,
                email,
                countryCode,
                phone,
                password,
                tenureDate,
                tenureStamp,
                lastAmountReceived: amountReceived,
                remarks
            })

            if( amountReceived ){
                await Organization.updateOne({
                    _id: organization._id
                },{
                    $push: {
                        "payment": {
                            "receivedTime": moment().utc().unix(),
                            "amount": amountReceived,
                            "endDate": tenureStamp,
                            "numAccount": numAccount
                        }
                    }
                })
            }

            if( requestId ){
                await OrganizationRequest.updateOne({
                    _id: requestId
                },{
                    $set: {
                        "isDeleted": true
                    }
                })
            }

            sendMail('organization-add', "Your organization is added on Telemedreferral", email, {
                name,
                numAccount,
                email,
                phone,
                password,
                tenureDate,
                tenureStamp,
                lastAmountReceived: amountReceived,
            })
                .catch(error => {
                    console.log(`Failed to send password reset link to ${email}`);
                    console.log(error);
                });

            req.flash('success', "Organization added successfully." );
            return res.redirect('/organizations/list')
            

        }catch(err){
            return next(err)
        }
    }

    async chkEmail(req, res, next) {
        let {
            _id,
            email
        } = req.body;
        let qry = {
            email,
            isDeleted: false
        }
        _id && (qry = { "_id": { $ne: _id }  , ...qry })

        let x = await Organization.findOne(qry).lean()

        if (x?._id) {
            return res.send("false")
        } else {
            return res.send("true")
        }
    }

    async list( req,res,next ){
        let organizations = await Organization.find({
            isDeleted: false
        })
        .sort({_id: -1})
        .lean()

        return res.render( 'organization/list',{organizations,moment} );
    }

    async delete( req,res,next ){
        try{
            let {
                _id
            } = req.params
            console.log({_id});
            //await OrganizationRequest.deleteOne({_id: _id});

            await Organization.updateOne({
                _id: _id
            },{
                $set: {
                    isDeleted: true,
                }
            });

            User.updateMany({
                organizationId: _id
            },{
                $set: {
                    isDeleted: true,
                }
            }).exec()
            

            req.flash('success', "Organization deleted successfully." );
            return res.redirect('/organizations/list')

        }catch(err){
            return next(err)
        }
    }

    async edit( req,res,next ){
        try{
            let {
                _id
            } = req.params

            let organization = await Organization.findOne({_id}).lean()
            

            return res.render( 'organization/edit',{organization,moment} );

        }catch(err){
            console.log({err})
            return next(err)
        }
    }

    async editOrganization( req,res,next ){
        try{
            let {
                _id
            } = req.params
            let {
                name,
                numAccount,
                email,
                countryCode,
                phone,
                password,
                remarks
                //tenureDate
            } = req.body;

            //let tenureStamp = moment( tenureDate ).endOf('day').unix()

            let organization = await Organization.findOne({_id}).select({ password: 0 });
            email = email.toLowerCase()
            
            organization.name = name;
            organization.numAccount = numAccount;
            organization.email = email;
            organization.countryCode = countryCode;
            organization.phone = phone;
            //organization.tenureDate = tenureDate;
            organization.remarks = remarks;


            if(password && password !="" ){
                organization['password'] = password  
            }

            await organization.save()
            
            req.flash('success', "Organization edited successfully." );
            return res.redirect('/organizations/edit/'+_id)
            

        }catch(err){
            console.log("err",err)
            return next(err)
        }
    }

    async status( req,res,next ){
        try{
            let {
                _id
            } = req.params
            let organization = await Organization.findOne({_id}).select("_id isSuspended").lean()

            await Organization.updateOne({
                _id: _id
            },{
                $set: {
                    isSuspended: !organization.isSuspended,
                }
            });


            req.flash('success', "Status updated successfully." );
            return res.redirect('/organizations/list')

        }catch(err){
            return next(err)
        }
    }

    async amountAdd(req, res, next) {
        try {
            let {
                newAmount,
                newEndDate,
                organizationId
            } = req.body

            let tenureDate = newEndDate
            let tenureStamp = moment(tenureDate).endOf('day').unix()

            let organization = await Organization.findOne({
                _id: organizationId
            }).lean()


            let x = await Organization.updateOne({
                _id: organizationId
            }, {
                $set: {
                    tenureStamp,
                    tenureDate,
                    "lastAmountReceived": newAmount
                },
                $push: {
                    "payment": {
                        "receivedTime": moment().utc().unix(),
                        "amount": newAmount,
                        "endDate": tenureStamp,
                        "numAccount": organization.numAccount
                    }
                }
            })
            console.log({x})
            res.send("true")

        } catch (err) {
            console.log(err)
            return next(err)
        }
    }


    async paymentHistory( req,res,next ){
        try{
            let { organizationId }  = req.params;

            let organization = await Organization.findOne({
                _id: organizationId
            })
            .select("name payment")
            .lean()
            
            organization.payment = organization.payment.reverse();

            return res.render( 'organization/paymentHistory',{organization,moment} );

        }catch(err){
            console.log(err)
            return next(err)
        }
    }
    
}

module.exports = new OrganizationController();