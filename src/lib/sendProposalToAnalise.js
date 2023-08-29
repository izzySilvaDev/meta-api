const { getToken } = require('../functions/contaLuz');
const axios = require('axios');

const apiCredentials = {};

async function sendProposalToAnalise(userData) {       
    if(!apiCredentials?.token) await getToken(apiCredentials);    
    const currentDay = new Date();
    const expiresDay = new Date(apiCredentials.expires);
    if(currentDay >= expiresDay) await getToken(apiCredentials);
    
    await axios.put(`${process.env.CREFAZ_BASE_URL}/api/Proposta/${userData.id}`, userData, {
        headers: {
            'Authorization': `Bearer ${apiCredentials?.token}`
        }
    });
}


module.exports = { sendProposalToAnalise };