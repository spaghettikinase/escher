define(["utils", "CallbackManager", "lib/bacon"], function(utils, CallbackManager, bacon) {
    /** 
     */

    var SearchBar = utils.make_class();
    // instance methods
    SearchBar.prototype = { init: init,
			    is_visible: is_visible,
			    toggle: toggle,
			    hold_changes: hold_changes,
			    abandon_changes: abandon_changes,
			    accept_changes: accept_changes,
			    scale_gui: scale_gui,
			    gene_gui: gene_gui,
			    view_gui: view_gui };

    return SearchBar;

    // instance methods
    function init(sel, settings, map) {
	this.sel = sel;
	this.settings = settings;
	this.draw = false;

	var container = sel.append('div')
		.attr('class', 'settings-box')
		.style('display', 'none');

	// done button
	container.append('button')
	    .attr("class", "btn btn-sm btn-default close-button")
	    .on('click', function() {
		this.accept_changes();
	    }.bind(this))
	    .append("span").attr("class",  "glyphicon glyphicon-ok");
	// quit button
	container.append('button')
	    .attr("class", "btn btn-sm btn-default close-button")
	    .on('click', function() {
		this.abandon_changes();
	    }.bind(this))
	    .append("span").attr("class",  "glyphicon glyphicon-remove");
	
	// reaction data
	container.append('div')
	    .text('Reaction data').attr('class', 'settings-section-heading');
	this.scale_gui(container.append('div'), 'reaction');

	// metabolite data
	container.append('div').text('Metabolite data')
	    .attr('class', 'settings-section-heading');
	this.scale_gui(container.append('div'), 'metabolite');

	// gene data
	container.append('div').text('Gene data')
	    .attr('class', 'settings-section-heading');
	this.gene_gui(container.append('div'));

	// id_to_show
	container.append('div').text('View options')
	    .attr('class', 'settings-section-heading');
	this.view_gui(container.append('div'));
	
	this.callback_manager = new CallbackManager();

	this.map = map;
	this.selection = container;
    }
    function is_visible() {
	return this.selection.style('display') != 'none';
    }
    function toggle(on_off) {
	if (on_off===undefined) on_off = !this.is_visible();

	if (on_off) {
	    // hold changes until accepting/abandoning
	    this.hold_changes();
	    // show the menu
	    this.selection.style("display", "block");
	    this.selection.select('input').node().focus();
	    // escape key
	    this.escape = this.map.key_manager
		.add_escape_listener(function() {
		    this.abandon_changes();
		}.bind(this));
	    // enter key
	    this.enter = this.map.key_manager
		.add_enter_listener(function() {
		    this.accept_changes();
		}.bind(this));
	    // run the show callback
	    this.callback_manager.run('show');
	} else {
	    // draw on finish
	    if (this.draw) this.map.draw_everything();
	    // hide the menu
	    this.selection.style("display", "none");
	    if (this.escape) this.escape.clear();
	    if (this.enter) this.enter.clear();
	    this.escape = null;
	    this.enter = null;
	    // run the hide callback
	    this.callback_manager.run('hide');
	}
    }
    function hold_changes() {
	this.settings.hold_changes();
    }
    function abandon_changes() {
	this.draw = false;
	this.settings.abandon_changes();
	this.toggle(false);
    }
    function accept_changes() {
	this.sel.selectAll('input').each(function (s) { 
	    this.blur();
	});
	this.draw = true;
	this.settings.accept_changes();
	this.toggle(false);
    }
    function scale_gui(s, type) {
	/** A UI to edit color and size scales. */

	var t = s.append('table').attr('class', 'settings-table');

	var size_domain = [], color_domain = [];

	// columns
	var columns = [0, 1, 2],
	    settings = this.settings;
	
	// numbers
	t.append('tr')
	    .selectAll('.settings-number')
	    .data([''].concat(columns))
	    .enter()
	    .append('td').attr('class', 'settings-number')
	    .text(function (d) {
		return d==='' ? d : ('— ' + d + ' —');
	    });

	// domain
	t.append('tr').call(function(r) {
	    r.append('td').text('Domain:');

	    var scale_bars = r.selectAll('.input-cell')
		    .data(columns);
	    scale_bars.enter()
		.append('td').attr('class', 'input-cell')
		.append('input').attr('class', 'scale-bar-input')
		.each(function(column) {
		    bacon.fromEventTarget(this, 'change')
			.onValue(function(event) {
			    settings.set_domain_value(type, column, event.target.value);
			});

		    settings.domain_stream[type].onValue(function(ar) {
			this.value = ar[column];
		    }.bind(this));
		});

	    // auto checkbox
	    r.append('td').call(function(z) {
		z.append('span').text('auto ');
		z.append('input').attr('type', 'checkbox')
		    .each(function() {
			bacon.fromEventTarget(this, 'change')
			    .onValue(function(event) {
				var on_off = event.target.checked;
			    	settings.set_auto_domain(type, on_off);
				// disable the domain boxes on ui check
				scale_bars.selectAll('input')
				    .attr('disabled', on_off ? 'true' : null);
			    });
			
			// subscribe to changes in the model
			settings.auto_domain_stream[type].onValue(function(on_off) {
			    // check the box if auto domain on
			    this.checked = on_off;
			    // also disable the domain boxes on programmatic change
			    scale_bars.selectAll('input')
				.attr('disabled', on_off ? 'true' : null);
			}.bind(this));

		    });
		});
	}.bind(this));
	
	// ranges
	[['size', 'Size'], ['color', 'Color']].forEach(function(range_type_ar) {
	    var r = t.append('tr');
	    r.append('td').text(range_type_ar[1] + ':');
	    var scale_bars = r.selectAll('.input-cell')
		    .data(columns);
	    scale_bars.enter()
		.append('td').attr('class', 'input-cell')
		.append('input').attr('class', 'scale-bar-input')
		.each(function(column) {
		    bacon.fromEventTarget(this, 'change')
			.onValue(function(event) {
			    settings.set_range_value(type, range_type_ar[0],
						     column, event.target.value);
			});

		    settings.range_stream[type][range_type_ar[0]].onValue(function(ar) {
		    	this.value = ar[column];
		    }.bind(this));
		});
	});

	// no data
	var r = t.append('tr').append('td').attr('colspan', '5');
	[['color', 'No data color'], ['size', 'No data size']].forEach(function(range_type_ar) {
	    r.append('span').text(range_type_ar[1] + ':');
	    r.append('input').attr('class', 'no-data-input')
		.each(function() {
		    bacon.fromEventTarget(this, 'change')
			.onValue(function(event) {
			    settings.set_no_data_value(type, range_type_ar[0],
						       event.target.value);
			});

		    settings.no_data_stream[type][range_type_ar[0]].onValue(function(ar) {
		    	this.value = ar;
		    }.bind(this));
		});
	});

	// styles
	t.append('tr').call(function(r) {
	    r.append('td').text('Styles:').attr('class', 'options-label');
	    var cell = r.append('td').attr('colspan', columns.length + 1);

	    var styles = ['abs', 'size', 'color', 'text'],
		style_cells = cell.selectAll('.style-span')
		    .data(styles),
		s = style_cells.enter()
		    .append('span')
		    .attr('class', 'style-span');
	    s.append('span').text(function(d) { return d; });

	    // make the checkbox
	    s.append('input').attr('type', 'checkbox')
		.each(function(style) {
		    // change the model when the box is changed
		    var change_stream = bacon
		    	    .fromEventTarget(this, 'change')
		    	    .onValue(function(event) {
		    		settings.change_data_style(type, style,
							   event.target.checked);
		    	    });
		    
		    // subscribe to changes in the model
		    settings.data_styles_stream[type].onValue(function(ar) {
			// check the box if the style is present
			this.checked = (ar.indexOf(style) != -1);
		    }.bind(this));
		});
	});
    }
    
    function gene_gui(s) {

	var t = s.append('table').attr('class', 'settings-table');

	// columns
	var settings = this.settings,
	    type = 'gene';

	// styles
	t.append('tr').call(function(r) {
	    r.append('td').text('Styles:').attr('class', 'options-label');
	    var cell = r.append('td');

	    var styles = ['text', 'evaluate_on_reactions'],
		style_cells = cell.selectAll('.style-span')
		    .data(styles),
		s = style_cells.enter()
		    .append('span')
		    .attr('class', 'style-span');
	    s.append('span').text(function(d) { return d; });

	    // make the checkbox
	    s.append('input').attr('type', 'checkbox')
		.each(function(style) {
		    // change the model when the box is changed
		    var change_stream = bacon
		    	    .fromEventTarget(this, 'change')
		    	    .onValue(function(event) {
		    		settings.change_data_style(type, style,
							   event.target.checked);
		    	    });
		    
		    // subscribe to changes in the model
		    settings.data_styles_stream[type].onValue(function(ar) {
			// check the box if the style is present
			this.checked = (ar.indexOf(style) != -1);
		    }.bind(this));
		});
	});
    }
    
    function view_gui(s, option_name, string, options) {

	var t = s.append('table').attr('class', 'settings-table');

	// columns
	var settings = this.settings;

	// styles
	t.append('tr').call(function(r) {
	    r.append('td').text('ID to show:').attr('class', 'options-label');
	    var cell = r.append('td');

	    var options = ['bigg_id', 'name'],
		style_cells = cell.selectAll('.style-span')
		    .data(options),
		s = style_cells.enter()
		    .append('span')
		    .attr('class', 'style-span');
	    s.append('span').text(function(d) { return d; });

	    // make the checkbox
	    s.append('input').attr('type', 'radio')
		.attr('name', 'id_to_show')
		.attr('value', function(d) { return d; })
		.each(function(style) {
		    // change the model when the box is changed
		    var change_stream = bacon
		    	.fromEventTarget(this, 'change')
		    	.onValue(function(event) {
			    settings.set_id_to_show(event.target.value);
		    	});
		    
		    // subscribe to changes in the model
		    settings.id_to_show_stream.onValue(function(value) {			
			// check the box if the style is present
			this.checked = (value == this.value);
		    }.bind(this));
		});

	});

    }
});
