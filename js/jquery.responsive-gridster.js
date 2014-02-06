(function($) {
  var extensions = {
    resize_widget_dimensions: function(widget, options) {
		var wid_margins, wid_base_dimensions, min_wid_height, min_wid_width;
		var $cur_widget = $(widget);

		if (options.widget_margins)
			wid_margins = options.widget_margins;

		if (options.widget_base_dimensions)
			wid_base_dimensions = options.widget_base_dimensions;

		min_wid_width = (wid_margins[0] * 2) + wid_base_dimensions[0];
		min_wid_height = (wid_margins[1] * 2) + wid_base_dimensions[1];


		$cur_widget.css('width', wid_base_dimensions[0]);

		return false;
    },
    /**
	* Move the specified widget to a specific location on the grid.
	*
	* @method move_widget_sl
	* @param {jQuery} $widget the jQuery object representing the widget
	*  you want to move. 
	* @param {Number} row The specific row to move the widget to.
	* @param {Number} col The specific column to move the widget to.
	* @return {Class} Returns the instance of the Gridster Class.
    */
    move_widget_sl: function($widget, row, col) {
		var self = this,
			widget_grid_data = $widget.coords().grid,
			xdiff = col - widget_grid_data.col - widget_grid_data.size_x,
			ydiff = row - widget_grid_data.row,
			$next_widgets = this.widgets_below($widget);
		
		var can_move_to_new_cell = this.can_move_to(
			widget_grid_data, col, row);
		console.log(can_move_to_new_cell);
		if (can_move_to_new_cell === false) return false;

		this.remove_from_gridmap(widget_grid_data);
		widget_grid_data.row = row;
		widget_grid_data.col = col;
		this.add_to_gridmap(widget_grid_data);

		$widget.attr({
			'data-row': row,
			'data-col': col
		});	// update the widget's attributes
		$widget.data('row', row);
		$widget.data('col', col);
		this.$changed = this.$changed.add($widget);

		// Move the widgets below if needed
		$next_widgets.each(function(i, widget) {
			var $cur_widget = $(widget),
				wgd = $cur_widget.coords().grid,
				can_go_up = self.can_go_widget_up(wgd);
			if (can_go_up && can_go_up !== wgd.row)
				self.move_widget_to($cur_widget, can_go_up);
		});

		return this;
    }
  };
  $.extend($.Gridster, extensions);
})(jQuery);

var ResponsiveGrid = ResponsiveGrid || {};

