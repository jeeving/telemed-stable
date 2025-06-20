const {
    models: { Page, Slot },
} = require('../../../../lib/models');

const { utcDateTime, showDate } = require('../../../../lib/util');


const moment = require('moment');
const date = require('joi/lib/types/date');

class SlotController {

    async getSlot(req, res) {
        const { user }          = req;
        const { date, offset }  = req.body;
        let serverOffset        = new Date().getTimezoneOffset();
        let addSubtractOffset   = offset.indexOf("+")  === 0 ? offset.replace("+","-"): offset.replace("-","+");
        let startUtc            = new Date(new Date(date).getTime() + (parseInt(addSubtractOffset) * 60  *1000) + (serverOffset * 60  *1000));
        let endUtc              = new Date(new Date(date).getTime() + (parseInt(addSubtractOffset) * 60  *1000) + (serverOffset* 60  *1000) + (24 * 60 * 60 * 1000));
        let fromDateMatch       = new Date(date).setHours(0, 0, 0);
        let toDateMatch         = new Date(new Date(date).setHours(0, 0, 0)).setDate(new Date(new Date(date).setHours(0, 0, 0)).getDate() + 1);

        const fetchSlot = await Slot.aggregate([
            {
                $match: {
                    doctorId: user._id
                }
            },
            { $unwind: { path: "$slots" } },
            { $match : { 
                "slots.utcTime": {
                    $gte: new Date(startUtc),
                    $lt: new Date(endUtc)
                }
            } },
            { $group : { 
                _id: "$_id" , 
                slots : { $push : "$slots" },  
                slotDuration : { $first : "$slotDuration" },  
                slotDate : { $first : "$slotDate" },  
                startDate : { $first : "$startDate" },  
                endDate : { $first : "$endDate" },  
                time : { $first : "$time" },  
                weekDay : { $first : "$weekDay" },  
                updated : { $first : "$updated" }, 
                created : { $first : "$created" } }
            },
            { $sort: { slotDate: 1 } }
        ])

        if (fetchSlot.length > 0) {
            return res.success(fetchSlot, req.__('Available slots list.'));
        }
        else {
            return res.notFound({}, 'Slot not created for this date');
        }
    }
    async getSlotById(req, res) {
        const { user } = req;
        const { id } = req.query;

        const fetchSlot = await Slot.find({ doctorId: user._id, _id: id });

        if (fetchSlot.length > 0) {
            return res.success(fetchSlot, req.__('Found successfully.'));
        }
        else {
            return res.notFound({}, 'Slot not found.');
        }
    }

