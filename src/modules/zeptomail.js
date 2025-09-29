require('dotenv').config();
const { SendMailClient } = require("zeptomail");
const fs = require("fs");
const path = require("path");
const Handlebars = require("handlebars");

const url = process.env.ZEP_TO_MAIL_API_URL;
const token = process.env.ZEP_TO_MAIL_KEY;

const zepMailClient = new SendMailClient({ url, token });

const sendEmailWithTemplate = async (data, templateName = "newUser") => {
    if(!data || !templateName) return;

    const validTemplates = ["newUser", "proposal"];
    if (!validTemplates.includes(templateName)) return;

    const templatePath = path.join(__dirname, "../resources/mail", `${templateName}.handlebars`);
    const templateSource = fs.readFileSync(templatePath, "utf8");
    const template = Handlebars.compile(templateSource);
    const htmlBody = template(data.context);
    const fromAddress = data.from || 'contato@metasimples.com.br';
    const toAddress = data.to || 'contato@metasimples.com.br';

    const mailData = {
        from: { address: fromAddress, name: 'Meta Simples' },
        to: [{ email_address: { address: toAddress } }],
        reply_to: [{ address: fromAddress, name: 'Meta Simples' }],
        subject: data.subject || 'Nova simulação',
        htmlbody: htmlBody
    };

    await zepMailClient.sendMail(mailData);
};

module.exports = { zepMailClient, sendEmailWithTemplate };