ResponsiveGrid.MainController = (function($, window, document, undefined) {
  var public = {};
  
  var COLS          = 6,
      ROWS          = 2,
      MARGINS_RATIO = 0.1,
      RESIZE_TIME   = 100,
      SELECTOR      = '.gridster ul';
  
  var container, resizeTimer;
  
  function calculateNewDimensions(widget, orig_sizex, orig_sizey) {
	var $cur_widget = $(widget);
    var containerWidth = gridster.$wrapper.width(),
		containerHeight = ($(window).height() < container.height()) ?
							$(window).height() :
							container.height(),
		gridster_marginX = gridster.options.widget_margins[0],
		gridster_marginY = gridster.options.widget_margins[1];

	// console.log("Window height: " + $(window).height());
	// console.log("Container width: " + containerWidth);
	// console.log([containerWidth, containerHeight]);

    var newSizeX = containerWidth - (gridster_marginX * 2);

	// console.log("Printing new dimensions:");
	// console.log([newSizeX, orig_sizey]);

    return [[newSizeX, orig_sizey], [gridster_marginX, gridster_marginY]];
  }

  function performShift(widget, direction) {
	var $cur_widget = $(widget),
		size_x = 0,
		size_y = 0,
		orig_row = 0,
		orig_col = 0,
		next_position = {};

	// Retrieve the attributes of the current widget.
	size_x = parseInt($cur_widget.attr('data-sizex'), 10);
	size_y = parseInt($cur_widget.attr('data-sizey'), 10);
	orig_row = parseInt($cur_widget.attr('data-row'), 10);
	orig_col = parseInt($cur_widget.attr('data-col'), 10);

	// Retrieve the next position the widget can move to.
	next_position = gridster.next_position(size_x, size_y);

	// For resizing the browser inward
	if (direction && direction === "inward") {

		if (next_position && next_position.col !== orig_col)
			gridster.move_widget_sl($cur_widget, next_position.row, next_position.col);
		else if (!next_position)
			resizeWidgetDimensions(widget, size_x, size_y);

	}
	// For resizing the browser outward
	else if (direction && direction === "outward") {

		if (next_position &&
			next_position.row < orig_row &&
			next_position.col !== orig_col)
			gridster.move_widget_sl($cur_widget, next_position.row, next_position.col);
	}
  }

  function shiftWidgets() {
	var wrapper_width = gridster.$wrapper.width(),
		window_width = $(window).width(),
		calc_num_cols = Math.floor(wrapper_width / gridster.min_widget_width) +
						gridster.options.extra_cols,
		grid_width = gridster.cols * gridster.min_widget_width;

	// console.log("WRAPPER WIDTH: " + wrapper_width + ", MIN WIDGET WIDTH: " + gridster.min_widget_width);
	
	var bottom_row = -1, $bottom_widgets;
	
	gridster.cols = calc_num_cols;
	
	// console.log("NUM COLS: " + calc_num_cols);
	
	// Loop through all the widgets
	gridster.$widgets.each(function(index, widget){
		var $cur_widget = $(widget),
			cur_widget_col = parseInt($cur_widget.attr('data-col'), 10),
			cur_widget_row = parseInt($cur_widget.attr('data-row'), 10),
			cur_widget_sizex = parseInt($cur_widget.attr('data-sizex'), 10),
			cur_widget_sizey = parseInt($cur_widget.attr('data-sizey'), 10);
		
		//console.log("COLS IN WIDGET " + index + ": " + cur_widget_col);
		
		// Check to see if any part of the widget intersects with the calculated columns.
		if (cur_widget_col >= calc_num_cols ||
			(cur_widget_col + cur_widget_sizex - 2) >= calc_num_cols) {
			performShift(widget, "inward");
		}

		// Get the bottom most row.
		bottom_row = (cur_widget_row > bottom_row) ? cur_widget_row : bottom_row;
	});

	$bottom_widgets = gridster.$widgets.filter(function(){
		return parseInt($(this).attr('data-row'), 10) === bottom_row;
	});

	/* 
		For performance reasons, instead of trying to find open spots
		for all of the widgets, we could just shift only the bottom row 
		when an open spot appears after resizing the browser window outwards.
	*/
	gridster.$widgets.each(function(index, widget){
		performShift(widget, "outward");
	});

	gridster.generate_grid_and_stylesheet();
	gridster.get_widgets_from_DOM();
	gridster.set_dom_grid_height();
  }
  
  function resizeWidgetDimensions(widget, orig_sizex, orig_sizey) {
    // Calculate widget dimension proportional to parent dimension.
    var newDimensions = calculateNewDimensions(widget, orig_sizex, orig_sizey);
  
    // Set new "fluid" widget dimensions
    gridster.resize_widget_dimensions(widget, {
      widget_base_dimensions: newDimensions[0],
      widget_margins: newDimensions[1]
    });
  }
  
  function hookWidgetResizer() {
    shiftWidgets();
    $(window).resize(function() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function() {
        shiftWidgets();
      }, RESIZE_TIME);
    });
  }
  
  public.init = function(elem) {
	container = elem;
    // Initialize gridster and get API reference.
      gridster  = $(SELECTOR, elem).gridster({
		widget_base_dimensions: [140, 140],
		widget_margins: [10, 10]
      }).data('gridster');

	// Call the window resize hook to bind the resize event handler.
    hookWidgetResizer();
  };

  // expose public API
  return public;
}(jQuery, window, document));

ResponsiveGrid.MainController.init($('#grid_container'));