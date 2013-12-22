// Foundation JavaScript
// Documentation can be found at: http://foundation.zurb.com/docs
var socket = io.connect('http://localhost:5000');

$(document).foundation();

$(document).ready(function() {

  var dragSrcEl = null;

  function handleDragStart(e) {

    dragSrcEl = this;
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
      console.dir(this);
      socket.emit('dropElement', {noteGuid: $(dragSrcEl).data('guid'), notebookGuid: $(this).parent().data('guid')});
    }

    return false;
  }

  function handleDragEnd(e) {
    // this/e.target is the source node.

      $(dragSrcEl).removeClass('lifted');
      //$(dragSrcEl).css('opacity', '1');

    $('.note-column-inner').removeClass('over');
  }

  $('.note').each(function(index, col) {
    $(col).on('dragstart', handleDragStart);
    $(col).on('dragenter', handleDragEnter);
    $(col).on('dragleave', handleDragLeave);
    $(col).on('dragend', handleDragEnd);
  });
  $('.note-column-inner').on('dragover', handleDragOver);
  $('.note-column-inner').on('drop', handleDrop);
  socket.on('dropElementSuccess', function() {
    // Todo: user feedback;
  });
});