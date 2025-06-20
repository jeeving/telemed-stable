const NotificationType = Object.freeze({
    BROADCAST: 'Broadcast Notification',
    APPOINTMENT_STATUS:'Appointment Status',
    PAYMENT_SUCCESS:'Payment success',
    PAYMENT_FAILED:'Payment failed',
    VERIFIED_REQUEST_APPROVED: 'Verified Request Approved',
    VERIFIED_REQUEST_REJECTED: 'Verified Request Rejected',

    FEED_POST: 'Post tagged Notification',
    FEED_LIKE: 'Post like',
    FEED_COMMENT: 'Post comment',
    WEBINAR_INVITE: "WEBINAR_INVITE",
    WEBINAR_INVITE_PRESENTER: "WEBINAR_INVITE_PRESENTER",
    WEBINAR_REMINDER:"WEBINAR_REMINDER",
    WEBINAR_GLOBAL_SHOW_INTEREST: "WEBINAR_GLOBAL_SHOW_INTEREST",
    WEBINAR_CANCEL: "WEBINAR_CANCEL",

    FEED_TAG: 'Post tags',
    DOWNLOAD_COMPLETE: "Download Complete"

});

module.exports = NotificationType;
