
/**
 * Module dependencies.
 */

var express = require('express'),
    routes = require('./routes'),
    http = require('http'),
    path = require('path'),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    EvernoteStrategy = require('passport-evernote').Strategy,
    mongodb = require('mongodb'),
    mongoose = require('mongoose'),
    bcrypt = require('bcrypt'),
    SALT_WORK_FACTOR = 10,

    EVERNOTE_CONSUMER_KEY = "ivohanke-5271",
    EVERNOTE_CONSUMER_SECRET = "17d4bc3c8a32d092";

// Database
mongoose.connect('localhost', 'test');
var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback() {
  console.log('Connected to DB');
});

// User Schema
var userSchema = mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true},
  evernoteToken: {type: String, required: false}
});

// Bcrypt middleware
userSchema.pre('save', function(next) {
  var user = this;

  if(!user.isModified('password')) {
    return next();
  }

  bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
    if(err) {
      return next(err);
    }

    bcrypt.hash(user.password, salt, function(err, hash) {
      if(err) {
        return next(err);
      }
      user.password = hash;
      next();
    });
  });
});

// Password verification
userSchema.methods.comparePassword = function(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
    if(err) {
      return cb(err);
    }
    cb(null, isMatch);
  });
};

// Create user
var User = mongoose.model('User', userSchema);

// Passport session setup.
passport.serializeUser(function(user, done) {
  done(null, user._id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function (err, user) {
    if (err) {
      done(null, user);
    } else {
      done(err, user);
    }
  });
});

passport.use(new LocalStrategy(function(username, password, done) {
  User.findOne({ username: username }, function(err, user) {
    if (err) {
      return done(err);
    }
    if (!user) {
      return done(null, false, { message: 'Unknown user ' + username });
    }
    user.comparePassword(password, function(err, isMatch) {
      if (err) {
        return done(err);
      }
      if(isMatch) {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Invalid password' });
      }
    });
  });
}));


// Evernote Authentication
passport.use(new EvernoteStrategy({
    requestTokenURL: 'https://sandbox.evernote.com/oauth',
    accessTokenURL: 'https://sandbox.evernote.com/oauth',
    userAuthorizationURL: 'https://sandbox.evernote.com/OAuth.action',
    consumerKey: EVERNOTE_CONSUMER_KEY,
    consumerSecret: EVERNOTE_CONSUMER_SECRET,
    callbackURL: "http://localhost:3000/auth/evernote/callback"
  },
  function(token, tokenSecret, profile, done) {
    process.nextTick(function () {
      return done(null, token);
    });
  }
));




var app = express();

app.configure(function() {
  app.set('port', 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.engine('ejs', require('ejs-locals'));
  app.locals.pretty = true;
  app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: 'keyboard cat' }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

// Router
app.get('/', function(req, res){
  res.render('index', { user: req.user });
});

app.get('/signup', function(req, res){
  res.render('signup');
});

app.post('/signup', function(req, res, next){
  if (req.body.username && req.body.email && req.body.password) {
    var newUser = new User(req.body);
    newUser.save(function (err) {
      if (err) {
        console.error(err);
      } else {
        req.login(newUser, function (err) {
          if (err) {
            console.error(err);
          }
          res.redirect('/');
        });
      }
    });
  } else {
    // todo
  }
});

app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account', { user: req.user });
});

app.get('/login', function(req, res){
  res.render('login', { user: req.user, message: req.session.messages });
});

app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }), function(req, res) {
  res.redirect('/');
});

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

app.get('/auth/evernote', passport.authenticate('evernote'), function(req, res){
  // The request will be redirected to Evernote for authentication, so this
  // function will not be called.
});

app.get('/auth/evernote/callback', function(req, res, next) { passport.authenticate('evernote',
  function(err, token) {
    User.findOne({username: req.user.username}, function (err, user) {
      user.evernoteToken = token;
      user.save(function (err) {
        if(err) {
          console.error(err);
        } else {
          res.redirect('/account');
        }
      });
    });
  })(req, res, next);
});

app.post('/login', function(req, res, next) { passport.authenticate('local', function(err, user, info) {
//app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }), function(req, res) {
  res.redirect('/account');
})(req, res, next);
});

app.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});