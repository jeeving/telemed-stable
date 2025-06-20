const locale = {
    USER_WALLET_TOPUP: 'Money has been added to user wallet successfully.',
    TOPUP_WALLET_FORM: {
        amount: {
            required: 'Amount is required.'
        }
    },

    REQUEST_OTP: 'OTP has been sent to your email.',

    REQUEST_APPROVED: 'Request has been approved successfully.',
    REQUEST_REJECTED: 'Request has been rejected successfully.',
    REQUEST_NOT_EXIST : 'Request not exists.',
    REQUEST_ALREADY_SENT: 'Become verified request already sent.',
    REQUEST_SENT: 'Become verified request has been sent.',

    STATE_LIST : 'States fetched successfully.',
    STATE_NOT_FOUND : 'States not found.',
    STATE_ADDED: 'State added successfully.',
    STATE_ALREADY_EXISTS: 'State already exists.',
    STATE_NOT_EXIST : 'State not exists.',
    STATE_STATUS_UPDATED: 'State status updated successfully.',
    STATE_UPDATED: 'State updated successfully.',
    STATE_DELETED: 'State deleted successfully.',
    SUSPENDED_STATE: 'State is in-active.',

    COUNTRY_LIST : 'Countries fetched successfully.',
    COUNTRY_NOT_FOUND : 'Countries not found.',
    COUNTRY_ADDED: 'Country added successfully.',
    COUNTRY_ALREADY_EXISTS: 'Country already exists.',
    COUNTRY_NOT_EXIST : 'Country not exists.',
    COUNTRY_STATUS_UPDATED: 'Country status updated successfully.',
    COUNTRY_UPDATED: 'Country updated successfully.',
    COUNTRY_DELETED: 'Country deleted successfully.',
    SUSPENDED_COUNTRY: 'Country is in-active.',

    GENERAL_ERROR: 'An error occurred.',
    WELCOME: 'Welcome !',
    DROP_ZONE_DROP_MSG: 'Drop file here or click to upload.',
    DROP_ZONE_DROP_UPLOAD_LIMIT: 'You can upload image of maximum,',
    DROP_FILE: 'Drop file here or click to upload.',
    UPLOAD_FILE_SIZE: 'You can upload image of maximum',
    IMAGE_DELETE_FAILED: 'Image Deletion Failed.',
    IMAGE_DELETE_SUCCESS: 'Image Deleted Successfully.',
    VIDEO_DELETE_FAILED: 'Video Deletion Failed.',
    VIDEO_DELETE_SUCCESS: 'Video Deleted Successfully.',
    UNAUTHORIZED: 'Unauthorized access.',
    USER_NOT_FOUND: 'This user isn\'t registered with us.',
    EMAIL_ALREADY_VERIFIED: 'Your email is already verified.',
    USER_VERIFIED: 'User verified successfully.',
    USER_ALREADY_FOUND: 'Account already registered with your phone or email.',
    PHONE_ALREADY_FOUND: 'Account already registered with this phone number.',
    EMAIL_ALREADY_FOUND: 'Account already registered with this email address.',
    USER_STATUS_UPDATED: 'User status updated successfully.',
    USER_ONLINE:'Now user online',
    USER_OFFLINE:'Now user offline',
    USER_NOT_EXIST: 'User not exist.',
    USER_DELETED: 'User deleted successfully.',
    USER_UPDATED: 'User updated successfully.',
    INVALID_CREDENTIALS: 'Invalid Username or Password.',
    INVALID_USER_CREDENTIALS: 'Invalid phone or Password.',
    PHONE_NOT_VERIFIED: 'Phone not verified.',
    ACCOUNT_NOT_VERIFIED: 'Your account is not verified.',
    YOUR_ACCOUNT_SUSPENDED: 'Your account is suspended.',
    YOUR_ACCOUNT_NOT_VERIFIED: 'Your account is not verified, please contact to admin.',
    EMAIL_CHANGED: 'Email changed successfully.',
    PHONE_CHANGED: 'Phone changed successfully.',
    NOTIFICATION_TURNED_ON: 'Notification turned on successfully.',
    NOTIFICATION_TURNED_OFF: 'Notification turned off successfully.',
    PASSWORD_CHANGED: 'Password changed successfully.',
    PASSWORD_MATCH_FAILURE: 'Entered password doesn\'t match the old password.',
    PROFILE_UPDATED: 'Profile updated successfully.',
    OTP_SENT: 'OTP sent successfully.',
    OTP_VERIFIED: 'OTP verified successfully.',
    INVALID_OTP: 'Invalid OTP.',
    LOGIN_SUCCESS: 'Logged-In successfully.',
    LOGOUT_SUCCESS: 'Logged-Out successfully.',
    passwordPattern: 'at least 8 characters with at least 1 alphabet and 1 digit.',
    adminPasswordPattern: 'Password must contain at least 8 characters with at least 1 alphabet (upper & lowe cased), 1 digit. & 1 special character.',
    countryCodePattern: 'plus sign followed by digits.',
    otpPattern: 'a valid otp.',
    INVALID_RESET_PASS_REQUEST: 'Invalid reset password request.',
    FORGOT_PASSWORD_MAIL_SUCCESS: 'Forgot password email sent successfully. Please check and change password.',
    EMAIL_RESET_PASSWORD: 'Reset password email.',
    WEB_ACCOUNT_CREATED: 'Account created successfully.',
    ACCOUNT_ALREADY_VERIFIED: 'Account already verified.',
    USERNAME_MATCHED: 'User name already exists.',
    EMAIL_MATCHED: 'Email already exists.',
    USERNAME_EMAIL_MATCHED: 'User name or email already exists.',
    OTP_SEND: 'Otp send successfully.',
    FORGOT_EMAIL_SEND: 'Forgot email send. Please check your email-id and reset your password.',
    CONTACT_US_SEND: 'Contact mail send successfully.',
    EMAIL_CONTACT_US: 'Contact us mail',
    FORGOT_PASSWORD: 'Reset Password',
    EMAIL_NOT_MATCHED: 'Email address not registered with us.',
    FILE_MAX_SIZE_ERR: 'File size must be less than or equal to {0} mb.',
    SETTINGS_UPDATE_SUCCESS: 'Settings updated successfully.',
    PAYMENT_SUCCESS_TITLE: 'Success!',
    PAYMENT_ERROR_TITLE: 'Error!',
    ALREADY_PAID: 'Already paid.',
    REDIRECT_TO_PAYMENTS: 'Redirecting to payment gateway.',
    INVALID_CREDENTIALS_LIMIT: 'Invalid credentials{0}',
    LOGIN_DISABLED: 'Login disabled for {0}.',
    KEY_MINUTES: 'minutes &',
    KEY_SECONDS: 'seconds',
    KEY_LOGIN_DISABLED: ', login disabled.',
    KEY_YOU_HAVE_ONLY: ', you have only',
    KEY_CHANCE_LEFT: 'chance left.',
    DATA_NOT_FOUND : 'Data not found.',
    CONSULTANT_FOUND : 'Consultants found successfully.',
    SPECIALITY_LIST : 'Specialities fetched successfully.',
    SPECIALITY_NOT_FOUND : 'Specialities not found.',
    SPECIALITY_ADDED: 'Speciality added successfully.',
    SPECIALITY_ALREADY_EXISTS: 'Speciality already exists.',
    SPECIALITY_NOT_EXIST : 'Speciality not exists.',
    SPECIALITY_STATUS_UPDATED: 'Speciality status updated successfully.',
    SPECIALITY_UPDATED: 'Speciality updated successfully.',
    SPECIALITY_DELETED: 'Speciality deleted successfully.',
    ADVERTISEMENT_ADDED: 'Advertisement added successfully.',
    ADVERTISEMENT_ALREADY_EXISTS : 'Advertisement already exists.',
    ADVERTISEMENT_NOT_EXIST : 'Advertisement not exists.',
    ADVERTISEMENT_STATUS_UPDATED: 'Advertisement status updated successfully.',
    ADVERTISEMENT_UPDATED: 'Advertisement updated successfully.',
    ADVERTISEMENT_DELETED: 'Advertisement deleted successfully.',
    FAQ_ADDED: 'Faq added successfully.',
    FAQ_ALREADY_EXISTS : 'Faq already exists.',
    FAQ_NOT_EXIST : 'Faq not exists.',
    FAQ_STATUS_UPDATED: 'Faq status updated successfully.',
    FAQ_UPDATED: 'Faq updated successfully.',
    FAQ_DELETED: 'Faq deleted successfully.',
    EMAIL_ALREADY_EXISTS: 'Email already exists.',
    CONTACT_NO_ALREADY_EXISTS: 'Contact number already exists.',
    NEWSLETTER : 'New user has shown interest in TelemedReferral.',
    THANKS_NEWSLETTER : 'Thanks for contacting us on TelemedReferral.',
    DESCRIPTION_REQUIRED: 'Description is required.',
    CONTACT_REQUEST_SUBMITTED: 'Contact request submitted successfully.',
    CONTACT_US_DELETED:'Contact us request deleted successfully.',
    CONTACT_US_NOT_EXISTS:'Contact us request not exists.',
    CONTACT_US_STATUS_UPDATED:"Contact us request status updated successfully.",
    PAGE_NOT_EXISTS: 'Page not exists.',
    PAGE_STATUS_UPDATED: 'Page status updated successfully.',
    PAGE_UPDATED: 'Page updated successfully.',
    USER_NOT_EXISTS : 'Doctor not exists.',
    USER_UPDATED : 'Details updated successfully.',
    EMAIL_NOT_VERIFIED: 'Email not verified.',
    SPECIALITY_NOT_EXISTS: 'Speciality not exists.',
    PERSONAL_INFO_UPDATED: 'Personal info updated successfully.',
    WORKING_DETAIL_INFO_UPDATED: 'Working detail info updated successfully.',
    PLEASE_COMPLETE_PREVIOUS_PROCESS: 'Please complete previous steps first.',
    PAYMENT_DETAIL_UPDATED: 'Payment info updated successfully.',
    ADVERTISEMENT_NOT_EXISTS:'Advertisement not exists',
    APPOINTMENT_LIST:'Appointment list.',
    APPOINTMENT_CANCELED:'Appointment canceled successfully.',
    APPOINTMENT_DETAIL:'Appointment detail.',
    APPOINTMENT_NOT_FOUND:'Appointment not found.',
    CONSULTANT_FOUND:'Consultant found successfully.',
    APPOINTMENT_REMINDER_TURNED_ON:"Appointment reminder turned On successfully.",
    APPOINTMENT_REMINDER_TURNED_OFF:"Appointment reminder turned Off successfully.",
    EMAIL_DOCTOR_PASSWORD : "Account registered by admin",

    TWILIO_CALL_ERROR_USER_OFFLINE: "Sorry, customer seems offline, please try again later after some time",
    TWILIO_CALL_ERROR_USER_NOT_FOUND: "There is some error connecting your call",
    TWILIO_CALL_BUSY_ERROR: "The number you are calling is busy please try after some time.",
    TITLE_NOTIFICATION_BEFORE_CALL: 'Please get ready you have a call on Iron-Egg',
    MSG_NOTIFICATION_BEFORE_CALL: 'You have an appointment booking call session get ready for call and stay online.',
    CALL_CONTINUE_KEY: 'CALL_CONTINUE',
    VIDEO_CALL_CONTINUE_KEY: 'VIDEO_CALL_CONTINUE',
    CALL_CONTINUE_MSG: 'Would you like to continue call',
    CALL_CONTINUE_TITLE: 'Would you like to continue call',
    TIME_INCREASE: "Your call time is now increased by 15 minutes more",
    CANNOT_CREATE_CALL_ERROR: "Call is only allowed under appointment time duration.",
    VIDEO_CALL_DISCONNECTED: "Video call disconnected",
    VIDEO_CALL_DISCONNECTED_MSG: "Now video call has been disconnected.",
    INVALID_BAL: "Unable to accept this request because user account has less balance.Let user first refill his account then try after sometime.",
    DEVICE_TOKEN_UPDATED:"Device Token updated",
    NEW_PAYMENT_REQUEST:"New Payment Request",
    VOICE_NOTE_ADDED:"Voice Note Added",
    DESCRIPTION_ADDED:"Description Added",
    BLOCK_LIST:"Blocked user list",

    INVALID_ONLY_JPG_GIF: "Please upload jpg or gif image",
    USER_ONEMERGENCY:'Now user emergency on.',
    USER_OFFEMERGENCY:'Now user emergency off.',

    USER_ON_CALL:'Call receiving option on.',
    USER_OFF_CALL:'Call receiving option off.',
    
    /* --- Social media ---- */
    FEEDS_NOT_FOUND : "Feed not found",
    FEEDS_UPDATED : "Feed updated!",
    FEEDS_DETAILS : "Feed details",
    FEEDS_DELETED : "Feed deleted successfully",
    FEED_CREATED : "Feed created successfully",
    COMMENT_EDIT_SUCCESSFULLY : 'Commnet edit successfully',
    FEED_LIKED : "Feed Like",
    REPORT_SUBMIT_SUCCESSFULLY : "Reports has been submitted successfully",
    FEED_DELETED : "Feed delete successfully",
    FEED_LIST : "Feed listing",
    CMNT_ADDED : "Comment added",

    INVALID_ID: "Invalid webinar",
    INVALID_STATUS: "Invalid status",

    CANCEL_SUCCESS: "Webinar canceled successfully",

    TOKEN_EXPIRED: "Session expired",
    /* -----eof ------------ */

    STATIC_PAGE_EDIT: {
        title: {
            required: 'Page title is required.',
            minlength: 'Page title is required to be minimum 3 chars.',
            maxlength: 'Page title is required to be maximum 30 chars.',
        },
        titleRU: {
            required: 'Page title is required.',
            minlength: 'Page title is required to be minimum 3 chars.',
            maxlength: 'Page title is required to be maximum 30 chars.',
        },
        titleKK: {
            required: 'Page title is required.',
            minlength: 'Page title is required to be minimum 3 chars.',
            maxlength: 'Page title is required to be maximum 30 chars.',
        },
    },
    ADD_ADVERTISE_FORM: {
        advertiseName: {
            required: 'Advertise Name is required.',
            minlength: 'Advertise Name is required to be minimum 3 chars.',
            maxlength: 'Advertise Name is required to be maximum 30 chars.',
            remote: 'Advertise Name already exists.',
        },
        adPlace : {
            required: 'Please choose advertise place to be displayed.',
        },
        bannerUrl : {
            url : 'Please provide a valid url.',
            required: 'Banner Url is required.',

        },
        bannerImage : {
            required: 'Banner Image is required.',
        }
    },

    ADD_SPECIALITY_FORM: {
        speciality: {
            required: 'Specialty is required.',
            minlength: 'Specialty is required to be minimum 3 chars.',
            maxlength: 'Specialty is required to be maximum 80 chars.',
            remote: 'Specialty already exists.',
        },
        bannerImage : {
            required: 'Specialty Icon is required.',
        }
    },

    ADD_DOCTOR_FORM: {
        fullName: {
            required: 'Full name is required.',
            minlength: 'Name is required to be minimum 3 chars.',
            maxlength: 'Name is required to be maximum 30 chars.',
        },
        email: {
            required: 'Email address is required.',
            minlength: 'Email address is required to be minimum 3 chars.',
            maxlength: 'Email address is required to be maximum 80 chars.',
            pattern: 'Please enter a valid email address.',
            remote: 'This email address is already Exists.',
        },
        countryCode : {
            required: 'Country code is required.',
            pattern: 'Please enter a valid country code.'
        },
        phoneNumber: {
            required: 'Phone number is required.',
            pattern: 'Phone number is required to be a valid number.',
        },
        password: {
            required: 'Password is required.',
            pattern: 'Password must contain at least 8 characters with at least 1 alphabet (upper & lowe cased), 1 digit. & 1 special character.',
        },
        confirmPassword: {
            required: 'Confirm password is required.',
            equalTo: 'Confirm password must match new password.',
        },
    },

    EDIT_DOCTOR_FORM: {
        fullName: {
            required: 'Full name is required.',
            minlength: 'Name is required to be minimum 3 chars.',
            maxlength: 'Name is required to be maximum 30 chars.',
        },
        email: {
            required: 'Email address is required.',
            minlength: 'Email address is required to be minimum 3 chars.',
            maxlength: 'Email address is required to be maximum 80 chars.',
            pattern: 'Please enter a valid email address.',
            remote: 'This email address is already Exists.',
        },
        countryCode : {
            required: 'Country code is required.',
            pattern: 'Please enter a valid country code.'
        },
        phoneNumber: {
            required: 'Phone number is required.',
            pattern: 'Phone number is required to be a valid number.',
        },
    },
    REQUEST_SENDED:'Request sended successfully.',
    NOTIFICATION_NOT_FOUND:'Notification not found.',
    ADD_FAQ_FORM: {
        question: {
            required: 'Question is required.',
            minlength: 'Question is required to be minimum 5 chars.',
            maxlength: 'Question is required to be maximum 70 chars.',
            remote: 'Question already exists.',
        },
        answer: {
            required: 'Answer is required.',
            minlength: 'Answer is required to be minimum 5 chars.',
        }
    },
    CATEGORY_EDIT_FORM: {
        categoryName: {
            required: 'Category Name is required.',
            minlength: 'Email address is required to be minimum 2 chars.',
            maxlength: 'Email address is required to be maximum 30 chars.',
        },
    },
    ADMIN_LOGIN_FORM: {
        email: {
            required: 'Email address is required.',
            minlength: 'Email address is required to be minimum 3 chars.',
            maxlength: 'Email address is required to be maximum 80 chars.',
            pattern: 'Email address is required to be a valid email.',
        },
        password: {
            required: 'Password is required.',
        },
    },
    ADMIN_FORGOT_PASSWORD_FORM: {
        email: {
            required: 'Email address is required.',
            minlength: 'Email address is required to be minimum 3 chars.',
            maxlength: 'Email address is required to be maximum 80 chars.',
            pattern: 'Email address is required to be a valid email.',
        },
    },
    ADMIN_RESET_PASSWORD_FORM: {
        newPassword: {
            required: 'Password is required.',
            pattern: 'Password must contain at least 8 characters with at least 1 alphabet (upper & lowe cased), 1 digit. & 1 special character.',
        },
        otp: {
            required: 'OTP is required.',
            pattern: 'OTP is required to be a valid otp.'
        },
    },
    PROFILE_FORM: {
        firstName: {
            required: 'First name is required.',
            minlength: 'First name is required to be minimum 3 chars.',
            maxlength: 'First name is required to be minimum 30 chars.',
        },
        lastName: {
            required: 'Last name is required.',
            minlength: 'Last name is required to be minimum 3 chars.',
            maxlength: 'Last name is required to be minimum 30 chars.',
        },
        email: {
            required: 'Email address is required.',
            minlength: 'Email address is required to be minimum 3 chars.',
            maxlength: 'Email address is required to be maximum 80 chars.',
            pattern: 'Please enter a valid email address.',
            remote: 'This email address is already Exists.',
        },
        countryCode: {
            required: 'Country code is required.',
            pattern: 'Country code is required to be a valid code.',
        },
        contactNumber: {
            required: 'Contact number is required.',
            pattern: 'Contact number is required to be a valid number.',
        },
    },
    CHANGE_PASSWORD: {
        currentPassword: {
            required: 'Current password is required.',
        },
        newPassword: {
            required: 'New password is required.',
            pattern: 'Password must contain at least 8 characters with at least 1 alphabet (upper & lowe cased), 1 digit. & 1 special character.',
        },
        confirmPassword: {
            required: 'Confirm password is required.',
            equalTo: 'Confirm password must match new password.',
        },
    },
    ADMIN_SETTINGS_FORM: {
        adminCommission:{
            required: 'Admin commission is required.',
            pattern: 'Invalid format.',
        },
        androidAppVersion: {
            required: 'Android app version is required.',
            pattern: 'Only semantic versions is allowed.',
        },
        iosAppVersion: {
            required: 'iOS app version is required.',
            pattern: 'Only semantic versions is allowed.',
        },
        androidForceUpdate: {
            required: 'Android force update is required.',
        },
        iosForceUpdate: {
            required: 'iOS force update is required.',
        },
        maintenance: {
            required: 'Maintenance is required.',
        },
    },

    ADD_COUNTRY_FORM: {
        name: {
            required: 'Name is required.',
            minlength: 'Name is required to be minimum 3 chars.',
            maxlength: 'Name is required to be maximum 80 chars.',
            remote: 'Name already exists.',
        },
        currency: {
            required: 'Currency is required.',
        }

    },

    ADD_STATE_FORM: {
        countryId: {
            required: 'Country is required.'
        },
        name: {
            required: 'Name is required.',
            minlength: 'Name is required to be minimum 3 chars.',
            maxlength: 'Name is required to be maximum 80 chars.',
            remote: 'Name already exists.',
        }
    }
};

