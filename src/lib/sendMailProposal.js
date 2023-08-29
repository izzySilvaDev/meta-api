require('dotenv').config();
const Mail = require('../modules/nodemailer');

async function sendMailProposal(data = {}) {
    const context = data;

    const mailData = {
        from: 'contato@metasimples.com.br',
		to: 'contato@metasimples.com.br',
		template: 'proposal',
		subject: 'Posposata enviada para análise',
		context: context
    }

    await Mail.sendMail(mailData);
}

module.exports = { sendMailProposal };