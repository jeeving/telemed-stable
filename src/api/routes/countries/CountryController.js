const {
    models: { Country },
} = require('../../../../lib/models');

class CountryController {

    async getCountries(req, res) {
        const countries = await Country.find({
            isDeleted: false,
            isSuspended: false
        });

        if (!countries) {
            return res.warn({}, req.__('COUNTRY_NOT_EXISTS'));
        }

        return res.success(countries, req.__('Countries list.'));
    }
}

module.exports = new CountryController();