const validationKeys = {
    firstName: 'First name',
    lastName: 'Last name',
    fullName: 'Full name',
    name: 'Name',
    userName: 'User name',
    email: 'Email Address',
    countryCode: 'Country code',
    contactNumber: 'Contact number',
    password: 'Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    emailPattern: 'a valid email address',
    contactNumberPattern: 'a valid number',
    phonePattern: 'a valid number',
    passwordPattern: 'at least 8 characters with at least 1 alphabet and 1 digit',
    adminPasswordPattern: 'Password must contain at least 8 characters with at least 1 alphabet (upper & lowe cased), 1 digit. & 1 special character.',
    countryCodePattern: 'plus sign followed by digits.',
    otpPattern: 'a valid otp.',
    timeIn24Hours: 'a valid time in 24 hours format',
    language: 'Language',
    title: 'Title',
    description: 'Description',
    dateFrom: 'From date',
    dateTo: 'To date',
    status: 'Status',
    id: 'ID',
    path: 'Path',
    parent: 'Parent',
    main: 'valid object id or "main"',
    category: 'Category',
    originalPrice: 'Original price',
    price: 'Price',
    address: 'Address',
    avatar: 'Avatar',
    deviceToken: 'Device token',
    landmark: 'Landmark',
    street: 'Street',
    latitude: 'Latitude',
    longitude: 'Longitude',
    page: 'page',
    perPage: 'Per page',
    radius: 'Radius',
};

