var App = App || {};

App = {
  socket: io.connect('/'),

  initialize: function() {
    this.handleBookmark();
    this.handleHybernate();
    this.handleModal();
    this.handleDragDrop();
    this.handleSockets();
  },

  handleBookmark: function() {
    $('.note .bookmark').on('click', function() {
      $(this).parent().parent().removeClass('hybernated');
      $(this).parent().parent().toggleClass('emphasized');
    });
  },

  handleHybernate: function() {
    $('.note .hybernate').on('click', function() {
      $(this).parent().parent().removeClass('emphasized');
      $(this).parent().parent().toggleClass('hybernated');
    });
  },

  handleModal: function() {
    $(document).on('shown.bs.modal', function (e) {
      var html;
      if ($(e.relatedTarget).data('action') == 'edit') {

        $.ajax({
          url: '/note/' + $(e.relatedTarget).data('guid'),
          data: {
            format: 'json'
          },
          success: function(result) {
            $('#modalEdit .modal-note-title').html(result.title);
            $('#modalEdit .modal-note-tags').html(result.tags);
            $('#modalSend #modal-note-content').html(result.content).tinymce({
              script_url : '/tinymce/tinymce.min.js',
              skin: 'light',
              menubar: false,
              statusbar: false
            });
          },
          error: function() {

          }
        });

      } else if ($(e.relatedTarget).data('action') == 'send') {

        $.ajax({
          url: '/note/' + $(e.relatedTarget).data('guid'),
          data: {
            format: 'json'
          },
          success: function(result) {
            $('#modalSend .modal-note-title').html(result.title);
            $('#modalSend .modal-note-tags').html(result.tags);
            $('#modalSend #modal-note-content').html(result.content).tinymce({
              script_url : '/tinymce/tinymce.min.js',
              skin: 'light',
              menubar: false,
              statusbar: false
            });
          },
          error: function() {

          }
        });
      } else if ($(e.relatedTarget).data('action') == 'create') {

        $('#modal-note-content', e.target).empty().tinymce({
          script_url : '/tinymce/tinymce.min.js',
          skin: 'light',
          menubar: false,
          statusbar: false
        });

        // Save event
        $('#modalCreate button.create').on('click', function(e) {
          //$('#modalCreate  #modal-note-content').tinymce().destroy();
          var note = {
            title: $('#modalCreate .modal-note-title').val(),
            content: $('#modalCreate #modal-note-content').html()
          };
          $.ajax({
            url: '/note/create',
            type: 'POST',
            dataType: 'json',
            data: {
              note: note
            },
            success: function(data) {
              if (data.success) {
                console.dir('created note');
                $('#modalCreate').modal('hide');
              }
            },
            error: function() {

            }
          });
        });
      }
    });

    $(document).on('hidden.bs.modal', function (e) {
      //$('.modal-note-content').empty();
      $('#modal-note-content').tinymce().destroy();
      // $('.modal-note-title').html('Loading...');
      // $('.modal-note-action').empty();
      // $('.modal-note-tags').empty();
      console.dir(e);
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
        $('.board-column').each(function(index, element) {
          $('.badge', element).html($('.note', element).length);
        });
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

  updateNote: function(data) {

    // Find note (if one)
    var updatedSrcEl = $('div[data-guid=' + data.query.guid + ']');

    // Get Note content
    $.ajax({
      url: '/note/' + data.query.guid,
      data: {
        format: 'json'
      },
      success: function(result) {
        $('.note-title', updatedSrcEl).html(result.title);
        if (result.tags) {
          var html = '';
          result.tags.forEach(function(tag) {
            html += tag + ' ';
          });
          $('.note-tags small', updatedSrcEl).html(html);
        }
        $('.note-content', updatedSrcEl).html(result.content);
        if (updatedSrcEl.parent().parent().data('guid') != result.notebookGuid) {
          updatedSrcEl.detach();
          $('div[data-guid=' + result.notebookGuid + '] .board-column-inner').prepend(updatedSrcEl);
        }
        $('.board-column').each(function(index, element) {
          $('.badge', element).html($('.note', element).length);
        });
      },
      error: function() {
        $('div[data-guid=' + data.query.notebookGuid + '] .board-column-inner').prepend(updatedSrcEl);
        $('.board-column').each(function(index, element) {
          $('.badge', element).html($('.note', element).length);
        });
      }
    });

  },

  createNote: function(data) {

    // Is notebook on board
    if ($('div[data-guid=' + data.query.notebookGuid + ']').length > 0) {

      // Get Note content
      $.ajax({
        url: '/note/' + data.query.guid,
        data: {
          format: 'json'
        },
        success: function(result) {
          var html = '<div class="note" data-guid="' + result.guid + '" draggable="true">';
          html += '<div class="note-updated light">' + result.updated + '</div>';
          html += '<div class="note-actions"><i class="synced fa fa-check-circle hidden"></i><a href="/note/' + result.guid + '" data-toggle="modal" data-target="#modalNote"><i class="fa fa-pencil"></i></a><a href="#" class="bookmark"><i class="bookmark fa fa-bookmark"></i></a><a href="/mail/' + result.guid + '" data-toggle="modal" data-target="#modalNote"><i class="fa fa-envelope"></i></a></div>';
          html += '<h4 class="note-title">' + result.title + '</h4>';
          if (result.tags) {
            html += '<p class="note-tags"><small>';
            result.tags.forEach(function(tag) {
              html += tag + ' ';
            });
            html += '</small></p>';
          }
          html += '<p class="note-content">' + result.content + '</p> ';
          html += '</div>';
          $('div[data-guid=' + result.notebookGuid + '] .board-column-inner').prepend(html);
          $('.board-column').each(function(index, element) {
            $('.badge', element).html($('.note', element).length);
          });
          App.handleDragDrop();
        },
        error: function(error) {
          var html = '<div class="note" data-guid="' + data.query.guid + '">';
          html += '<div class="note-actions"><i class="synced fa fa-check-circle hidden"></i><a href="/note/' + result.guid + '" data-toggle="modal" data-target="#modalNote"><i class="fa fa-pencil"></i></a><a href="#" class="bookmark"><i class="bookmark fa fa-bookmark"></i></a><a href="/mail/' + data.query.guid + '" data-toggle="modal" data-target="#modalNote"><i class="fa fa-envelope"></i></a></div>';
          html += '<h4 class="note-title">' + error + '</h4>';
          html += '</div>';
          $('div[data-guid=' + data.query.notebookGuid + '] .board-column-inner').prepend(html);
          $('.board-column').each(function(index, element) {
            $('.badge', element).html($('.note', element).length);
          });
        }
      });
    }
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

      // Check if note already on board
      if ($('div[data-guid=' + data.query.guid + ']').length > 0) {
        console.log('update note');
        App.updateNote(data);
      } else {
        console.log('create note');
        App.createNote(data);
      }

    });

    // Create note
    App.socket.on('create', function(data) {
      App.createNote(data);
    });
  }
};

$(document).ready(function() {

  App.initialize();

});