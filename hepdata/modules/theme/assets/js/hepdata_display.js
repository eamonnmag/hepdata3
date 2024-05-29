import $ from 'jquery'

/*

File for site display helper functions

 */

// We want to run this on load
$(document).ready(function() {
  const list_items = $('#presentations ul li');
  // Initially hide most of the displayed entries!
  list_items.hide().slice(0, 3).show();

  $('#presentation-toggle').click(function() {
      // We use the 4th entry to determine if it's hidden or not.
      if (!list_items.eq(4).is(":visible")) {
        list_items.show();
      } else {
        // Show only 3 results
        list_items.hide().slice(0, 3).show();
      }
  });
});
