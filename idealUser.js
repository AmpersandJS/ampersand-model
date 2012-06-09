var MyModel = Shave.Model.extend({
    props: {
        firstName: ['string', true],
        lastName: ['string', true],
        age: ['number', false, 12],
        awesome: ['bool', false, null, true],
        hairColors: 'array',
        meta: {
            type: 'object'
        },
        favoriteColor: {
            type: 'string',
            default: 'blue',
            validator: function (val) {
                return _.contains(['red', 'green', 'blue'], val);
            },
            required: true,
            local: false
        },
        birthDate: 'date'
    },
    derived: {
        fullName: ['firstName', 'lastName']
    },
    fullName: function () {
        return this.get('firstName') + ' ' + this.get('lastName');
    }
});