require('dotenv').config();
const Mail = require('../modules/nodemailer');

async function sendMail({ nome, cpf, nascimento, email, whatsApp, estado, cidade, cep, renda, compahia, valor, files } = {}) {

    const mailData = {
        from: 'contato@metasimples.com.br',
		to: 'izaiascrs@gmail.com',
		template: 'newUser',
		subject: 'Nova simulação',
		context: { nome, cpf, nascimento, email, whatsApp, estado, cidade, cep, renda, compahia, valor }
    }

    if(files) {
        mailData.attachments = files.map((file) => ({ filename: file.originalname, path: file.path }));
    }

    await Mail.sendMail(mailData);
}

module.exports = { sendMail };