const key = keyName => validationKeys[keyName.replace(/\.[\d]+/, '')] || keyName;

/**
 * @see https://github.com/hapijs/joi/blob/master/lib/language.js
 */
const validationMessages = {
    any: {
        required: ({ path }) => `${key(path.join('.'))} is required.`,
        unknown: ({ path }) => `${key(path.join('.'))} is not allowed.`,
        invalid: ({ path }) => `${key(path.join('.'))} contains an invalid value.`,
        empty: ({ path }) => `${key(path.join('.'))} is required.`,
        allowOnly: ({ context, path }) => `${key(path.join('.'))} must be one of ${context.valids.map(item => key(item)).join(', ')}`,
    },

    string: {
        regex: {
            name: ({ context, path }) => `${key(path.join('.'))} must contain ${key(context.name)}`,
        },
        min: ({ context, path }) => `${key(path.join('.'))} must be at least ${context.limit} characters in length.`,
        max: ({ context, path }) => `${key(path.join('.'))} must be under ${context.limit} characters in length.`,
        hex: ({ path }) => `${key(path.join('.'))} must only contain hexadecimal characters.`,
        length: ({ path }) => `${key(path.join('.'))} length must be 4 characters long.`,
    },

    number: {
        base: ({ path }) => `${key(path.join('.'))} must be a number`,
        min: ({ context, path }) => `${key(path.join('.'))} must be larger than or equal to ${context.limit}.`,
        max: ({ context, path }) => `${key(path.join('.'))} must be less than or equal to ${context.limit}.`,
        integer: ({ path }) => `${key(path.join('.'))} must be a integer number.`,
    },

    objectId: {
        valid: ({ path }) => `${key(path.join('.'))} needs to be a valid Object ID`,
    },

    object: {
        base: ({ path }) => `${key(path.join('.'))} must be an object`,
        xor: ({ context }) => `only one of ${context.peers.map(peer => key(peer)).join(', ')} is allowed.`,
        with: ({ context }) => `${key(context.peer)} is required with ${key(context.main)}.`,
        without: ({ context }) => `${key(context.peer)} needs to be removed with ${key(context.main)}.`,
        and: ({ context }) =>
            `${context.missing.map(peer => key(peer)).join(', ')} required with ${context.present
                .map(peer => key(peer))
                .join(', ')}.`,
        missing: ({ context }) => `one of ${context.peers.map(peer => key(peer).toLowerCase()).join(', ')} is required.`,
    },

    array: {
        min: ({ path, context }) => `${key(path.join('.'))} must contain at least ${context.limit} items.`,
        max: ({ path, context }) => `${key(path.join('.'))} must contain at most ${context.limit} items.`,
    },

    custom: {
        sameAs: (key1, key2) => `${key(key1)} must match the ${key(key2)} field.`,
    },

    date: {
        valid: key1 => `${key(key1)} needs to be a valid date.`,
        min: (key1, date) => `${key(key1)} must be larger than or equal to ${date}.`,
        max: (key1, date) => `${key(key1)} must be less than or equal to ${date}.`,
        invalid: key1 => `${key(key1)} is required to be a valid date.`,
    },
};

locale.validationKeys = validationKeys;
locale.validation = validationMessages;

module.exports = Object.freeze(locale);
