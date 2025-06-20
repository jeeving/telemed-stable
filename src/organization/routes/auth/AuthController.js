const {
    models: { Admin, AdminSettings, User, Speciality, Organization,OrganizationRequest  },
} = require('../../../../lib/models');
const { utcDateTime, generateResetToken, logError } = require('../../../../lib/util');
const { signToken } = require('../../util/auth');
const { sendMail } = require('../../../../lib/mailer');
const { Advertisement, Appointment } = require('../../../../lib/models/models');

class AuthController {
    async logInPage(req, res) {

        if (req.session.user) {
            return res.redirect('/');
        }
        return res.render('login');
    }

    async logIn(req, res) {
        try{

        
            if (req.session.user) {
                return res.redirect('/');
            }
            let { email, password } = req.body;
            email = email.toLowerCase()
            let admin = await Organization.findOne({ email, isDeleted: false });


            if (!admin) {
                req.flash('error', req.__('INVALID_CREDENTIALS'));
                return res.redirect('/auth/log-in');
            }
            if (admin.isSuspended) {
                req.flash('error', req.__('YOUR_ACCOUNT_SUSPENDED'));
                return res.redirect('/auth/log-in');
            }

            const passwordMatched = await admin.comparePassword(password);
            console.log({passwordMatched})

            if (!passwordMatched) {
                req.flash('error', req.__('INVALID_CREDENTIALS') );
                return res.redirect('/auth/log-in');
            }

            admin.authTokenIssuedAt = utcDateTime().valueOf();
            
            admin = await admin.save();
            
            //console.log({admin})
            
            const adminJson = admin.toJSON();
            //console.log( "xxxxx",adminJson )
            const token = signToken(admin);
            //console.log( "44444" )
            //console.log({token})
            

            ['password', 'authTokenIssuedAt'].forEach(key => delete adminJson[key]);
            //console.log( "111111111111" )
            req.session.user = adminJson;
            //console.log( "2222222222" )
            req.session.token = token;
            //console.log( "33333333333333" )

            req.flash('success', req.__('LOGIN_SUCCESS'));
            //console.log( "4444444444444444" )
            return res.redirect('/');
        }catch(err){
            console.log(err)
            return next(err)
        }
    }

    async logout(req, res) {
        req.session.user = null;
        req.session.token = null;
        req.flash('success', req.__('LOGOUT_SUCCESS'));
        return res.redirect('/auth/log-in');
    }

    async dashboard(req, res) {
        try{
            const organization = Organization.findOne({_id: req.user._id}).lean()
            const users = User.find({ "organizationId":req.user._id, isDeleted: false  }).select("_id").lean()
            const values = await Promise.all([
                organization, 
                users
            ])
            return res.render("index", {
                organization: values[0], 
                users: values[1]
            });
        }catch(err){
            return next(err)
        }
    }

    async profilePage(req, res) {
        const { user } = req;
        return res.render('profile', {
            user,
        });
    }

    async profile(req, res) {
        const { user } = req;
        const { firstName, lastName, email, countryCode, contactNumber } = req.body;

        user.firstName = firstName;
        user.lastName = lastName;
        user.email = email;
        user.countryCode = countryCode;
        user.contactNumber = contactNumber;
        await user.save();

        req.flash('success', req.__('PROFILE_UPDATED'));
        return res.redirect('/profile');
    }

    async changePasswordPage(req, res) {
        return res.render('change-password');
    }

    async changePassword(req, res) {
        const { user } = req;
        const { currentPassword, newPassword } = req.body;

        const passwordMatched = await user.comparePassword(currentPassword);
        if (!passwordMatched) {
            req.flash('error', req.__('PASSWORD_MATCH_FAILURE'));
            return res.redirect('/change-password');
        }

        user.password = newPassword;
        await user.save();

        req.flash('success', req.__('PASSWORD_CHANGED'));
        return res.redirect('/change-password');
    }

    async forgotPasswordPage(req, res) {
        if (req.session.user) {
            return res.redirect('/');
        }
        return res.render('forgot-password');
    }

