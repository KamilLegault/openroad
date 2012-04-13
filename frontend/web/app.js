(function() {
  var AccidentsMarkerRenderer, AccidentsTableRenderer, CITIES, ChartSeriesMaker, Manager, TrendChartRenderer, URL, selectText;

  URL = 'http://localhost:8000/%{city}';

  CITIES = {
    'vancouver': new google.maps.LatLngBounds(new google.maps.LatLng(49.131859, -123.264954), new google.maps.LatLng(49.352188, -122.985718)),
    'calgary': new google.maps.LatLngBounds(new google.maps.LatLng(50.842941, -114.613968), new google.maps.LatLng(51.343868, -113.901817)),
    'toronto': new google.maps.LatLngBounds(new google.maps.LatLng(43.584740, -79.639297), new google.maps.LatLng(43.855419, -79.115623)),
    'ottawa': new google.maps.LatLngBounds(new google.maps.LatLng(44.962002, -76.355766), new google.maps.LatLng(45.536541, -75.246033)),
    'montreal': new google.maps.LatLngBounds(new google.maps.LatLng(45.413479, -73.976608), new google.maps.LatLng(45.704788, -73.476418)),
    'halifax': new google.maps.LatLngBounds(new google.maps.LatLng(44.434570, -64.237190), new google.maps.LatLng(45.276489, -62.160469))
  };

  selectText = function(element) {
    var range, selection;
    if (document.body.createTextRange != null) {
      range = document.body.createTextRange();
      range.moveToElementText(element);
      return range.select();
    } else if (window.getSelection != null) {
      selection = window.getSelection();
      range = document.createRange();
      range.selectNodeContents(element);
      selection.removeAllRanges();
      return selection.addRange(range);
    }
  };

  ChartSeriesMaker = (function() {

    function ChartSeriesMaker() {
      this.data = {};
    }

    ChartSeriesMaker.prototype.add = function(year) {
      var y, _base;
      y = year.toString();
      (_base = this.data)[y] || (_base[y] = 0);
      return this.data[y] += 1;
    };

    ChartSeriesMaker.prototype.getSeries = function() {
      var k, v, _ref, _results;
      _ref = this.data;
      _results = [];
      for (k in _ref) {
        v = _ref[k];
        _results.push([+k, v]);
      }
      return _results;
    };

    return ChartSeriesMaker;

  })();

  AccidentsTableRenderer = (function() {

    function AccidentsTableRenderer(div) {
      this.div = div;
      this.accidents = {};
    }

    AccidentsTableRenderer.prototype.clearAccidents = function(mode) {
      if (mode == null) mode = void 0;
      if (!(mode != null)) {
        return this.accidents = {};
      } else {
        return delete this.accidents[mode];
      }
    };

    AccidentsTableRenderer.prototype.addAccidents = function(mode, accidents) {
      var accident, _i, _len;
      for (_i = 0, _len = accidents.length; _i < _len; _i++) {
        accident = accidents[_i];
        accident.distance_along_path = "" + accident.distance_along_path + "m (" + mode + ")";
      }
      return this.accidents[mode] = accidents;
    };

    AccidentsTableRenderer.prototype.render = function() {
      var $table, $tbody, $tds, $th, $theadTr, $tr, accident, accidents, heading, headings, i, key, keys, mode, modeAccidents, textNode, trClass, value, _i, _len, _len2, _len3, _ref, _ref2;
      accidents = [];
      _ref = this.accidents;
      for (mode in _ref) {
        modeAccidents = _ref[mode];
        accidents = accidents.concat(modeAccidents);
      }
      if (!(accidents.length > 0)) return;
      $table = $('<table><thead><tr><th class="distance_along_path">Odometer</th></tr></thead><tbody></tbody></table>');
      headings = [];
      _ref2 = accidents[0];
      for (heading in _ref2) {
        value = _ref2[heading];
        if (heading === 'id') continue;
        if (heading === 'distance_along_path') continue;
        if (heading === 'Time') continue;
        if (heading === 'Latitude') continue;
        if (heading === 'Longitude') continue;
        headings.push(heading);
      }
      headings.sort();
      headings.unshift('Time');
      keys = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = headings.length; _i < _len; _i++) {
          heading = headings[_i];
          _results.push(heading.toLowerCase().replace(/\s/g, '-'));
        }
        return _results;
      })();
      keys.unshift('distance_along_path');
      $theadTr = $table.find('thead').children();
      for (i = 0, _len = headings.length; i < _len; i++) {
        heading = headings[i];
        $th = $('<th></th>');
        $th.attr('class', keys[i + 1]);
        $th.text(heading);
        $theadTr.append($th);
      }
      $tbody = $table.find('tbody');
      trClass = 'odd';
      for (_i = 0, _len2 = accidents.length; _i < _len2; _i++) {
        accident = accidents[_i];
        $tr = $('<tr>' + [
          (function() {
            var _j, _len3, _results;
            _results = [];
            for (_j = 0, _len3 = keys.length; _j < _len3; _j++) {
              key = keys[_j];
              _results.push('<td></td>');
            }
            return _results;
          })()
        ].join('') + '</tr>');
        $tr.attr('class', trClass);
        $tr.attr('id', "accident-" + accident.id);
        $tds = $tr.children();
        if (trClass === 'odd') {
          trClass = 'even';
        } else {
          trClass = 'odd';
        }
        for (i = 0, _len3 = keys.length; i < _len3; i++) {
          key = keys[i];
          heading = headings[i - 1];
          $tds[i].className = key;
          textNode = document.createTextNode(accident[heading] || accident[key] || '');
          $tds[i].appendChild(textNode);
        }
        $tbody.append($tr);
      }
      $table.on('dblclick', function(e) {
        return selectText($dataDiv[0]);
      });
      $(this.div).empty();
      return $(this.div).append($table);
    };

    return AccidentsTableRenderer;

  })();

  TrendChartRenderer = (function() {

    function TrendChartRenderer(div) {
      this.div = div;
    }

    TrendChartRenderer.prototype.clearAccidents = function(mode) {
      if (mode == null) mode = void 0;
      if (!(mode != null)) {
        return this.series = {};
      } else {
        return delete this.series[mode];
      }
    };

    TrendChartRenderer.prototype.addAccidents = function(mode, accidents) {
      var accident, seriesMaker, _i, _len;
      if (accidents.length === 0) {
        delete this.series[mode];
        return;
      }
      seriesMaker = new ChartSeriesMaker();
      for (_i = 0, _len = accidents.length; _i < _len; _i++) {
        accident = accidents[_i];
        seriesMaker.add(accident.Time.split('-')[0]);
      }
      return this.series[mode] = seriesMaker.getSeries();
    };

    TrendChartRenderer.prototype.render = function() {
      var color, innerId, mode, plotSeries, plotSeriesOptions, series, _ref;
      plotSeries = [];
      plotSeriesOptions = [];
      _ref = this.series;
      for (mode in _ref) {
        series = _ref[mode];
        color = {
          bicycling: 'blue',
          driving: 'yellow'
        }[mode];
        plotSeries.push(series);
        plotSeriesOptions.push({
          color: color
        });
      }
      if (!(plotSeries.length > 0)) return;
      innerId = "" + this.div.id + "-chartInner";
      $(this.div).empty();
      $(this.div).append("<div id=\"" + innerId + "\"></div>");
      return $.jqplot(innerId, plotSeries, {
        highlighter: {
          show: true,
          sizeAdjust: 8
        },
        cursor: {
          show: false
        },
        axes: {
          xaxis: {
            max: 2012,
            tickInterval: 1
          },
          yaxis: {
            min: 0,
            tickInterval: 2
          }
        },
        series: plotSeriesOptions
      });
    };

    return TrendChartRenderer;

  })();

  AccidentsMarkerRenderer = (function() {

    function AccidentsMarkerRenderer(map) {
      this.map = map;
      this.markerArrays = {};
    }

    AccidentsMarkerRenderer.prototype.clearAccidents = function(mode) {
      var accidents, marker, _i, _len, _ref, _ref2;
      if (mode == null) mode = void 0;
      if (!(mode != null)) {
        _ref = this.markerArrays;
        for (mode in _ref) {
          accidents = _ref[mode];
          this.clearAccidents(mode);
        }
        return;
      }
      if (!this.markerArrays[mode]) return;
      _ref2 = this.markerArrays[mode];
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        marker = _ref2[_i];
        marker.setMap(null);
      }
      return delete this.markerArrays[mode];
    };

    AccidentsMarkerRenderer.prototype.addAccidents = function(mode, accidents) {
      var accident, latLng, latitude, longitude, marker, _i, _len, _results;
      this.clearAccidents(mode);
      if (accidents.length === 0) return;
      this.markerArrays[mode] = [];
      _results = [];
      for (_i = 0, _len = accidents.length; _i < _len; _i++) {
        accident = accidents[_i];
        latitude = accident.Latitude;
        longitude = accident.Longitude;
        latLng = new google.maps.LatLng(latitude, longitude);
        marker = new google.maps.Marker({
          position: latLng
        });
        this.markerArrays[mode].push(marker);
        _results.push(marker.setMap(this.map));
      }
      return _results;
    };

    AccidentsMarkerRenderer.prototype.render = function() {};

    return AccidentsMarkerRenderer;

  })();

  Manager = (function() {

    function Manager(map, origin, destination, city, dataDiv, chartDiv) {
      this.map = map;
      this.origin = origin;
      this.destination = destination;
      this.city = city;
      this.setCity(this.city);
      this.tableRenderer = new AccidentsTableRenderer(dataDiv);
      this.chartRenderer = new TrendChartRenderer(chartDiv);
      this.markerRenderer = new AccidentsMarkerRenderer(this.map);
    }

    Manager.prototype.setCity = function(city) {
      var bounds;
      this.city = city;
      bounds = CITIES[this.city];
      return this.map.fitBounds(bounds);
    };

    Manager.prototype.setOrigin = function(origin) {
      this.origin = origin;
    };

    Manager.prototype.setDestination = function(destination) {
      this.destination = destination;
    };

    Manager.prototype.getLocationForRequest = function(location) {
      return location;
    };

    Manager.prototype.getOriginForRequest = function() {
      return this.getLocationForRequest(this.origin);
    };

    Manager.prototype.getDestinationForRequest = function() {
      return this.getLocationForRequest(this.destination);
    };

    Manager.prototype.getDirectionsRequest = function(mode) {
      var googleMode;
      googleMode = {
        driving: google.maps.TravelMode.DRIVING,
        bicycling: google.maps.TravelMode.BICYCLING
      }[mode];
      return {
        origin: this.getOriginForRequest(),
        destination: this.getDestinationForRequest(),
        travelMode: googleMode,
        provideRouteAlternatives: false,
        unitSystem: google.maps.UnitSystem.METRIC,
        region: 'ca'
      };
    };

    Manager.prototype.getDirectionsService = function() {
      return this.directionsService || (this.directionsService = new google.maps.DirectionsService());
    };

    Manager.prototype.getDirectionsRenderer = function(mode) {
      var color, _this;
      this.directionsRenderers || (this.directionsRenderers = {});
      if (!(this.directionsRenderers[mode] != null)) {
        color = {
          driving: 'yellow',
          bicycling: 'blue'
        }[mode];
        this.directionsRenderers[mode] = new google.maps.DirectionsRenderer({
          draggable: true,
          map: this.map,
          polylineOptions: {
            strokeColor: color
          },
          preserveViewport: true,
          suppressInfoWindows: true
        });
        this.directionsRenderers[mode].bikefile_mode = mode;
        _this = this;
        google.maps.event.addListener(this.directionsRenderers[mode], 'directions_changed', function(e) {
          return _this.queryAndUpdatePolylineRelatedLayer(mode, this.directions);
        });
      }
      return this.directionsRenderers[mode];
    };

    Manager.prototype.queryAndUpdateDirectionsForMode = function(mode) {
      var renderer, request, service;
      request = this.getDirectionsRequest(mode);
      renderer = this.getDirectionsRenderer(mode);
      service = this.getDirectionsService();
      return service.route(request, function(result, status) {
        if (status === google.maps.DirectionsStatus.OK) {
          return renderer.setDirections(result);
        }
      });
    };

    Manager.prototype.queryAndUpdateDirections = function() {
      this.clearOldData();
      this.queryAndUpdateDirectionsForMode('bicycling');
      return this.queryAndUpdateDirectionsForMode('driving');
    };

    Manager.prototype.queryAndUpdatePolylineRelatedLayer = function(mode, googleDirectionsResult) {
      var encoded_polyline, postData, url,
        _this = this;
      this.lastRequests || (this.lastRequests = {});
      if (this.lastRequests[mode] != null) {
        this.lastRequests[mode].cancel();
        delete this.lastRequests[mode];
      }
      this.clearOldData(mode);
      encoded_polyline = googleDirectionsResult.routes[0].overview_polyline.points;
      postData = {
        encoded_polyline: encoded_polyline
      };
      url = URL.replace(/%\{city\}/, this.city);
      return this.lastRequests[mode] = $.ajax({
        url: url,
        type: 'POST',
        data: postData,
        dataType: 'json',
        success: function(data) {
          delete _this.lastRequests[mode];
          _this.clearOldData(mode);
          return _this.handleNewData(mode, data);
        }
      });
    };

    Manager.prototype.clearOldData = function(mode) {
      if (mode == null) mode = void 0;
      this.tableRenderer.clearAccidents(mode);
      this.chartRenderer.clearAccidents(mode);
      return this.markerRenderer.clearAccidents(mode);
    };

    Manager.prototype.handleNewData = function(mode, data) {
      this.tableRenderer.addAccidents(mode, data);
      this.chartRenderer.addAccidents(mode, data);
      this.markerRenderer.addAccidents(mode, data);
      this.tableRenderer.render();
      this.chartRenderer.render();
      return this.markerRenderer.render();
    };

    return Manager;

  })();

  window.Manager = Manager;

}).call(this);
