/**
 * Router
 */

 var passport = require('passport'),
    Evernote = require('evernote').Evernote,
    async = require('async');

module.exports = function(app, io, flowd) {

  function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect('/login');
  }

  // Index routes
  app.get('/', function(req, res, next){

    if (req.user && req.user.evernoteToken) {

      var token = req.user.evernoteToken,
          board = {};

      async.parallel([
        function(callback) {
          var todoFilter = new Evernote.NoteFilter({notebookGuid: req.user.evernoteTodoNotebook}),
              obj = {};
          flowd.getNotes(req.user, todoFilter, function(err, result) {
            obj = {
              title: 'Todo',
              guid: req.user.evernoteTodoNotebook,
              content: result
            };
            callback(null, obj);
          });
        },
        function(callback) {
          var inProgressFilter = new Evernote.NoteFilter({notebookGuid: req.user.evernoteInProgressNotebook}),
              obj = {};
          flowd.getNotes(req.user, inProgressFilter, function(err, result) {
            obj = {
              title: 'In Progress',
              guid: req.user.evernoteInProgressNotebook,
              content: result
            };
            callback(null, obj);
          });
        },
        function(callback) {
          var testFilter = new Evernote.NoteFilter({notebookGuid: req.user.evernoteTestNotebook}),
              obj = {};
          flowd.getNotes(req.user, testFilter, function(err, result) {
            obj = {
              title: 'Test',
              guid: req.user.evernoteTestNotebook,
              content: result
            };
            callback(null, obj);
          });
        },
        function(callback) {
          var doneFilter = new Evernote.NoteFilter({notebookGuid: req.user.evernoteDoneNotebook}),
              obj = {};
          flowd.getNotes(req.user, doneFilter, function(err, result) {
            var obj = {
              title: 'Done',
              guid: req.user.evernoteDoneNotebook,
              content: result
            };
            callback(null, obj);
          });
        },
      ], function(err, results) {
        res.render('index', { user: req.user, board: results });
      });

      io.sockets.on('connection', function(socket) {
        socket.on('dropElement', function(data) {
          if (data) {
            flowd.updateNote(req.user, data.noteGuid, data.notebookGuid, function(err, result, note) {
              if (err) {
                console.error(err);
                return;
              }
              socket.emit('noteSync', { result: result });
            });
          }
        });
      });

    } else {
      res.render('index');
    }

  });

  // Webhook route
  app.get('/hook', function(req, res) {
    if (req.query.reason && req.query.reason == 'update') {
      io.sockets.emit('update', { query: req.query });
      res.render('index');
    } else if (req.query.reason && req.query.reason == 'create') {
      io.sockets.emit('create', { query: req.query });
      res.render('index');
    } else {
      res.render('index');
    }
  });

  // Signup routes
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
      res.redirect('/signup', { user: req.user, message: req.session.messages });
    }
  });

  // Account routes
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

  app.post('/account/:action', function(req, res, next){
    if (req.param('action') == 'config') {
      if (req.body.evernoteTodoNotebook && req.body.evernoteInProgressNotebook && req.body.evernoteTestNotebook && req.body.evernoteDoneNotebook) {
        User.findOne({username: req.user.username}, function (err, user) {
          user.evernoteTodoNotebook = req.body.evernoteTodoNotebook;
          user.evernoteInProgressNotebook = req.body.evernoteInProgressNotebook;
          user.evernoteTestNotebook = req.body.evernoteTestNotebook;
          user.evernoteDoneNotebook = req.body.evernoteDoneNotebook;
          user.save(function (err) {
            if(err) {
              console.error(err);
              return next(err);
            }
            res.redirect('/account');
          });
        });
      } else {
        res.redirect('/account'); //, { user: req.user, message: req.session.messages });
      }
    } else if (req.param('action') == 'delete') {

      // Todo: confirmation
      User.findOne({username: req.user.username}, function (err, user) {
        user.remove(function (err) {
          if(err) {
            console.error(err);
            return next(err);
          }
          res.redirect('/');
        });
      });
    } else {
      res.redirect('/account'); //, { user: req.user, message: req.session.messages });
    }
  });


  // Login routes
  app.get('/login', function(req, res){
    res.render('login', { user: req.user, message: req.session.messages });
  });

  app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }), function(req, res) {
    res.redirect('/');
  });


  // Logout route
  app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
  });


  // Evernote routes
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


  // Mail node partial
  app.get('/mail/:note', function(req, res, next){
    if(req.user && req.user.evernoteToken) {
      var client = new Evernote.Client({
            token: req.user.evernoteToken,
            sandbox: true
          }),
          noteStore = client.getNoteStore();

      // Get note with content
      noteStore.getNote(req.user.evernoteToken, req.param('note'), true, false, false, false, function(err, note){
        if (err) {
          console.error(err);
          return next(err);
        }
        // var $ = cheerio.load(note.content);
        // $('en-note div').html()
        res.render('mail', { user: req.user, note: note, layout: 'mail'});
      });

    } else {
      res.redirect('/login');
    }
  });


  // Edit node partial
  app.get('/note/:note', function(req, res, next){
    if(req.user && req.user.evernoteToken) {
      var client = new Evernote.Client({
            token: req.user.evernoteToken,
            sandbox: true
          }),
          noteStore = client.getNoteStore();

      // Get note with content
      noteStore.getNote(req.user.evernoteToken, req.param('note'), true, false, false, false, function(err, note){
        if (err) {
          console.error(err);
          return next(err);
        }
        // var $ = cheerio.load(note.content);
        // $('en-note div').html()
        res.render('note', { user: req.user, note: note, layout: 'note'});
      });

    } else {
      res.redirect('/login');
    }
  });
};