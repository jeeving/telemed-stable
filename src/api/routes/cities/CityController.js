const {
    models: { City },
} = require('../../../../lib/models');

class CityController {

    async getCities(req, res) {
        const cities = await City.find({});

        if (!cities) {
            return res.warn({}, req.__('CITY_NOT_EXISTS'));
        }

        return res.success(cities, req.__('Cities list.'));
    }
}

module.exports = new CityController();
