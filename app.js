/**
 * App
 */

var express = require('express'),
    http = require('http'),
    exphbs  = require('express3-handlebars'),
    path = require('path'),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    EvernoteStrategy = require('passport-evernote').Strategy,
    flash = require('connect-flash'),
    mongodb = require('mongodb'),
    mongoose = require('mongoose'),
    bcrypt = require('bcrypt'),
    moment = require('moment'),
    SALT_WORK_FACTOR = 10,
    hbs;


// Database connection
var mongoUri = process.env.MONGOLAB_URI ||
    process.env.MONGOHQ_URL ||
    'mongodb://localhost/mydb',
    db;

mongoose.connect(mongoUri);
db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback() {
  console.log('Connected to DB');
});

// User Schema
var userSchema = mongoose.Schema({
  username: {type: String, required: true, unique: true},
  email: {type: String, required: true, unique: true},
  password: {type: String, required: true},
  evernoteToken: {type: String, required: false},
  evernoteTodoNotebook: {type: String, required: false},
  evernoteInProgressNotebook: {type: String, required: false},
  evernoteTestNotebook: {type: String, required: false},
  evernoteDoneNotebook: {type: String, required: false},
});

var noteSchema = mongoose.Schema({
  guid: {type: String, required: true, unique: true},
  content: {type: String, required: true}
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


// Create user from schema
var User = mongoose.model('User', userSchema);

// User.collection.drop(); // Maintainance

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
  User.findOne({username: username}, function(err, user) {
    if (err) {
      return done(err);
    }
    if (!user) {
      return done(null, false, {message: 'Unknown user ' + username});
    }
    user.comparePassword(password, function(err, isMatch) {
      if (err) {
        return done(err);
      }
      if(isMatch) {
        return done(null, user);
      } else {
        return done(null, false, {message: 'Invalid password'});
      }
    });
  });
}));


// Evernote app configuration
passport.use(new EvernoteStrategy({
    requestTokenURL: 'https://sandbox.evernote.com/oauth',
    accessTokenURL: 'https://sandbox.evernote.com/oauth',
    userAuthorizationURL: 'https://sandbox.evernote.com/OAuth.action',
    consumerKey: 'ivohanke-5271',
    consumerSecret: '17d4bc3c8a32d092',
    callbackURL: '/auth/evernote/callback'
  },
  function(token, tokenSecret, profile, done) {
    process.nextTick(function () {
      return done(null, token);
    });
  }
));

// Handelbars config
hbs = exphbs.create({
  layoutsDir:'views/layouts/',
  partialsDir:'views/partials/',
  defaultLayout: 'index',
  extname:'.handlebars',
  helpers: {
    compare: function (lvalue, operator, rvalue, options) {

      var operators, result;

      if (arguments.length < 3) {
        throw new Error('Handlerbars Helper "compare" needs 2 parameters');
      }

      if (options === undefined) {
        options = rvalue;
        rvalue = operator;
        operator = '===';
      }

      operators = {
        '==': function (l, r) { return l == r; },
        '===': function (l, r) { return l === r; },
        '!=': function (l, r) { return l != r; },
        '!==': function (l, r) { return l !== r; },
        '<': function (l, r) { return l < r; },
        '>': function (l, r) { return l > r; },
        '<=': function (l, r) { return l <= r; },
        '>=': function (l, r) { return l >= r; },
        'typeof': function (l, r) { return typeof l == r; }
      };

      if (!operators[operator]) {
        throw new Error('Handlerbars Helper "compare" doesn`t know the operator ' + operator);
      }

      result = operators[operator](lvalue, rvalue);

      if (result) {
        return options.fn(this);
      } else {
        return options.inverse(this);
      }
    },

    formatDate: function(datetime) {
      if (arguments.length < 1) {
        throw new Error('Handlerbars Helper "formatDate" needs a parameter');
      }
      return moment(datetime).calendar();
    }
  }
});


// Server
var app = express(),
    server = http.createServer(app);

app.configure(function() {
  app.set('port', process.env.PORT || 5000);
  app.engine('handlebars', hbs.engine);
  app.set('view engine', 'handlebars');
  app.locals.pretty = true;
  app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({secret: 'keyboard cat'}));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(flash());
  app.use(express.static(__dirname + '/public'));
  app.use(app.router);
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});



// Modules
var io = require('socket.io').listen(server),
    flowd = require('./flowd')();

//Router
require('./router')(app, io, flowd, User);

// Sockets
io.sockets.on('connection', function(socket) {
  socket.send('Connected to Server!');
});