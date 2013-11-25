var passport = require('passport'),
    Evernote = require('evernote').Evernote,
    async = require('async'),
    cheerio = require('cheerio');

module.exports = function(app, User) {

  app.get('/', function(req, res, next){
    if(req.user && req.user.evernoteToken && req.user.evernoteNotebook) {
      var client = new Evernote.Client({
        token: req.user.evernoteToken,
        sandbox: true
      });
      var noteStore = client.getNoteStore();
      var noteFilter = new Evernote.NoteFilter({notebookGuid: req.user.evernoteNotebook});
      noteStore.findNotes(req.user.evernoteToken, noteFilter, 0, 100, function(err, result) {
        console.log(result);
        if (err) {
          console.error(err);
          return next(err);
        }
        if (result.totalNotes > 0) {
          var notes = result.notes;
          var notesLibrary =  {
            getContent: function(note, callback) {
              noteStore.getNoteContent(req.user.evernoteToken, note.guid, function(err, content) {
                var $ = cheerio.load(content);
                note.content = $('en-note div').html();
                callback(err, note);
              });
            },
            getTags: function(note, callback) {
              noteStore.getNoteTagNames(req.user.evernoteToken, note.guid, function(err, tags) {
                note.tags = tags;
                callback(err, note);
              });
            }
          };
          async.map(notes, notesLibrary.getContent, function(err, notesWithContent){
            if (err) {
              console.error(err);
              return next(err);
            }
            async.map(notesWithContent, notesLibrary.getTags, function(err, notesWithContentAndTags){
              if (err) {
                console.error(err);
                return next(err);
              }
              res.render('index', { user: req.user, notes: notesWithContentAndTags });
            });
          });

        }

      });
    } else {
      res.render('index', { user: req.user });
    }
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
          return next(err);
        }
        req.login(newUser, function (err) {
          if (err) {
            console.error(err);
            return next(err);
          }
          res.redirect('/');
        });
      });
    } else {
      // todo
    }
  });

  app.get('/account', ensureAuthenticated, function(req, res){
    if(req.user && req.user.evernoteToken) {
      var client = new Evernote.Client({
        token: req.user.evernoteToken,
        sandbox: true
      });
      var noteStore = client.getNoteStore();
      noteStore.listNotebooks(function(err, notebooks){
        res.render('account', {user: req.user, notebooks: notebooks});
      });
    } else {
      res.render('account', { user: req.user });
    }
  });
    app.post('/account', function(req, res, next){
    if (req.body.evernoteNotebook) {
      User.findOne({username: req.user.username}, function (err, user) {
        user.evernoteNotebook = req.body.evernoteNotebook;
        user.save(function (err) {
          if(err) {
            console.error(err);
            return next(err);
          }
          res.redirect('/account');
        });
      });
    } else {
      // todo
    }
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
};
