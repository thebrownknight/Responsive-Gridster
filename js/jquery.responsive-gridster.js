$(function() {
	var gridster = $( ".gridster > ul" ).gridster({
		widget_margins: [5, 5],
		widget_base_dimensions: [140, 140],
		min_cols: 6
	}).data('gridster');
});