    async forgotPassword(req, res) {
        if (req.session.user) {
            return res.redirect('/');
        }
        const { email } = req.body;

        const admin = await Admin.findOne({
            email,
            isDeleted: false,
        });

        if (!admin) {
            req.flash('error', req.__('USER_NOT_FOUND'));
            return res.redirect('/auth/forgot-password');
        }

        if (admin.isSuspended) {
            req.flash('error', req.__('YOUR_ACCOUNT_SUSPENDED'));
            return res.redirect('/auth/forgot-password');
        }

        admin.resetToken = generateResetToken();
        await admin.save();

        req.flash('success', req.__('FORGOT_PASSWORD_MAIL_SUCCESS'));
        res.redirect('/auth/log-in');

        sendMail('admin-forgot-password', req.__('EMAIL_RESET_PASSWORD'), email, {
            verification_code: admin.resetToken,
            resetLink: `${process.env.SITE_URL}/auth/reset-password?email=${email}`,
        })
            .catch(error => {
                logError(`Failed to send password reset link to ${email}`);
                logError(error);
            });
    }

    async resetPasswordPage(req, res) {
        if (req.session.user) {
            return res.redirect('/');
        }
        const { email } = req.query;

        if (!email) {
            req.flash('error', req.__('INVALID_RESET_PASS_REQUEST'));
            return res.redirect('/auth/forgot-password');
        }

        const admin = await Admin.findOne({
            email,
            isDeleted: false,
        });

        if (!admin || !admin.resetToken) {
            req.flash('error', req.__('INVALID_RESET_PASS_REQUEST'));
            return res.redirect('/auth/forgot-password');
        }

        if (admin.isSuspended) {
            req.flash('error', req.__('YOUR_ACCOUNT_SUSPENDED'));
            return res.redirect('/auth/forgot-password');
        }

        return res.render('reset-password');
    }

    async resetPassword(req, res) {
        if (req.session.user) {
            return res.redirect('/');
        }
        const { email } = req.query;
        const { otp, newPassword } = req.body;

        if (!email) {
            req.flash('error', req.__('INVALID_RESET_PASS_REQUEST'));
            return res.redirect('/auth/forgot-password');
        }

        const admin = await Admin.findOne({
            email,
            isDeleted: false,
        });

        if (!admin) {
            req.flash('error', req.__('USER_NOT_FOUND'));
            return res.redirect('/auth/forgot-password');
        }

        if (admin.isSuspended) {
            req.flash('error', req.__('YOUR_ACCOUNT_SUSPENDED'));
            return res.redirect('/auth/forgot-password');
        }

        if (!(admin.resetToken === otp)) {
            req.flash('error', req.__('INVALID_OTP'));
            return res.redirect(req.headers['referer']);
        }

        admin.password = newPassword;
        admin.resetToken = null;
        await admin.save();

        req.flash('success', req.__('PASSWORD_CHANGED'));
        return res.redirect('/auth/log-in');
    }

    async isEmailExists(req, res) {
        const { email, id } = req.body;
        const matchCond = {
            isDeleted: false,
            email,
        };
        id &&
        (matchCond._id = {
            $ne: id,
        });
        //console.log({matchCond})
        const count = await User.countDocuments(matchCond);
        //console.log({count})
        return res.send(count === 0);
    }

    async settingsPage(req, res) {
        const settingData = await AdminSettings.findOne();
        return res.render('setting', {
            settingData
        });
    }

    async updateSettings(req, res) {
        const {
            androidAppVersion,
            androidForceUpdate,
            iosAppVersion,
            iosForceUpdate,
            maintenance,
            adminCommission,
            gst,
            transactionFee,
            newsLetterEmail
        } = req.body;

        await AdminSettings.updateMany({},
            {
                $set: {
                    androidAppVersion,
                    androidForceUpdate,
                    iosAppVersion,
                    iosForceUpdate,
                    maintenance,
                    adminCommission,
                    gst,
                    transactionFee,
                    newsLetterEmail
                },
            },
            {
                upsert: true,
            },
        );

        req.flash('success', req.__('SETTINGS_UPDATE_SUCCESS'));
        return res.redirect('/');
    }
}

module.exports = new AuthController();
