const {
    models: { State },
} = require('../../../../lib/models');

const mongoose = require('mongoose'),
ObjectId = mongoose.Types.ObjectId;

class StateController {

    async getStates(req, res) {
        const {countryId} = req.params;
        const states = await State.find({
            countryId: ObjectId(countryId),
            isDeleted: false,
            isSuspended: false
        });

        if (!states) {
            return res.warn({}, req.__('STATE_NOT_EXISTS'));
        }

        return res.success(states, req.__('States list.'));
    }
}

module.exports = new StateController();
