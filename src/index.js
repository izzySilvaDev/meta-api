const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const api = require("./api");
const morgan = require("morgan");

const { createBullBoard } = require("@bull-board/api");
const { BullAdapter } = require("@bull-board/api/bullAdapter");
const { ExpressAdapter } = require("@bull-board/express");
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { ensureLoggedIn } = require('connect-ensure-login');
const { RedisStore } = require('connect-redis');
const { createClient } = require('redis');


const {
  uploadQueue,
  updateUserQueue,
  uploadImageToApiQueue,
  sendEmailQueue,
  sendProposalToAnaliseQueue,
  sendProposalMailQueue,
} = require("./lib/Queue");

require("dotenv").config();


const app = express();

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/ui");

const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`,
});
redisClient.connect().catch(err => console.error('Redis error', err));

createBullBoard({
  queues: [
    new BullAdapter(uploadQueue),
    new BullAdapter(updateUserQueue),
    new BullAdapter(uploadImageToApiQueue),
    new BullAdapter(sendEmailQueue),
    new BullAdapter(sendProposalToAnaliseQueue),
    new BullAdapter(sendProposalMailQueue),
  ],
  serverAdapter,
});

const development = process.env.NODE_ENV !== "production";
const allowedOrigins = process.env.ALLOW_ORIGINS
  ? process.env.ALLOW_ORIGINS.split(",")
  : [];

const corsOptions = {
  origin: function (origin, callback) {
    // in development allow all origins
    if (development) {
      callback(null, true);
    } // in production only allow requests from allowed origins
    else if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS", { cause: "cors" }), false);
    }
  },
  optionsSuccessStatus: 200,
};

// Configure the local strategy for use by Passport.
//
// The local strategy require a `verify` function which receives the credentials
// (`username` and `password`) submitted by the user.  The function must verify
// that the password is correct and then invoke `cb` with a user object, which
// will be set at `req.user` in route handlers after authentication.
passport.use(
  new LocalStrategy(function (username, password, cb) {
		const validUsername = process.env.BULL_BOARD_USERNAME || 'admin';
		const validPassword = process.env.BULL_BOARD_PASSWORD || 'admin';
    if (username === validUsername && password === validPassword) {
      return cb(null, { user: 'bull-board' });
    }
    return cb(null, false);
  })
);

// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  The
// typical implementation of this is as simple as supplying the user ID when
// serializing, and querying the user record by ID from the database when
// deserializing.
passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.use(helmet());
app.set("trust proxy", 1);
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET || 'troque_para_um_valor_secreto',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: !development,      // true em produção (HTTPS)
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));
app.use(passport.initialize());
app.use(passport.session());

// routes without cors
app.post("/webhook", (req, res) => {
  console.log("webhook", req.body);
  return res.json({ ok: true });
});

app.get("/", (req, res) => {
  res.json({ ok: true });
});

app.get('/ui/login', (req, res) => {
	res.render('login', { invalid: req.query.invalid === 'true' });
});

app.post(
	'/ui/login',
	passport.authenticate('local', { failureRedirect: '/ui/login?invalid=true' }),
	(req, res) => {
		res.redirect('/ui');
	}
);

app.use('/ui', ensureLoggedIn({ redirectTo: '/ui/login' }), serverAdapter.getRouter());

// all routes below have cors
app.use(cors(corsOptions));

app.use("/api/", api);

app.use((err, req, res, next) => {
  console.error(err?.message);
  if (err.cause === "cors") {
    return res.status(403).json({ message: err.message });
  }
  res.status(500).json({ message: "Internal server error" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, console.log(`app is running ${PORT}`));
