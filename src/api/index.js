const express = require('express');

const contaLuzRouter = require('./contaLuz');
const fgtsRouter = require('./fgts');
const creafazRouter = require('./crefazOn');

const router = express.Router();

router.get('/', (req, res) => {
    return res.json({ message: 'router api ok!' });
});

router.use('/conta-luz', contaLuzRouter);
router.use('/fgts', fgtsRouter);
router.use('/crefaz', creafazRouter);

module.exports = router;