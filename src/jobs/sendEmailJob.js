const { sendMail } = require('../lib/sendMail');

module.exports = {
    key: 'sendEmailJob',
    async handle({ data }) {
        await sendMail(data);
    }
}