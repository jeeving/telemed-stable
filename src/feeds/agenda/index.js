var Agenda = require('agenda');
var agenda = new Agenda({ db: { address: process.env.MONGO_URI } });
const {
    models: { Appointment },
} = require('../../../lib/models');
const { sendFCMPush } = require('../../../lib/util');

/**
 * Session Start notification to doctor & consultant 
 */

agenda.define('appointment_reminder_notification', { priority: 'high', concurrency: 1 }, async function (job, done) {
    var jobData = job.attrs.data;
    console.log("agenda data===---->", jobData);
    const AppointmentInfo = await Appointment.findOne({ _id: jobData.appointmentId ,paymentStatus:"SUCCESS", isDeleted:false, isCanceled:false }).populate({
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
            sendFCMPush(AppointmentInfo.doctor.deviceToken, 'Appointment reminder! ', `Your appointment is about to start with Dr ${AppointmentInfo.consultant.fullName}.`, fcmData);
        }

        //Send Push notification to consultant  reminder notification
        if (AppointmentInfo.consultant.deviceToken && AppointmentInfo.consultant.appointmentReminder ) {
            sendFCMPush(AppointmentInfo.consultant.deviceToken, 'Appointment reminder! ', `Your appointment is about to start with Dr ${AppointmentInfo.doctor.fullName}.`, fcmData);
        }
    }
    done();
});

module.exports = agenda;