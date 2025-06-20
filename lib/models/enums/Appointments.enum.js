const Status = Object.freeze({
    Pending: 0,
    Accepted: 1,
    Rejected: 2,
    Completed: 3,
    Cancelled: 4
});

const CallType = Object.freeze({
    Audio: 0,
    Video: 1
});

const AmountStatus = Object.freeze({
    UnPaid: 0,
    Paid: 1
});

const CallStatus = Object.freeze({
    ringing: 0,
    in_progress: 1,
    completed: 2,
    busy: 3,
    none: 4,
    canceled: 5
});

module.exports = {
    Status,
    CallType,
    AmountStatus,
    CallStatus
}