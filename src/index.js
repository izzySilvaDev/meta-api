const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const api = require('./api');
const morgan = require('morgan');

require('dotenv').config();

const app = express();

const development = process.env.NODE_ENV !== 'production';
const allowedOrigins = process.env.ALLOW_ORIGINS ? process.env.ALLOW_ORIGINS.split(',') : [];

const corsOptions = {
    origin: function (origin, callback) {
        // in development allow all origins
        if (development) {
            callback(null, true)
        } // in production only allow requests from allowed origins
        else if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS', { cause: "cors"}), false);
        }
    },
    optionsSuccessStatus: 200,
}

app.use(helmet());
app.set('trust proxy', 1);
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))

// routes without cors
router.post('/webhook', (req, res) => {
  console.log('webhook', req.body);
  return res.json({ ok: true });
});

app.get('/', (req, res) => {
    res.json({ ok: true })
});

// all routes below have cors
app.use(cors(corsOptions));

app.use('/api/', api);

app.use((err, req, res, next) => {
    console.error(err?.message);
    if (err.cause === "cors") {
        return res.status(403).json({ message: err.message });
    }
    res.status(500).json({ message: 'Internal server error' });
})

const PORT = process.env.PORT || 3000;

app.listen(PORT, console.log(`app is running ${PORT}`));