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

		var can_move_to_new_cell = this.can_move_to(
			widget_grid_data, col, row, row);
		
		if (can_move_to_new_cell === false) return false;

		this.remove_from_gridmap(widget_grid_data);
		widget_grid_data.row = row;
		widget_grid_data.col = col;
		this.add_to_gridmap(widget_grid_data);
		$widget.attr({
			'data-row': row,
			'data-col': col
		});	// update the widget's attributes
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

  function shiftWidgets() {
	var wrapper_width = gridster.$wrapper.width(),
		window_width = $(window).width(),
		calc_num_cols = Math.floor(wrapper_width / gridster.min_widget_width) +
						gridster.options.extra_cols,
		grid_width = gridster.cols * gridster.min_widget_width;

		gridster.cols = calc_num_cols;

	// Loop through all the widgets
	gridster.$widgets.each(function(index, widget){
		var $cur_widget = $(widget);
		
		// Get the data-sizex and data-sizey attributes
		var size_x = $cur_widget.data('sizex'),
			size_y = $cur_widget.data('sizey');
		var next_position = gridster.next_position(size_x, size_y);
		gridster.move_widget_sl($cur_widget, next_position.row, next_position.col);
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