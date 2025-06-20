const {
    models: { Speciality, User },
} = require('../../../../lib/models');

class SpecialityController {
    async specialities(req, res) {

        try {
            const specCount = await Speciality.countDocuments({ isDeleted: false, isSuspended: false });

            var page = (req.query.pageIndex ? parseInt(req.query.pageIndex) : 1);
            var limit = (req.query.pageLimit ? parseInt(req.query.pageLimit) : specCount);
            var skipIndex = (page - 1) * limit;


            // const speciality = await Speciality.find({
            //     isDeleted: false,
            //     isSuspended: false
            // }).skip(skipIndex).limit(limit);

            var speciality = await Speciality.aggregate([{
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "specality",
                    as: "DoctorCount"
                }
            },
            // { $match : { DoctorCount: { $match: { isDeleted: false, isSuspended: false, isAccountComplete : true } } } },
            { $match: { isDeleted: false, isSuspended: false } },
            { $skip: skipIndex },
            { $limit: limit }
            ]);

            if (!speciality) {
                return res.warn({}, req.__('SPECIALITY_NOT_FOUND'));
            }

            if (speciality.length == 0) {
                return res.notFound({}, req.__('SPECIALITY_NOT_FOUND'));
            }

            if (req.user.organizationId) {
                speciality.filter(item => {
                    item.DoctorCount = item.DoctorCount.filter(doc => doc.organizationId && doc.organizationId.toString() == req.user.organizationId.toString() && doc.isAccountComplete && !doc.isSuspended && !doc.isDeleted)
                    item.DoctorCount = item.DoctorCount.length
                });

            } else {
                speciality.filter(item => {
                    item.DoctorCount = item.DoctorCount.filter(doc => doc.isAccountComplete && !doc.isSuspended && !doc.isDeleted)
                    item.DoctorCount = item.DoctorCount.length
                });

            }

            // speciality.totalRecords = specCount;

            // return res.success(speciality, req.__('SPECIALITY_LIST'));



            return res.status(200).send({
                success: true,
                data: speciality,
                message: 'Specialities fetched successfully.',
                totalRecords: specCount
            })
        } catch (err) {
            console.log(err)
            return next(err)
        }


    }
}

module.exports = new SpecialityController();
