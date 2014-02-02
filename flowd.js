/**
 * Flowd
 */

var Evernote = require('evernote').Evernote,
    async = require('async'),
    cheerio = require('cheerio'),
    string = require('string');

module.exports = function() {
  var flowd = flowd || {};
  flowd = {

  // Get single
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

    // Get all
    getNotes: function (user, noteFilter, callback) {
      var token = user.evernoteToken,
          client = new Evernote.Client({
                token: token,
                sandbox: true
          }),
          noteStore = client.getNoteStore();
          noteSpec = new Evernote.NotesMetadataResultSpec({includeTitle: true, includeNotebookGuid: true, includeUpdated: true});

      noteStore.findNotesMetadata(token, noteFilter, 0, 100, noteSpec, function(err, result) {
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
                note.content = string(note.content).stripTags().s;
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

    // Update
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
            if (err) {
              callback(err, result);
            } else {
              var updatedNote = result;
              updatedNote.notebookGuid = notebook; // update notebook guid
              callback(null, updatedNote);
            }
          });
        },
        function(updatedNote, callback) {
          if (err) {
            callback(err, updateNote);
          } else {
            noteStore.updateNote(token, updatedNote, function(err, result) {
              callback(err, result);
            });
          }
        }
      ], function(err, result) {
        if (err) {
          console.error(err);
          return;
        }
        // Successfully updated
        callback(null, result);
      });
    }
  };

  return flowd;
};