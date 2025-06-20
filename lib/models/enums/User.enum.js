const gender = Object.freeze({
    Male: 'Male',
    Female: 'Female',
    Other: 'Other'
});

const type = Object.freeze({
    Admin: 1,
    Professional: 2,
    User: 3
});

const language = Object.freeze({
    Spanish: 'Spanish',
    English: 'English'
});


module.exports = Object.freeze({
    gender,
    type,
    language
});
