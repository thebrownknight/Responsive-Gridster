(function($) {
  var extensions = {
    resize_widget_dimensions: function(options) {
      if (options.widget_margins) {
        this.options.widget_margins = options.widget_margins;
      }

      if (options.widget_base_dimensions) {
        this.options.widget_base_dimensions = options.widget_base_dimensions;
      }

      this.min_widget_width = (this.options.widget_margins[0] * 2) + this.options.widget_base_dimensions[0];
      this.min_widget_height = (this.options.widget_margins[1] * 2) + this.options.widget_base_dimensions[1];

      var serializedGrid = this.serialize();
      this.$widgets.each($.proxy(function(i, widget) {
        var $widget = $(widget);
        var data = serializedGrid[i];
        this.resize_widget($widget, data.sizex, data.sizey);
      }, this));

      this.generate_grid_and_stylesheet();
      this.get_widgets_from_DOM();
      this.set_dom_grid_height();
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
		//console.log(widget_grid_data);
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
  
  function calculateNewDimensions() {
    var containerWidth = container.innerWidth(),
		containerHeight = ($(window).height() < container.height())
							? $(window).height()
							: container.height();
	console.log("Window height: " + $(window).height());
	console.log("Container height: " + container.height());
    console.log([containerWidth, containerHeight]);
    var newMarginX      = containerWidth*MARGINS_RATIO / (COLS*2),
        newMarginY      = containerHeight * MARGINS_RATIO / (ROWS * 2),
		newSizeX		= containerWidth*(1 - MARGINS_RATIO) / COLS,
		newSizeY        = containerHeight*(1-MARGINS_RATIO) / ROWS;

	console.log([newSizeX, newSizeY]);
    return [[newSizeX, newSizeY], [newMarginX, newMarginY]];
  }

  function performShift(widget, direction) {
	var $cur_widget = $(widget),
		size_x = 0,
		size_y = 0,
		orig_row = 0,
		orig_col = 0,
		next_position = {};
	
	// For resizing the browser inward
	// Check to see if the column of the widget intersects with
	// the calculated number of columns.
	if (direction && direction === "inward") {
		// Get the data-sizex and data-sizey attributes
		size_x = parseInt($cur_widget.attr('data-sizex'), 10);
		size_y = parseInt($cur_widget.attr('data-sizey'), 10);
		orig_col = parseInt($cur_widget.attr('data-col'), 10);
		next_position = gridster.next_position(size_x, size_y);
		console.log(next_position);
		if (next_position && next_position.col !== orig_col)
			gridster.move_widget_sl($cur_widget, next_position.row, next_position.col);
	} else if (direction && direction === "outward") {
		console.log("Moving outwards.");
		size_x = parseInt($cur_widget.attr('data-sizex'), 10);
		size_y = parseInt($cur_widget.attr('data-sizey'), 10);
		orig_row = parseInt($cur_widget.attr('data-row'), 10);
		orig_col = parseInt($cur_widget.attr('data-col'), 10);
		
		next_position = gridster.next_position(size_x, size_y);
		console.log(next_position);
		if (next_position && next_position.row < orig_row
			&& next_position.col !== orig_col)
			gridster.move_widget_sl($cur_widget, next_position.row, next_position.col);
	}
  }

  function shiftWidgets() {
	var wrapper_width = gridster.$wrapper.width(),
		window_width = $(window).width(),
		calc_num_cols = Math.floor(wrapper_width / gridster.min_widget_width) +
						gridster.options.extra_cols,
		grid_width = gridster.cols * gridster.min_widget_width;

	console.log("WRAPPER WIDTH: " + wrapper_width + ", MIN WIDGET WIDTH: " + gridster.min_widget_width);
	var bottom_row = -1, $bottom_widgets;
	
	gridster.cols = calc_num_cols;
	console.log("NUM COLS: " + calc_num_cols);
	// Loop through all the widgets
	gridster.$widgets.each(function(index, widget){
		var $cur_widget = $(widget),
			cur_widget_col = parseInt($cur_widget.attr('data-col')),
			cur_widget_row = parseInt($cur_widget.attr('data-row')),
			cur_widget_sizex = parseInt($cur_widget.attr('data-sizex')),
			cur_widget_sizey = parseInt($cur_widget.attr('data-sizey'));
		console.log("COLS IN WIDGET " + index + ": " + cur_widget_col);
		if (cur_widget_col >= calc_num_cols
			|| (cur_widget_col + cur_widget_sizex - 1) === calc_num_cols) {
			performShift(widget, "inward");
		}

		// Get the bottom most row.
		bottom_row = (cur_widget_row > bottom_row)
						? cur_widget_row
						: bottom_row;
		console.log("BOTTOM ROW: " + bottom_row);
	});

	$bottom_widgets = gridster.$widgets.filter(function(){
		return parseInt($(this).attr('data-row')) === bottom_row;
	});
	console.log("LENGTH.... " + $bottom_widgets.length);
	$bottom_widgets.each(function(index, widget){
		performShift(widget, "outward");
	});

	gridster.generate_grid_and_stylesheet();
	gridster.get_widgets_from_DOM();
	gridster.set_dom_grid_height();
  }
  
  function resizeWidgetDimensions() {
    // Calculate widget dimension proportional to parent dimension.
    var newDimensions = calculateNewDimensions();
  
    // Set new "fluid" widget dimensions
    gridster.resize_widget_dimensions({
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

    hookWidgetResizer();
  };

  // expose public API
  return public;
}(jQuery, window, document));

ResponsiveGrid.MainController.init($('#grid_container'));