    async createSlot(req, res) {

        var { startDate, endDate, startTime, endTime, weekDays, offset } = req.body;
        const { user } = req;
        if (!user) {
            return res.unauthorized('', req.__('USER_NOT_FOUND'));
        }
        if (!user.accountDetails) {
            return res.badRequest({}, 'Please add bank account details.');
        }
        let serverOffset = new Date().getTimezoneOffset();
        let addSubtractOffset = offset.indexOf("+")  === 0 ? offset.replace("+","-"): offset.replace("-","+");

       /* var startUtc = moment.utc(moment.utc(moment(startDate).format("YYYY-MM-DD") + ' ' + moment(startTime, "HH:mm a").format("HH:mm")).utcOffset(addSubtractOffset).format("YYYY-MM-DD HH:mm"));

        var endUtc = moment.utc(moment.utc(moment(endDate).format("YYYY-MM-DD") + ' ' + moment(endTime, "HH:mm a").format("HH:mm")).utcOffset(addSubtractOffset).format("YYYY-MM-DD HH:mm"));
        */
        let startUtc = new Date(new Date(startDate +' '+ startTime).getTime() + (parseInt(addSubtractOffset) * 60  *1000) + (serverOffset * 60  *1000));

        let endUtc = new Date(new Date(endDate+ ' '+endTime).getTime() + (parseInt(addSubtractOffset) * 60  *1000) + (serverOffset* 60  *1000));

        var start = moment(startDate).format("YYYY-MM-DD");
        var end = moment(endDate);
        

        var current = moment.utc();

        if (moment(moment(startUtc).format("YYYY-MM-DD")).isSame(moment().format("YYYY-MM-DD"))) {

            var beginningTime = moment(moment(startUtc, "HH:mm A").format('LT'), 'h:mm a');
            var currTime = moment(moment(current).format('HH:mm A'), 'h:mm a');

            if (beginningTime.isBefore(currTime) || beginningTime.isSame(currTime)) {
                return res.badRequest({}, 'Can not create slots in past time, try again with upcoming time.');
            }
        }
        if (!moment(startUtc).isAfter(current) && !moment(moment(startUtc).format("YYYY-MM-DD")).isSame(moment(current).format("YYYY-MM-DD"))) {
            return res.badRequest({}, 'Start date should be any future date.');
        }

        if (moment(endUtc).isBefore(current) && !moment(moment(endUtc).format("YYYY-MM-DD")).isSame(moment(current).format("YYYY-MM-DD"))) {
            return res.badRequest({}, 'End date should be any future date.');
        }

        if (startTime.toUpperCase() === endTime.toUpperCase()) {
            return res.badRequest({}, 'Can not create slots between given start and end time, Please choose another time.');
        }

        //Difference in number of days
        var Difference_In_Time = endUtc.getTime() - startUtc.getTime();
        var Difference_In_Days = Difference_In_Time / (1000 * 3600 * 24);
        var duration = Difference_In_Days + 1;//moment.duration(endUtc.diff(startUtc)).asDays() + 1;
        var result = [];

        var nwDate = startUtc;
        var localNowDate = new Date(new Date(startDate +' '+ startTime).getTime() + (serverOffset * 60  *1000));
        for (let i = 1; i <= parseInt(duration); i++) {
            weekDays.map(day => {
                if (localNowDate.getDay() === parseInt(day)) {
                    result.push(new Date(nwDate));
                }
            });

            localNowDate.setDate(localNowDate.getDate() + 1 );
            nwDate.setDate(nwDate.getDate() + 1 ); //  moment(nwDate).add(1, 'days');
        }
        if (!result.length) {
            return res.badRequest({}, 'Can not find days between given dates, try again with another days.');
        }



        var sTime = moment(startTime, "hh:mm: A");
        var sTimeFormatted = moment(startTime, "hh:mm: A").format('LT');
        var eTimeFormatted = moment(endTime, "hh:mm: A").format('LT');
        var eTime = moment(endTime, "hh:mm: A")
        var time = sTimeFormatted + ' - ' + eTimeFormatted

        var eDuration = moment.duration(eTime.diff(sTime))
        var minutes = parseInt(eDuration.asMinutes());

        var totalSlots = minutes / 15;

        let canCreate = totalSlots % 1 === 0;

        if (!canCreate) {
            return res.badRequest({}, 'cannot create 15 minutes slots with these time, please select another time')
        }
        
        let slots = [];
        var slotObj = {};

        for (let i = 1; i <= totalSlots; i++) {
            slotObj = { 
                bookingId: '', 
                slotTime: sTimeFormatted + ' - ' + moment(sTimeFormatted, "hh:mm: A").add(15, 'minutes').format('LT'), 
                isBooked: false 
            }
            slots.push(slotObj);
            sTimeFormatted = moment(sTimeFormatted, "hh:mm: A").add(15, 'minutes').format('LT');
        }

        if (slots.length == 0) {
            return res.badRequest({}, 'Can not create slots between given start and end time, Please choose another time.');
        }

        
        
        var fetchSlots;
        var slotSave;
        var match = false;

        result.filter(async resDate => {
            let fromDateMatch = new Date(resDate);
            
            new Date(new Date(resDate).getTime() + (parseInt(offset) * 60 * 1000) + (serverOffset* 60  *1000));

            let toDateMatch = new Date(new Date(showDate(new Date(new Date(resDate).getTime() + (parseInt(offset) * 60 * 1000) + (serverOffset* 60  *1000)), "YYYY-MM-DD")+ ' '+endTime).getTime() + (parseInt(addSubtractOffset) * 60  *1000) + (serverOffset* 60  *1000));
            //let toDateMatch = new Date(new Date(endUtc).setDate(new Date(endUtc).getDate() + 1));

            fetchSlots = await Slot.find({
                doctorId: user._id, 
                $or: [
                    {
                        slotDate: {
                            $lt: (toDateMatch)
                        },
                        endDate: {
                            $gt: (fromDateMatch)
                        }
                    }
                ]
            });
            

            if (fetchSlots.length > 0) {
                //match = true;
                fetchSlots.filter(slt => {
                    if (moment(slt.slotDate).format("YYYY-MM-DD 00:00:00") === moment(resDate).format("YYYY-MM-DD 00:00:00")) {
                        var startReqTime = moment(moment.utc(fromDateMatch).format("LT"), "HH:mm")
                        var endReqTime = moment(moment.utc(toDateMatch).format("LT"), "HH:mm")
                        var startSavedTime = moment(moment.utc(slt.startDate).format("LT"), "HH:mm")
                        var endSavedTime = moment(moment.utc(slt.endDate).format("LT"), "HH:mm")

                        if (startReqTime.isBetween(startSavedTime, endSavedTime) || endReqTime.isBetween(startSavedTime, endSavedTime) || startSavedTime.isBetween(startReqTime, endReqTime) || endSavedTime.isBetween(startReqTime, endReqTime) || startReqTime.toString() == startSavedTime.toString() || startReqTime.toString() == endSavedTime.toString() || endReqTime.toString() == startSavedTime.toString() || endReqTime.toString() == endSavedTime.toString()) {
                            match = true;
                        }
                    }
                });
                
            }
            else {
                let utcTimeFormat = resDate;

                slots.map(slotItem => {
                    slotItem.utcTime = moment(utcTimeFormat);
                    utcTimeFormat = moment(utcTimeFormat).add(15, 'minutes');

                })
                slotSave = new Slot({
                    doctorId: user._id,
                    slotDate: resDate,
                    startDate: fromDateMatch,
                    endDate: toDateMatch,
                    time: time,
                    weekDay: moment(resDate).format('dddd'),
                    slots
                });
                await slotSave.save();
                return res.success({}, req.__('Slots created successfully.'));
            }

            if (match && match == true) {
                return res.badRequest({}, "Slots already exist for the given date and time, Please add another or update existing.")
            }
            else {
                let utcNewTimeFormat = resDate;

                slots.map(slotItem => {
                    slotItem.utcTime = moment(utcNewTimeFormat);
                    utcNewTimeFormat = moment(utcNewTimeFormat).add(15, 'minutes');

                });
                slotSave = new Slot({
                    doctorId: user._id,
                    slotDate: resDate,
                    startDate: fromDateMatch,
                    endDate: (toDateMatch),
                    time: time,
                    weekDay: moment(resDate).format('dddd'),
                    slots
                });

                await slotSave.save();
                return res.success(slotSave, req.__('Slot added successfully.'));
            }
        });
    }

