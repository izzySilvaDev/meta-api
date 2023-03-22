require('dotenv').config();
const Mail = require('../modules/nodemailer');

async function sendMail({ nome, cpf, nascimento, email, whatsApp, estado, cidade, cep, renda, compahia, valor, file } = {}) {

    const mailData = {
        from: 'contato@metasimples.com.br',
		to: 'contato@metasimples.com.br',
		template: 'newUser',
		subject: 'Nova simulação',
		context: { nome, cpf, nascimento, email, whatsApp, estado, cidade, cep, renda, compahia, valor }
    }

    if(file) {
        mailData.attachments = [{
			filename: file.originalname,
			path: file.path
	  	}]
    }

    await Mail.sendMail(mailData);
}

module.exports = { sendMail };