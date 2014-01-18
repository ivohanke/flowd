/**
 * Flowd
 */

var Evernote = require('evernote').Evernote,
    async = require('async'),
    cheerio = require('cheerio');

module.exports = function() {
  var flowd = flowd || {};
  flowd = {

  // Function to
    getNote: function (user, guid, callback) {
      var token = user.evernoteToken,
          client = new Evernote.Client({
                token: token,
                sandbox: true
          }),
          noteStore = client.getNoteStore();

      noteStore.getNote(token, guid, 1, 0, 0, 0, function(err, note) {
        if (err) {
          console.error(err);
          return;
        }
        var $ = cheerio.load(note.content);
            note.content = $('en-note div').html();

        if (note.tagGuids) {
          noteStore.getNoteTagNames(token, guid, 1, 0, 0, 0, function(err, tags) {
            if (err) {
              console.error(err);
              return;
            }
            note.tags = tags;
            callback(null, note);
          });
        } else {
          callback(null, note);
        }
      });
    },

    // Function to
    getNotes: function (user, noteFilter, callback) {
      var token = user.evernoteToken,
          client = new Evernote.Client({
                token: token,
                sandbox: true
          }),
          noteStore = client.getNoteStore();

      noteStore.findNotes(token, noteFilter, 0, 100, function(err, result) {
        if (err) {
          console.error(err);
          return;
        }
        if (result.totalNotes > 0) {
          var notes = result.notes;
          //console.dir(notes);
          var notesLibrary =  {
            getContent: function(note, callback) {
              noteStore.getNoteContent(token, note.guid, function(err, content) {
                var $ = cheerio.load(content);
                note.content = $('en-note div').html();
                callback(err, note);
              });
            },
            getTags: function(note, callback) {
              noteStore.getNoteTagNames(token, note.guid, function(err, tags) {
                note.tags = tags;
                callback(err, note);
              });
            }
          };
          async.map(notes, notesLibrary.getContent, function(err, notesWithContent){
            if (err) {
              console.error(err);
              return;
            }
            async.map(notesWithContent, notesLibrary.getTags, function(err, notesWithContentAndTags){
              if (err) {
                console.error(err);
                return;
              }
              callback(null, notesWithContentAndTags);
            });
          });
        } else {
          callback(null, {});
        }
      });
    },

    // Update note
    updateNote: function(user, note, notebook, callback) {
      var token = user.evernoteToken,
          client = new Evernote.Client({
                token: token,
                sandbox: true
          }),
          noteStore = client.getNoteStore();

      async.waterfall([
        function(callback) {
          noteStore.getNote(token, note, false, false, false, false, function(err, result) {
            callback(null, result);
          });
        },
        function(note, callback) {
          var updatedNote = note;
          updatedNote.notebookGuid = notebook; // update notebook guid
          noteStore.updateNote(token, updatedNote, function(err, result) {
            callback(null, result);
          });
        }
      ], function(err, result) {
        // Successfully updated
        if (err) {
          console.error(err);
          return;
        }
        callback(null, result);
      });
    }
  };

  return flowd;
};