    async editSlot(req, res) {

        const { id, date, startTime, endTime, offset } = req.body;
        const { user } = req;
        let serverOffset = new Date().getTimezoneOffset();
        let addSubtractOffset = offset.indexOf("+")  === 0 ? offset.replace("+","-"): offset.replace("-","+");
        let startUtc = new Date(new Date(date +' '+ startTime).getTime() + (parseInt(addSubtractOffset) * 60  *1000) + (serverOffset * 60  *1000));
        let endUtc = new Date(new Date(date+ ' '+endTime).getTime() + (parseInt(addSubtractOffset) * 60  *1000) + (serverOffset* 60  *1000));

        //let addSubtractOffset = offset.indexOf("+") === 0 ? offset.replace("+", "-") : offset.replace("-", "+");

        /* let startUtc = moment.utc(moment(moment(date).format('YYYY-MM-DD') + ' ' + moment(startTime, "hh:mm A").format("HH:mm")).utcOffset(offset))

        let endUtc = moment.utc(moment(moment(date).format('YYYY-MM-DD') + ' ' + moment(endTime, "hh:mm A").format("HH:mm")).utcOffset(offset)) */

        var start = startUtc;
        var current = moment.utc();

        if (moment(moment(startUtc).format('YYYY-MM-DD')).isSame(moment(current.format('YYYY-MM-DD')))) {
            let beginningTime = moment(moment(startUtc, "HH:mm A").format('LT'), 'h:mm a');
            let currTime = moment(moment(current).format('HH:mm A'), 'h:mm a');

            if (beginningTime.isBefore(currTime) || beginningTime.isSame(currTime)) {
                return res.badRequest({}, 'Can not create slots, Please choose another time.');
            }
        }
        if (!moment(startUtc).isAfter(current.format('YYYY-MM-DD')) && !startUtc.isSame(current.format('YYYY-MM-DD'))) {
            return res.badRequest({}, 'Update date should be any future date.');
        }

        const slotFetch = await Slot.findOne({ doctorId: user._id, _id: id });

        if (!slotFetch) {
            return res.notFound({}, 'slot not found.');
        }

        if (startTime.toUpperCase() === endTime.toUpperCase()) {
            return res.badRequest({}, 'Can not create slots between given start and end time, Please choose another time.');
        }

        var isBooked = false;

        slotFetch.slots.filter(nwMi => {
            if (nwMi.isBooked) {
                isBooked = true;
            }
        });

        if (isBooked) {
            return res.badRequest({}, "Can't update, Some slots are booked by doctor.");
        }

        var sTime = moment.utc(startTime, "hh:mm: A");
        var sTimeFormatted = moment.utc(startTime, "hh:mm: A").format('LT');
        var eTimeFormatted = moment.utc(endTime, "hh:mm: A").format('LT');
        var eTime = moment.utc(endTime, "hh:mm: A")
        var time = sTimeFormatted + ' - ' + eTimeFormatted;

        var duration = moment.duration(eTime.diff(sTime));
        var minutes = parseInt(duration.asMinutes());

        var totalSlots = minutes / 15;

        let canCreate = totalSlots % 1 === 0;

        if (!canCreate) {
            return res.badRequest({}, 'cannot create 15 minutes slots with this time, please select another time')
        }

        let slots = [];
        var slotObj = {};
        var match = false;
        var isAlready = false;

        let utcTimeFormat = startUtc;

        for (let i = 1; i <= totalSlots; i++) {
            slotObj = { bookingId: '', utcTime: utcTimeFormat, slotTime: sTimeFormatted + ' - ' + moment(sTimeFormatted, "hh:mm: A").add(15, 'minutes').format('LT'), isBooked: false }
            slots.push(slotObj);
            sTimeFormatted = moment(sTimeFormatted, "hh:mm: A").add(15, 'minutes').format('LT');
            utcTimeFormat = moment(utcTimeFormat).add(15, 'minutes').toISOString();
        }

        if (slots.length == 0) {
            return res.badRequest({}, 'Can not create slots between given start and end time, Please choose another time.');
        }

        /* let fromDate = new Date(slotFetch.slotDate).setHours(0, 0, 0);

        let toDate = new Date(new Date(slotFetch.slotDate).setHours(0, 0, 0)).setDate(new Date(new Date(slotFetch.slotDate).setHours(0, 0, 0)).getDate() + 1); */

        const fetchSamedaySlots = await Slot.find({
            doctorId: user._id,
            _id: { $ne : id },
            $or: [
                {
                    slotDate: {
                        $lt: (endUtc)
                    },
                    endDate: {
                        $gt: (startUtc)
                    }
                }
            ]
        });

        if (fetchSamedaySlots.length > 0) {
            match = true;
            /* fetchSamedaySlots.filter(slt => {
                if (slt._id != id) {
                    var startSavedTime = moment(moment.utc(slt.startDate).format("LT"), "HH:mm")
                    var endSavedTime = moment(moment.utc(slt.endDate).format("LT"), "HH:mm")

                    var startReqTime = moment(moment.utc(startUtc).format("LT"), "HH:mm")
                    var endReqTime = moment(moment.utc(endUtc).format("LT"), "HH:mm")

                    if (startReqTime.isBetween(startSavedTime, endSavedTime) || endReqTime.isBetween(startSavedTime, endSavedTime) || startSavedTime.isBetween(startReqTime, endReqTime) || endSavedTime.isBetween(startReqTime, endReqTime) || startReqTime.toString() == startSavedTime.toString() || startReqTime.toString() == endSavedTime.toString() || endReqTime.toString() == startSavedTime.toString() || endReqTime.toString() == endSavedTime.toString()) {
                        match = true;
                    }
                }
            }); */
        }

        if (match && match == true) {
            return res.badRequest({}, "Slots Already Exist in " + time + ".");
        }
        else {
            if (moment(slotFetch.slotDate).format("YYYY-MM-DD 00:00:00") == moment.utc(date).format("YYYY-MM-DD 00:00:00") || true) {
                var updateStrdt = moment.utc(moment(slotFetch.startDate).format("YYYY-MM-DD") + ' ' + moment(moment.utc(startUtc).format('LT'), "hh:mm A").format("HH:mm"));

                var updateEnddt = moment.utc(moment(slotFetch.endDate).format("YYYY-MM-DD") + ' ' + moment(moment.utc(endUtc).format('LT'), "hh:mm A").format("HH:mm"));

                slotFetch.time = time;
                slotFetch.slots = slots;
                slotFetch.slotDate = startUtc;
                slotFetch.startDate = startUtc;
                slotFetch.endDate = endUtc;
                await slotFetch.save();
                match = false;
                // var isAlready = false;
                return res.success(slotFetch, req.__('Slot time updated.'));
            }
            else {
                if (date) {

                    if (!moment(startUtc).isAfter(current) && !moment(moment(startUtc).format("YYYY-MM-DD")).isSame(current.format("YYYY-MM-DD"))) {
                        return res.badRequest({}, 'Invalid date, Please select another date.');
                    }

                    if (moment(moment(startUtc).format("YYYY-MM-DD")).isSame(current.format("YYYY-MM-DD"))) {

                        let beginningTime = moment(moment(startUtc, "HH:mm A").format('LT'), 'h:mm a');
                        let currTime = moment(moment(current).format('HH:mm A'), 'h:mm a');

                        if (beginningTime.isBefore(currTime) || beginningTime.isSame(currTime)) {
                            return res.badRequest({}, 'Can not create slots, Please choose another time.');
                        }
                    }
                }

                let fromDateSlot = new Date(date).setHours(0, 0, 0);

                let toDateSlot = new Date(new Date(date).setHours(0, 0, 0)).setDate(new Date(new Date(date).setHours(0, 0, 0)).getDate() + 1);

                const checkSlotExist = await Slot.find({
                    doctorId: user._id,
                    slotDate: {
                        // $gte: moment(slotFetch.slotDate).format("YYYY-MM-DD 00:00:00"),
                        // $lt: moment(slotFetch.slotDate).add(1, 'd').format("YYYY-MM-DD 00:00:00")
                        $gte: new Date(fromDateSlot),
                        $lt: new Date(toDateSlot)
                    }
                });

                if (checkSlotExist.length > 0) {
                    checkSlotExist.filter(chkSlt => {
                        var startNewSavedTime = moment(moment.utc(chkSlt.startDate).format("LT"), "HH:mm")
                        var endNewSavedTime = moment(moment.utc(chkSlt.endDate).format("LT"), "HH:mm")
                        var startNewReqTime = moment(moment.utc(startUtc).format("LT"), "HH:mm")
                        var endNewReqTime = moment(moment.utc(endUtc).format("LT"), "HH:mm")

                        if (startNewReqTime.isBetween(startNewSavedTime, endNewSavedTime) || endNewReqTime.isBetween(startNewSavedTime, endNewSavedTime) || startNewSavedTime.isBetween(startNewReqTime, endNewReqTime) || endNewSavedTime.isBetween(startNewReqTime, endNewReqTime) || startNewReqTime.toString() == startNewSavedTime.toString() || startNewReqTime.toString() == endNewSavedTime.toString() || endNewReqTime.toString() == startNewSavedTime.toString() || endNewReqTime.toString() == endNewSavedTime.toString()) {
                            isAlready = true;
                        }
                    });

                }
                else {
                    let updatesStrdt = moment.utc(moment(slotFetch.startDate).format("YYYY-MM-DD") + ' ' + moment(moment.utc(startUtc).format('LT'), "hh:mm A").format("HH:mm"));

                    let updatesEnddt = moment.utc(moment(slotFetch.endDate).format("YYYY-MM-DD") + ' ' + moment(moment.utc(endUtc).format('LT'), "hh:mm A").format("HH:mm"));

                    let slotSave = new Slot({
                        doctorId: user._id,
                        startDate: updatesStrdt,
                        endDate: updatesEnddt,
                        slotDate: startUtc,
                        time: time,
                        weekDay: moment.utc(date).format('dddd'),
                        slots
                    });

                    await slotSave.save();
                    match = false;
                    isAlready = false;
                    await Slot.remove({ _id: id });
                    return res.success(slotSave, req.__('Slot date and time updated.'));
                }

                if (isAlready && isAlready == true) {
                    return res.badRequest({}, "Slots Already Exist on " + moment(date).format("YYYY-MM-DD") + " in " + time + ".");
                }
                else {
                    let updateStrdte = moment.utc(moment(slotFetch.startDate).format("YYYY-MM-DD") + ' ' + moment(moment.utc(startUtc).format('LT'), "hh:mm A").format("HH:mm")).toISOString();

                    let updateEnddte = moment.utc(moment(slotFetch.endDate).format("YYYY-MM-DD") + ' ' + moment(moment.utc(endUtc).format('LT'), "hh:mm A").format("HH:mm")).toISOString()

                    let slotSave = new Slot({
                        doctorId: user._id,
                        startDate: startUtc,
                        endDate: endUtc,
                        slotDate: startUtc,
                        time: time,
                        weekDay: moment.utc(date).format('dddd'),
                        slots
                    });

                    await slotSave.save();
                    match = false;
                    isAlready = false;
                    await Slot.remove({ _id: id });
                    return res.success(slotSave, req.__('Slot date and time updated.'));
                }

            }
        }

    }

