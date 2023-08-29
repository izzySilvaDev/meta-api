const { sendMailProposal } = require('../lib/sendMailProposal');

module.exports = {
    key: 'sendProposalEmailJob',
    async handle({ data }) {
        await sendMailProposal(data);
    }
}