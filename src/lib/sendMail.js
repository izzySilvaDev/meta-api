require('dotenv').config();
const { sendEmailWithTemplate } = require('../modules/zeptomail');

async function sendMail({ nome, cpf, nascimento, email, whatsApp, estado, cidade, cep, renda, compahia, valor, files } = {}) {

    const mailData = {
        from: 'contato@metasimples.com.br',
		to: 'contato@metasimples.com.br',
		template: 'newUser',
		subject: 'Nova simulação',
		context: { nome, cpf, nascimento, email, whatsApp, estado, cidade, cep, renda, compahia, valor }
    }

    if(files) {
        mailData.attachments = files.map((file) => ({ filename: file.originalname, path: file.path }));
    }

    await sendEmailWithTemplate(mailData, 'newUser');

}

module.exports = { sendMail };