    async deleteSlot(req, res) {
        const { id } = req.query;
        const { user } = req;

        const slot = await Slot.findOne({ doctorId: user._id, _id: id });

        if (!slot) {
            return res.notFound({}, 'SLOT_NOT_FOUND.');
        }

        var isBooked = false;

        slot.slots.filter(nwMi => {
            if (nwMi.isBooked) {
                isBooked = true;
            }
        });

        if (isBooked) {
            return res.badRequest({}, "Can't delete, Some slots are booked by doctor.");
        }

        await Slot.remove({ _id: id });
        const findAgain = await Slot.findOne({ doctorId: user._id, _id: id });
        if (!findAgain) {
            return res.success({}, 'Slot deleted successfully.');
        }
        else {
            return res.badRequest({}, 'Something went wrong, Please try again.');
        }

    }

    async createSlot_backup(req, res) {

        var { startDate, endDate, startTime, endTime, weekDays, offset } = req.body;
        const { user } = req;
        if (!user) {
            return res.unauthorized('', req.__('USER_NOT_FOUND'));
        }
        if (!user.accountDetails) {
            return res.badRequest({}, 'Please add bank account details.');
        }
        let serverOffset = new Date().getTimezoneOffset();
        let addSubtractOffset = offset.indexOf("+")  === 0 ? offset.replace("+","-"): offset.replace("-","+");

       /* var startUtc = moment.utc(moment.utc(moment(startDate).format("YYYY-MM-DD") + ' ' + moment(startTime, "HH:mm a").format("HH:mm")).utcOffset(addSubtractOffset).format("YYYY-MM-DD HH:mm"));

        var endUtc = moment.utc(moment.utc(moment(endDate).format("YYYY-MM-DD") + ' ' + moment(endTime, "HH:mm a").format("HH:mm")).utcOffset(addSubtractOffset).format("YYYY-MM-DD HH:mm"));
        */
        let startUtc = new Date(new Date(startDate +' '+ startTime).getTime() + (parseInt(addSubtractOffset) * 60  *1000) + (serverOffset * 60  *1000));

        let endUtc = new Date(new Date(endDate+ ' '+endTime).getTime() + (parseInt(addSubtractOffset) * 60  *1000) + (serverOffset* 60  *1000));

        var start = moment(startDate).format("YYYY-MM-DD");
        var end = moment(endDate);
        var current = moment.utc();

        if (moment(moment(startUtc).format("YYYY-MM-DD")).isSame(moment().format("YYYY-MM-DD"))) {
            var beginningTime = moment(moment(startUtc, "HH:mm A").format('LT'), 'h:mm a');
            var currTime = moment(moment(current).format('HH:mm A'), 'h:mm a');

            if (beginningTime.isBefore(currTime) || beginningTime.isSame(currTime)) {
                return res.badRequest({}, 'Can not create slots in past time, try again with upcoming time.');
            }
        }
        if (!moment(startUtc).isAfter(current) && !moment(moment(startUtc).format("YYYY-MM-DD")).isSame(moment(current).format("YYYY-MM-DD"))) {
            return res.badRequest({}, 'Start date should be any future date.');
        }

        if (moment(endUtc).isBefore(current) && !moment(moment(endUtc).format("YYYY-MM-DD")).isSame(moment(current).format("YYYY-MM-DD"))) {
            return res.badRequest({}, 'End date should be any future date.');
        }

        if (startTime.toUpperCase() === endTime.toUpperCase()) {
            return res.badRequest({}, 'Can not create slots between given start and end time, Please choose another time.');
        }

        //Difference in number of days
        var Difference_In_Time = endUtc.getTime() - startUtc.getTime();
        var Difference_In_Days = Difference_In_Time / (1000 * 3600 * 24);
        var duration = Difference_In_Days + 1;//moment.duration(endUtc.diff(startUtc)).asDays() + 1;
        var result = [];

        var nwDate = startUtc;
        var localNowDate = new Date(new Date(startDate +' '+ startTime).getTime() + (serverOffset * 60  *1000));
        for (let i = 1; i <= parseInt(duration); i++) {
            weekDays.map(day => {
                if (localNowDate.getDay() === parseInt(day)) {
                    result.push(new Date(nwDate));
                }
            });

            localNowDate.setDate(localNowDate.getDate() + 1 );
            nwDate.setDate(nwDate.getDate() + 1 ); //  moment(nwDate).add(1, 'days');
        }
        if (!result.length) {
            return res.badRequest({}, 'Can not find days between given dates, try again with another days.');
        }



        var sTime = moment(startTime, "hh:mm: A");
        var sTimeFormatted = moment(startTime, "hh:mm: A").format('LT');
        var eTimeFormatted = moment(endTime, "hh:mm: A").format('LT');
        var eTime = moment(endTime, "hh:mm: A")
        var time = sTimeFormatted + ' - ' + eTimeFormatted

        var eDuration = moment.duration(eTime.diff(sTime))
        var minutes = parseInt(eDuration.asMinutes());

        var totalSlots = minutes / 15;

        let canCreate = totalSlots % 1 === 0;

        if (!canCreate) {
            return res.badRequest({}, 'cannot create 15 minutes slots with these time, please select another time')
        }
        
        let slots = [];
        var slotObj = {};

        for (let i = 1; i <= totalSlots; i++) {
            slotObj = { 
                bookingId: '', 
                slotTime: sTimeFormatted + ' - ' + moment(sTimeFormatted, "hh:mm: A").add(15, 'minutes').format('LT'), 
                isBooked: false 
            }
            slots.push(slotObj);
            sTimeFormatted = moment(sTimeFormatted, "hh:mm: A").add(15, 'minutes').format('LT');
        }

        if (slots.length == 0) {
            return res.badRequest({}, 'Can not create slots between given start and end time, Please choose another time.');
        }

        
        
        var fetchSlots;
        var slotSave;
        var match = false;

        result.filter(async resDate => {
            let fromDateMatch = new Date(resDate);
            
            new Date(new Date(resDate).getTime() + (parseInt(offset) * 60 * 1000) + (serverOffset* 60  *1000));

            let toDateMatch = new Date(new Date(showDate(new Date(new Date(resDate).getTime() + (parseInt(offset) * 60 * 1000) + (serverOffset* 60  *1000)), "YYYY-MM-DD")+ ' '+endTime).getTime() + (parseInt(addSubtractOffset) * 60  *1000) + (serverOffset* 60  *1000));
            //let toDateMatch = new Date(new Date(endUtc).setDate(new Date(endUtc).getDate() + 1));

            fetchSlots = await Slot.find({
                doctorId: user._id, 
                $or: [
                    {
                        slotDate: {
                            $lt: (toDateMatch)
                        },
                        endDate: {
                            $gt: (fromDateMatch)
                        }
                    }
                ]
            });
            

            if (fetchSlots.length > 0) {
                match = true;
                fetchSlots.filter(slt => {
                    if (moment(slt.slotDate).format("YYYY-MM-DD 00:00:00") === moment(resDate).format("YYYY-MM-DD 00:00:00")) {
                        var startReqTime = moment(moment.utc(fromDateMatch).format("LT"), "HH:mm")
                        var endReqTime = moment(moment.utc(toDateMatch).format("LT"), "HH:mm")
                        var startSavedTime = moment(moment.utc(slt.startDate).format("LT"), "HH:mm")
                        var endSavedTime = moment(moment.utc(slt.endDate).format("LT"), "HH:mm")

                        if (startReqTime.isBetween(startSavedTime, endSavedTime) || endReqTime.isBetween(startSavedTime, endSavedTime) || startSavedTime.isBetween(startReqTime, endReqTime) || endSavedTime.isBetween(startReqTime, endReqTime) || startReqTime.toString() == startSavedTime.toString() || startReqTime.toString() == endSavedTime.toString() || endReqTime.toString() == startSavedTime.toString() || endReqTime.toString() == endSavedTime.toString()) {
                            match = true;
                        }
                    }
                });
                
            }
            else {
                let utcTimeFormat = resDate;

                slots.map(slotItem => {
                    slotItem.utcTime = moment(utcTimeFormat);
                    utcTimeFormat = moment(utcTimeFormat).add(15, 'minutes');

                })
                slotSave = new Slot({
                    doctorId: user._id,
                    slotDate: resDate,
                    startDate: fromDateMatch,
                    endDate: toDateMatch,
                    time: time,
                    weekDay: moment(resDate).format('dddd'),
                    slots
                });
                await slotSave.save();
                return res.success({}, req.__('Slots created successfully.'));
            }

            if (match && match == true) {
                return res.badRequest({}, "Slots already exist for the given date and time, Please add another or update existing.")
            }
            else {
                let utcNewTimeFormat = resDate;

                slots.map(slotItem => {
                    slotItem.utcTime = moment(utcNewTimeFormat);
                    utcNewTimeFormat = moment(utcNewTimeFormat).add(15, 'minutes');

                });
                slotSave = new Slot({
                    doctorId: user._id,
                    slotDate: resDate,
                    startDate: fromDateMatch,
                    endDate: (toDateMatch),
                    time: time,
                    weekDay: moment(resDate).format('dddd'),
                    slots
                });

                await slotSave.save();
                return res.success(slotSave, req.__('Slot added successfully.'));
            }

        });
    }

