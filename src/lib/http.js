const axios = require('axios');

axios.defaults.timeout = Number(process.env.HTTP_TIMEOUT_MS) || 30000;

module.exports = axios;
