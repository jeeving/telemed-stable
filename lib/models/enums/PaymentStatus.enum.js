const PaymentStatus = Object.freeze({
    PENDING:'Pending',
    HOLD: 'hold',
    SUCCESS: 'Success',
    FAILED: 'Failed',
    REFUND: 'Refund',
    REJECT : 'Reject',
    APPROVED : 'Approved'
});

module.exports = PaymentStatus;