var Agenda = require('agenda');
var agenda = new Agenda({ db: { address: process.env.MONGO_URI } });



const {
    models: { Appointment,AdminSettings,User },
} = require('../../../lib/models');
const { sendFCMPush } = require('../../../lib/util');

/**
 * Session Start notification to doctor & consultant 
 */

agenda.define('appointment_reminder_notification', { priority: 'high', concurrency: 1 }, async function (job, done) {
    var jobData = job.attrs.data;
    const AppointmentInfo = await Appointment.findOne({ _id: jobData.appointmentId, paymentStatus: "SUCCESS", isDeleted: false, isCanceled: false }).populate({
        path: 'doctor',
        select: 'fullName email deviceToken appointmentReminder'
    }).populate({
        path: 'consultant',
        select: 'fullName email deviceToken appointmentReminder'
    });
    if (AppointmentInfo) {

        let fcmData = {
            appointment: AppointmentInfo._id,
            type: 'APPOINTMENT_REMINDER',
            utcTime: jobData.slotTime
        }

        //Send Push notification to doctor  reminder notification
        if (AppointmentInfo.doctor.deviceToken && AppointmentInfo.doctor.appointmentReminder) {
            sendFCMPush(
                AppointmentInfo.doctor.deviceToken,
                'Appointment reminder! ',
                `Your appointment is about to start with Dr ${AppointmentInfo.consultant.fullName}.`,
                fcmData
            );
        }

        //Send Push notification to consultant  reminder notification
        if (AppointmentInfo.consultant.deviceToken && AppointmentInfo.consultant.appointmentReminder) {
            sendFCMPush(
                AppointmentInfo.consultant.deviceToken,
                'Appointment reminder! ',
                `Your appointment is about to start with Dr ${AppointmentInfo.doctor.fullName}.`,
                fcmData
            );
        }
    }
    done();
});

agenda.define("consultantFeeUpdate", { priority: 'high', concurrency: 1 }, async function (job, done) {

    const percentage = (percent, total) => {
      return Number(((percent / 100) * total).toFixed(2));
    }

    var jobData = job.attrs.data;
    let adminSetting        = await AdminSettings.findOne({}).lean();
    const appointment       = await Appointment.findOne({ _id: ObjectId(jobData.appointmentId), paymentStatus: "SUCCESS", isDeleted: false,  isCanceled: false,"organizationId" : {$exists: false},}).lean()
    let consultantId        = (appointment && appointment.consultant && appointment.consultant._id) ? appointment.consultant._id : ""; 
    const consultantData    = await User.findOne({ _id: ObjectId(consultantId) } ,{currency : 1 }).populate({ path: 'countryId', select: '_id currency' }).lean();
    let consultantCurrency  = (consultantData && consultantData.countryId && consultantData.countryId.currency) ? consultantData.countryId.currency : "";

    
    if( appointment ){
        if( appointment.walletAmount == appointment.consultantFee ){
            let set = {}
            let convertAmount = (consultantCurrency && consultantCurrency == "INR") ? Number(appointment.bookingDetails.totalPayable) : Number(appointment.bookingDetails.totalPayable / 100);
            let amount = (consultantCurrency && consultantCurrency == "INR") ? Number(convertAmount) : Number(convertAmount * adminSettings.conversionRate).toFixed(2);
            // let convertUsdToInr = Number(amount * adminSettings.conversionRate).toFixed(2);
            let consultantFee = percentage((100 - adminSetting.adminCommission), amount)
            consultantFee = consultantFee  - adminSetting.adminFlatFee
            set['consultantFee'] = consultantFee
            await Appointment.updateOne({
                _id: appointment._id
            }, {
                $set: set
            })
        }
    }

    done();
});

/*agenda.on('complete', function (job) {
    job.remove();
});*/



agenda.on('complete', function (job) {
    if( [ 'updateWallet' ].indexOf(job.attrs.name) != -1  ){
      console.log(job.attrs.name)
    }else{
      job.remove();
    }
  
  });
  
  
module.exports = agenda;