const Types = Object.freeze({
    Degree: 0,
    Certificate: 1,
    IdentityCard: 2,
});

const Status = Object.freeze({
    Pending: 0,
    Approved: 1,
    Rejected: 2
});

module.exports = {
    Types,
    Status
}