    async editSlot_backup(req, res) {

        const { id, date, startTime, endTime, offset } = req.body;
        const { user } = req;

        let serverOffset = new Date().getTimezoneOffset();
        let addSubtractOffset = offset.indexOf("+")  === 0 ? offset.replace("+","-"): offset.replace("-","+");

        let startUtc = new Date(new Date(date +' '+ startTime).getTime() + (parseInt(addSubtractOffset) * 60  *1000) + (serverOffset * 60  *1000));

        let endUtc = new Date(new Date(date+ ' '+endTime).getTime() + (parseInt(addSubtractOffset) * 60  *1000) + (serverOffset* 60  *1000));

        //let addSubtractOffset = offset.indexOf("+") === 0 ? offset.replace("+", "-") : offset.replace("-", "+");


        /* let startUtc = moment.utc(moment(moment(date).format('YYYY-MM-DD') + ' ' + moment(startTime, "hh:mm A").format("HH:mm")).utcOffset(offset))

        let endUtc = moment.utc(moment(moment(date).format('YYYY-MM-DD') + ' ' + moment(endTime, "hh:mm A").format("HH:mm")).utcOffset(offset)) */
        var start = startUtc;
        var current = moment.utc();


        if (moment(moment(startUtc).format('YYYY-MM-DD')).isSame(moment(current.format('YYYY-MM-DD')))) {
            let beginningTime = moment(moment(startUtc, "HH:mm A").format('LT'), 'h:mm a');
            let currTime = moment(moment(current).format('HH:mm A'), 'h:mm a');

            if (beginningTime.isBefore(currTime) || beginningTime.isSame(currTime)) {
                return res.badRequest({}, 'Can not create slots, Please choose another time.');
            }
        }
        if (!moment(startUtc).isAfter(current.format('YYYY-MM-DD')) && !startUtc.isSame(current.format('YYYY-MM-DD'))) {
            return res.badRequest({}, 'Update date should be any future date.');
        }

        const slotFetch = await Slot.findOne({ doctorId: user._id, _id: id });

        if (!slotFetch) {
            return res.notFound({}, 'slot not found.');
        }

        if (startTime.toUpperCase() === endTime.toUpperCase()) {
            return res.badRequest({}, 'Can not create slots between given start and end time, Please choose another time.');
        }

        var isBooked = false;

        slotFetch.slots.filter(nwMi => {
            if (nwMi.isBooked) {
                isBooked = true;
            }
        });

        if (isBooked) {
            return res.badRequest({}, "Can't update, Some slots are booked by doctor.");
        }

        var sTime = moment.utc(startTime, "hh:mm: A");
        var sTimeFormatted = moment.utc(startTime, "hh:mm: A").format('LT');
        var eTimeFormatted = moment.utc(endTime, "hh:mm: A").format('LT');
        var eTime = moment.utc(endTime, "hh:mm: A")
        var time = sTimeFormatted + ' - ' + eTimeFormatted;

        var duration = moment.duration(eTime.diff(sTime))
        var minutes = parseInt(duration.asMinutes());

        var totalSlots = minutes / 15;

        let canCreate = totalSlots % 1 === 0;

        if (!canCreate) {
            return res.badRequest({}, 'cannot create 15 minutes slots with this time, please select another time')
        }

        let slots = [];
        var slotObj = {};
        var match = false;
        var isAlready = false;

        let utcTimeFormat = startUtc;


        for (let i = 1; i <= totalSlots; i++) {
            slotObj = { bookingId: '', utcTime: utcTimeFormat, slotTime: sTimeFormatted + ' - ' + moment(sTimeFormatted, "hh:mm: A").add(15, 'minutes').format('LT'), isBooked: false }
            slots.push(slotObj);
            sTimeFormatted = moment(sTimeFormatted, "hh:mm: A").add(15, 'minutes').format('LT');
            utcTimeFormat = moment(utcTimeFormat).add(15, 'minutes').toISOString();
        }

        if (slots.length == 0) {
            return res.badRequest({}, 'Can not create slots between given start and end time, Please choose another time.');
        }

        let fromDate = new Date(slotFetch.slotDate).setHours(0, 0, 0);

        let toDate = new Date(new Date(slotFetch.slotDate).setHours(0, 0, 0)).setDate(new Date(new Date(slotFetch.slotDate).setHours(0, 0, 0)).getDate() + 1);

        const fetchSamedaySlots = await Slot.find({
            doctorId: user._id,
            slotDate: {
                // $gte: moment(slotFetch.slotDate).format("YYYY-MM-DD 00:00:00"),
                // $lt: moment(slotFetch.slotDate).add(1, 'd').format("YYYY-MM-DD 00:00:00")
                $gte: new Date(fromDate),
                $lt: new Date(toDate)
            }
        });

        if (moment(slotFetch.slotDate).format("YYYY-MM-DD 00:00:00") == moment(startUtc).format("YYYY-MM-DD 00:00:00")) {

            fetchSamedaySlots.filter(slt => {
                if (slt._id != id) {
                    var startSavedTime = moment(moment.utc(slt.startDate).format("LT"), "HH:mm")
                    var endSavedTime = moment(moment.utc(slt.endDate).format("LT"), "HH:mm")
                    var startReqTime = moment(moment.utc(startUtc).format("LT"), "HH:mm")
                    var endReqTime = moment(moment.utc(endUtc).format("LT"), "HH:mm")

                    if (startReqTime.isBetween(startSavedTime, endSavedTime) || endReqTime.isBetween(startSavedTime, endSavedTime) || startSavedTime.isBetween(startReqTime, endReqTime) || endSavedTime.isBetween(startReqTime, endReqTime) || startReqTime.toString() == startSavedTime.toString() || startReqTime.toString() == endSavedTime.toString() || endReqTime.toString() == startSavedTime.toString() || endReqTime.toString() == endSavedTime.toString()) {
                        match = true;
                    }
                }
            });
        }

        if (match && match == true) {
            return res.badRequest({}, "Slots Already Exist in " + time + ".");
        }
        else {
            if (moment(slotFetch.slotDate).format("YYYY-MM-DD 00:00:00") == moment.utc(date).format("YYYY-MM-DD 00:00:00")) {
                var updateStrdt = moment.utc(moment(slotFetch.startDate).format("YYYY-MM-DD") + ' ' + moment(moment.utc(startUtc).format('LT'), "hh:mm A").format("HH:mm"));

                var updateEnddt = moment.utc(moment(slotFetch.endDate).format("YYYY-MM-DD") + ' ' + moment(moment.utc(endUtc).format('LT'), "hh:mm A").format("HH:mm"));

                slotFetch.time = time;
                slotFetch.slots = slots;
                slotFetch.slotDate = startUtc;
                slotFetch.startDate = startUtc;
                slotFetch.endDate = endUtc;
                await slotFetch.save();
                match = false;
                // var isAlready = false;
                return res.success(slotFetch, req.__('Slot time updated.'));
            }
            else {
                if (date) {

                    if (!moment(startUtc).isAfter(current) && !moment(moment(startUtc).format("YYYY-MM-DD")).isSame(current.format("YYYY-MM-DD"))) {
                        return res.badRequest({}, 'Invalid date, Please select another date.');
                    }

                    if (moment(moment(startUtc).format("YYYY-MM-DD")).isSame(current.format("YYYY-MM-DD"))) {

                        let beginningTime = moment(moment(startUtc, "HH:mm A").format('LT'), 'h:mm a');
                        let currTime = moment(moment(current).format('HH:mm A'), 'h:mm a');

                        if (beginningTime.isBefore(currTime) || beginningTime.isSame(currTime)) {
                            return res.badRequest({}, 'Can not create slots, Please choose another time.');
                        }
                    }
                }

                let fromDateSlot = new Date(date).setHours(0, 0, 0);

                let toDateSlot = new Date(new Date(date).setHours(0, 0, 0)).setDate(new Date(new Date(date).setHours(0, 0, 0)).getDate() + 1);

                const checkSlotExist = await Slot.find({
                    doctorId: user._id,
                    slotDate: {
                        // $gte: moment(slotFetch.slotDate).format("YYYY-MM-DD 00:00:00"),
                        // $lt: moment(slotFetch.slotDate).add(1, 'd').format("YYYY-MM-DD 00:00:00")
                        $gte: new Date(fromDateSlot),
                        $lt: new Date(toDateSlot)
                    }
                });

                if (checkSlotExist.length > 0) {
                    checkSlotExist.filter(chkSlt => {
                        var startNewSavedTime = moment(moment.utc(chkSlt.startDate).format("LT"), "HH:mm")
                        var endNewSavedTime = moment(moment.utc(chkSlt.endDate).format("LT"), "HH:mm")
                        var startNewReqTime = moment(moment.utc(startUtc).format("LT"), "HH:mm")
                        var endNewReqTime = moment(moment.utc(endUtc).format("LT"), "HH:mm")

                        if (startNewReqTime.isBetween(startNewSavedTime, endNewSavedTime) || endNewReqTime.isBetween(startNewSavedTime, endNewSavedTime) || startNewSavedTime.isBetween(startNewReqTime, endNewReqTime) || endNewSavedTime.isBetween(startNewReqTime, endNewReqTime) || startNewReqTime.toString() == startNewSavedTime.toString() || startNewReqTime.toString() == endNewSavedTime.toString() || endNewReqTime.toString() == startNewSavedTime.toString() || endNewReqTime.toString() == endNewSavedTime.toString()) {
                            isAlready = true;
                        }
                    });

                }
                else {
                    let updatesStrdt = moment.utc(moment(slotFetch.startDate).format("YYYY-MM-DD") + ' ' + moment(moment.utc(startUtc).format('LT'), "hh:mm A").format("HH:mm"));

                    let updatesEnddt = moment.utc(moment(slotFetch.endDate).format("YYYY-MM-DD") + ' ' + moment(moment.utc(endUtc).format('LT'), "hh:mm A").format("HH:mm"));

                    let slotSave = new Slot({
                        doctorId: user._id,
                        startDate: updatesStrdt,
                        endDate: updatesEnddt,
                        slotDate: startUtc,
                        time: time,
                        weekDay: moment.utc(date).format('dddd'),
                        slots
                    });

                    await slotSave.save();
                    match = false;
                    isAlready = false;
                    await Slot.remove({ _id: id });
                    return res.success(slotSave, req.__('Slot date and time updated.'));
                }

                if (isAlready && isAlready == true) {
                    return res.badRequest({}, "Slots Already Exist on " + moment(date).format("YYYY-MM-DD") + " in " + time + ".");
                }
                else {
                    let updateStrdte = moment.utc(moment(slotFetch.startDate).format("YYYY-MM-DD") + ' ' + moment(moment.utc(startUtc).format('LT'), "hh:mm A").format("HH:mm")).toISOString();

                    let updateEnddte = moment.utc(moment(slotFetch.endDate).format("YYYY-MM-DD") + ' ' + moment(moment.utc(endUtc).format('LT'), "hh:mm A").format("HH:mm")).toISOString()

                    let slotSave = new Slot({
                        doctorId: user._id,
                        startDate: startUtc,
                        endDate: endUtc,
                        slotDate: startUtc,
                        time: time,
                        weekDay: moment.utc(date).format('dddd'),
                        slots
                    });

                    await slotSave.save();
                    match = false;
                    isAlready = false;
                    await Slot.remove({ _id: id });
                    return res.success(slotSave, req.__('Slot date and time updated.'));
                }

            }
        }

    }
}

module.exports = new SlotController();
