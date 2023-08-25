const { sendProposalToAnalise } = require('../lib/sendProposalToAnalise');

module.exports = {
    key: 'sendProposalToAnaliseJob',
    async handle({ data }) {
        await sendProposalToAnalise(data);
    }
}