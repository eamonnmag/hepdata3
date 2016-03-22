HEPDATA.visualization.heatmap = {

  zoom: undefined,
  brush: undefined,
  x_axis: undefined,
  y_axis: undefined,
  x_scale: undefined,
  y_scale: undefined,
  // points to which independent variable to use when plotting the x and y axes
  x_index: '',
  y_index: '',
  grid_dimension: 10,
  data: undefined,
  placement: undefined,
  options: {
    brushable: false,
    zoomable: false,
    animation_duration: 100,
    margins: {"left": 60, "right": 30, "top": 10, "bottom": 30},
    // todo: improve the scale used here.
    colors: d3.scale.threshold().domain([0, 0.25, 0.5, 0.75, 1]).range(["#f1c40f", "#f39c12", "#e67e22", "#d35400", "#e74c3c", "#c0392b"]),
    height: 400,
    width: 400,
    y_scale: 'linear'
  },

  reset: function () {
    HEPDATA.visualization.heatmap.x_index = '';
  },


  render: function (data, placement, options) {
    $(placement).html('');

    HEPDATA.visualization.heatmap.options = $.extend(HEPDATA.visualization.heatmap.options, options);

    HEPDATA.visualization.heatmap.data = data;

    if (HEPDATA.visualization.heatmap.x_index == '') {
      HEPDATA.visualization.heatmap.x_index = data.headers[1].name;
      HEPDATA.visualization.heatmap.y_index = data.headers[0].name;
    }

    HEPDATA.visualization.heatmap.placement = placement;

    var processed_dict = HEPDATA.dataprocessing.process_data_values(data);

    HEPDATA.visualization.heatmap.render_axis_selector(data, "#legend");

    // in this plot, the x and y axes are defined by two x values in the data. The y 'axis' defines the value
    // and therefore color at the area defined by x, y, and a beam bin size, e.g. 30 GeV.
    HEPDATA.visualization.heatmap.x_scale = HEPDATA.visualization.heatmap.calculate_x_scale(processed_dict['processed']);
    HEPDATA.visualization.heatmap.y_scale = HEPDATA.visualization.heatmap.calculate_y_scale(processed_dict['processed']);

    HEPDATA.visualization.heatmap.x_axis = d3.svg.axis().scale(HEPDATA.visualization.heatmap.x_scale).orient("bottom").tickPadding(2);
    HEPDATA.visualization.heatmap.y_axis = d3.svg.axis().scale(HEPDATA.visualization.heatmap.y_scale).orient("left").tickPadding(2);

    var svg = d3.select(placement).append("svg").attr("width", HEPDATA.visualization.heatmap.options.width).attr("height", HEPDATA.visualization.heatmap.options.height)
      .append("g")
      .attr("transform", "translate(" + HEPDATA.visualization.heatmap.options.margins.left + "," + HEPDATA.visualization.heatmap.options.margins.top + ")");

    var d3tip_hm = d3.tip()
      .attr('class', 'd3-tip')
      .offset([-10, 0])
      .html(function (d) {
        if (d.x_min != undefined) {
          return "<strong>" + d.x_min + " to " + d.x_max
            + " </strong><br/>" + d.y_min + " to " + d.y_max
            + "<br/>" + d.value + "</span>";
        } else {
          var x_val = d.x.replace(/\$/g, '');
          var y_val = d.y.replace(/\$/g, '');
          return "<strong>" + x_val + " </strong><br/>" + y_val + "<br/>" + d.value + "</span>";
        }
      });

    svg.call(d3tip_hm);

    svg.append('rect')
      .attr('width', HEPDATA.visualization.heatmap.options.width)
      .attr('height', HEPDATA.visualization.heatmap.options.height)
      .attr('fill', 'rgba(1,1,1,0)');

    svg.append("g").attr("class", "x axis")
      .attr("transform", "translate(0," + (HEPDATA.visualization.heatmap.options.height
        - HEPDATA.visualization.heatmap.options.margins.bottom
        - HEPDATA.visualization.heatmap.options.margins.top)
        + ")")
      .call(HEPDATA.visualization.heatmap.x_axis);

    svg.append("text")
      .attr("class", "axis_text")
      .attr("text-anchor", "middle")
      .attr("x", HEPDATA.visualization.heatmap.options.width / 2)
      .attr("y", HEPDATA.visualization.heatmap.options.height - 10)
      .text(HEPDATA.visualization.heatmap.x_index);


    svg.append("g").attr("class", "y axis").call(HEPDATA.visualization.heatmap.y_axis).attr("transform", "translate(-4,0)");
    svg.append("text")
      .attr("class", "axis_text")
      .attr("text-anchor", "middle")
      .attr("x", -HEPDATA.visualization.heatmap.options.height / 3)
      .attr("y", 0)
      .attr("dy", "-3.5em")
      .attr("transform", "rotate(-90)")
      .text(HEPDATA.visualization.heatmap.y_index);

    var node_data = svg.selectAll("g.node").data(processed_dict["processed"]).enter();

    // we need to scale the data to between 0 and 1 so that the color scale works across different ranges.

    var scale = d3.scale.pow().domain([HEPDATA.stats.min_value, HEPDATA.stats.max_value]).range([0, 1]);


    var node = node_data.append("g").attr("class", "node").attr('id', function (d) {
      return 'row-' + d.row;
    }).attr("transform", "translate(-2.5,-2.5)").append("rect")
      .attr("x", function (d) {
        return HEPDATA.visualization.heatmap.x_scale(d.x_min ? d.x_min : (d.x));
      })
      .attr("y", function (d) {
        return HEPDATA.visualization.heatmap.y_scale(d.y_max ? d.y_max : d.y);
      })
      .attr("width", function (d) {
        if (d.x_min && d.x_max) {
          return HEPDATA.visualization.heatmap.x_scale(d.x_max) - HEPDATA.visualization.heatmap.x_scale(d.x_min);
        }
        return 5;
      })
      .attr("height", function (d) {
        if (d.y_min && d.y_max) {
          return HEPDATA.visualization.heatmap.y_scale(d.y_min) - HEPDATA.visualization.heatmap.y_scale(d.y_max);
        }
        return 5;
      })
      .style("fill", function (d) {
        return HEPDATA.visualization.heatmap.options.colors(scale(d.value));
      });

    node.on('mouseover', d3tip_hm.show)
      .on('mouseout', d3tip_hm.hide);



    if (HEPDATA.visualization.heatmap.options.brushable) {
      HEPDATA.visualization.heatmap.brush = d3.svg.brush()
        .x(HEPDATA.visualization.heatmap.x_scale)
        .y(HEPDATA.visualization.heatmap.y_scale)
        .on("brushstart", function () {
          HEPDATA.selected = {};
        })
        .on("brush", HEPDATA.visualization.heatmap.brushed)
        .on("brushend", function () {

          HEPDATA.table_renderer.filter_rows(HEPDATA.selected);
        });

      svg.append("g")
        .attr("class", "brush")
        .call(HEPDATA.visualization.heatmap.brush);
    }
  },

  render_brushable_option: function (parent_node, options, function_call) {

    var label = parent_node.append("label").text("Brushing Enabled? ").attr("style", "padding-right:10px");

    var checkbox = parent_node.append("input")
      .attr("type", "checkbox")
      .attr("onClick", function_call);
    if (options.brushable) {
      checkbox.attr("checked", "checked")
    }

    parent_node.append("hr");
  },

  render_axis_selector: function (data, placement) {
    $(placement).html('');
    var options = d3.select(placement).append("div");

    HEPDATA.visualization.heatmap.render_brushable_option(options, HEPDATA.visualization.heatmap.options, "HEPDATA.visualization.heatmap.toggle_brushing(this)");


    options.append("label").text("X Axis").attr("style", "padding-right:10px");
    var selector = options.append("select").attr("class", "hm_axis").attr("id", "hm_xaxis").attr("onchange", "HEPDATA.visualization.heatmap.switch_axis()");

    options.append("br");
    for (var i = 0; i < 2; i++) {
      var option = selector.append("option").text(data.headers[i].name);
      if (data.headers[i].name == HEPDATA.visualization.heatmap.x_index) option.attr("selected", "selected")
    }

    options.append("label").text("Y Axis").attr("style", "padding-right:10px");
    var selector2 = options.append("select").attr("class", "hm_axis").attr("id", "hm_yaxis").attr("onchange", "HEPDATA.visualization.heatmap.switch_axis()");

    for (var i = 0; i < 2; i++) {
      var option = selector2.append("option").text(data.headers[i].name);
      if (data.headers[i].name == HEPDATA.visualization.heatmap.y_index) option.attr("selected", "selected")
    }
  },

  toggle_brushing: function (caller) {
    HEPDATA.visualization.heatmap.options.brushable = d3.select(caller).property("checked");
    HEPDATA.visualization.heatmap.render_axis_selector(HEPDATA.visualization.heatmap.data, "#legend");
    HEPDATA.visualization.heatmap.render(HEPDATA.visualization.heatmap.data, HEPDATA.visualization.heatmap.placement, {});
  },


  switch_axis: function () {
    var tmp_y = HEPDATA.visualization.heatmap.y_index;
    HEPDATA.visualization.heatmap.y_index = HEPDATA.visualization.heatmap.x_index;
    HEPDATA.visualization.heatmap.x_index = tmp_y;

    HEPDATA.visualization.heatmap.render_axis_selector(HEPDATA.visualization.heatmap.data, "#legend");
    HEPDATA.visualization.heatmap.render(HEPDATA.visualization.heatmap.data, HEPDATA.visualization.heatmap.placement, {});
  },

  brushed: function () {
    var extent = HEPDATA.visualization.heatmap.brush.extent();
    HEPDATA.selected = {};
    d3.selectAll("g.node").select("rect").style("stroke", function (d) {

      var x = d.x;
      var y = d.y;

      if (isNaN(x)) x = HEPDATA.visualization.heatmap.x_scale(x);
      if (isNaN(y)) y = HEPDATA.visualization.heatmap.y_scale(y);

      d.selected = (x >= (extent[0][0]) && x <= (extent[1][0])
      && (y >= extent[0][1]) && (y <= extent[1][1]));

      if (d.selected) {
        HEPDATA.selected[d.row] = d;
      }
      return d.selected ? "#F15D2F" : "none";
    });
  },

  calculate_x_scale: function (data) {

    var x_extent = d3.extent(data, function (d) {
      return d.x;
    });

    if ('min_x' in HEPDATA.stats && 'max_x' in HEPDATA.stats && HEPDATA.stats.min_x != null) {
      x_extent = [HEPDATA.stats.min_x, HEPDATA.stats.max_x];
      return d3.scale.linear().domain(x_extent).range([0, HEPDATA.visualization.heatmap.options.width - HEPDATA.visualization.heatmap.options.margins.left - HEPDATA.visualization.heatmap.options.margins.right]);
    } else {
      return d3.scale.ordinal().domain(data.map(function (d) {
        return d.x;
      })).rangePoints([0, HEPDATA.visualization.heatmap.options.width - HEPDATA.visualization.heatmap.options.margins.left - HEPDATA.visualization.heatmap.options.margins.right]);
    }

  },

  calculate_y_scale: function (data) {
    var y_extent = d3.extent(data, function (d) {
      return d.y;
    });

    if ('min_y' in HEPDATA.stats && 'max_y' in HEPDATA.stats && HEPDATA.stats.min_y != null) {
      y_extent = [HEPDATA.stats.min_y, HEPDATA.stats.max_y];
      return d3.scale.linear().domain(y_extent).range([HEPDATA.visualization.heatmap.options.height - HEPDATA.visualization.heatmap.options.margins.top - HEPDATA.visualization.heatmap.options.margins.bottom, 10]);
    } else {
      return d3.scale.ordinal().domain(data.map(function (d) {
        return d.y;
      })).rangePoints([HEPDATA.visualization.heatmap.options.height - HEPDATA.visualization.heatmap.options.margins.top - HEPDATA.visualization.heatmap.options.margins.bottom, 10]);
    }


  }
};
