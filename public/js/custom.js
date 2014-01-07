var App = App || {};

App = {
  socket: io.connect('/'),

  initialize: function() {
    this.handleBookmark();
    this.handleDragDrop();
    this.handleSockets();
  },

  handleBookmark: function() {
    $('.note .bookmark').on('click', function() {
      $(this).parent().parent().toggleClass('emphasized');
    });
  },

  handleDragDrop: function() {

    var dragSrcEl = null;

    function handleDragStart(e) {

      dragSrcEl = this;
      $(dragSrcEl).css('opacity', '.5');
      $(this).addClass('lifted');
    }

    function handleDragOver(e) {
      if (e.preventDefault) {
        e.preventDefault(); // Necessary. Allows us to drop.
      }

      return false;
    }

    function handleDragEnter(e) {
      // this / e.target is the current hover target.
      //$(e.target).closest('.note-column-inner').addClass('over');
    }

    function handleDragLeave(e) {
      //$(e.target).closest('.note-column-inner').removeClass('over');
    }

    function handleDrop(e) {
      // this/e.target is current target element.
      if (e.stopPropagation) {
        e.stopPropagation(); // Stops some browsers from redirecting.
      }

      // Don't do anything if dropping the same column we're dragging.
      if ($(dragSrcEl).parent() !== this) {
        // Set the source column's HTML to the HTML of the column we dropped on.
        $(dragSrcEl).detach();
        $(this).prepend(dragSrcEl);
        App.socket.emit('dropElement', {noteGuid: $(dragSrcEl).data('guid'), notebookGuid: $(this).parent().data('guid')});
      }

      return false;
    }

    function handleDragEnd(e) {
      // this/e.target is the source node.

        $(dragSrcEl).removeClass('lifted');
        $(dragSrcEl).css('opacity', '1');

      $('.board-column-inner').removeClass('over');
    }

    // Note drag n drop
    $('.note').each(function(index, col) {
      $(col).on('dragstart', handleDragStart);
      $(col).on('dragenter', handleDragEnter);
      $(col).on('dragleave', handleDragLeave);
      $(col).on('dragend', handleDragEnd);
    });

    $('.board-column-inner').on('dragover', handleDragOver);
    $('.board-column-inner').on('drop', handleDrop);

  },

  handleSockets: function() {
    App.socket.on('message', function(message) {
      console.log(message);
    });

    App.socket.on('noteSync', function(data) {
      $('div[data-guid=' + data.result.guid + '] .synced').removeClass('hidden');
      setTimeout(function() {
        $('div[data-guid=' + data.result.guid + '] .synced').addClass('hidden');
      }, 3000);
    });

    // Update note
    App.socket.on('update', function(data) {
      var query = data.query;
      if (query.reason && query.reason === 'update') {
        if (query.guid) {

          // Find note (if one)
          var updatedSrcEl = $('div[data-guid=' + query.guid + ']');

          // Update Notebook
          updatedSrcEl.detach();
          $('div[data-guid=' + query.notebookGuid + '] .board-column-inner').prepend(updatedSrcEl);
        }
      }
    });

    // Create note
    App.socket.on('create', function(data) {
      var query = data.query;
      if (query.reason && query.reason === 'update') {
        if (query.guid) {
          // Todo
          // $('div[data-guid=' + query.notebookGuid + '] .board-column-inner').prepend('<div class="note" data-guid="' + query.noteGuid + '"></div>');
        }
      }
    });
  }

};

$(document).ready(function() {

  App.initialize();

});