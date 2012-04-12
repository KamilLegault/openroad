URL = 'http://localhost:8000/%{city}'

CITIES = {
  'vancouver': new google.maps.LatLngBounds(
    new google.maps.LatLng(49.131859, -123.264954),
    new google.maps.LatLng(49.352188, -122.985718)
  ),
  'calgary': new google.maps.LatLngBounds(
    new google.maps.LatLng(50.842941, -114.613968),
    new google.maps.LatLng(51.343868, -113.901817)
  ),
  'toronto': new google.maps.LatLngBounds(
    new google.maps.LatLng(43.584740, -79.639297),
    new google.maps.LatLng(43.855419, -79.115623)
  ),
  'ottawa': new google.maps.LatLngBounds(
    new google.maps.LatLng(44.962002, -76.355766),
    new google.maps.LatLng(45.536541, -75.246033)
  ),
  'montreal': new google.maps.LatLngBounds(
    new google.maps.LatLng(45.413479, -73.976608),
    new google.maps.LatLng(45.704788, -73.476418)
  ),
  'halifax': new google.maps.LatLngBounds(
    new google.maps.LatLng(44.434570, -64.237190),
    new google.maps.LatLng(45.276489, -62.160469)
  ),
}

selectText = (element) ->
  if document.body.createTextRange?
    range = document.body.createTextRange()
    range.moveToElementText(element)
    range.select()
  else if window.getSelection?
    selection = window.getSelection()
    range = document.createRange()
    range.selectNodeContents(element)
    selection.removeAllRanges()
    selection.addRange(range)

class ChartSeriesMaker
  constructor: () ->
    @data = {}

  add: (year) ->
    y = year.toString()
    @data[y] ||= 0
    @data[y] += 1

  getSeries: () ->
    ([ +k, v ] for k, v of @data)

class AccidentsTableRenderer
  constructor: (@div) ->

  render: (accidents) ->
    return unless accidents.length > 0

    $table = $('<table><thead><tr><th class="distance_along_path">Odometer</th></tr></thead><tbody></tbody></table>')

    headings = []

    for heading, value of accidents[0]
      continue if heading == 'id'
      continue if heading == 'distance_along_path'
      continue if heading == 'Time'

      # We can't give Google-provided geocoded data
      # TODO: make exception for Toronto?
      continue if heading == 'Latitude'
      continue if heading == 'Longitude'
      headings.push(heading)

    headings.sort()
    headings.unshift('Time')

    keys = ( heading.toLowerCase().replace(/\s/g, '-') for heading in headings )
    keys.unshift('distance_along_path')

    $theadTr = $table.find('thead').children()
    for heading, i in headings
      $th = $('<th></th>')
      $th.attr('class', keys[i+1])
      $th.text(heading)
      $theadTr.append($th)

    $tbody = $table.find('tbody')
    trClass = 'odd'

    for accident in accidents
      $tr = $('<tr>' + ['<td></td>' for key in keys].join('') + '</tr>')
      $tr.attr('class', trClass)
      $tr.attr('id', "accident-#{accident.id}")
      $tds = $tr.children()

      if trClass == 'odd' then trClass = 'even' else trClass = 'odd'

      accident.distance_along_path = "#{accident.distance_along_path}m"

      for key, i in keys
        heading = headings[i-1]
        $tds[i].className = key
        textNode = document.createTextNode(accident[heading] || accident[key] || '')
        $tds[i].appendChild(textNode)

      $tbody.append($tr)

    $table.on 'dblclick', (e) ->
      selectText($dataDiv[0])

    $(@div).append($table)

class Manager
  constructor: (@map, @origin, @destination, @city, @dataDiv, @chartDiv) ->
    this.setCity(@city)

  setCity: (@city) ->
    bounds = CITIES[@city]
    @map.fitBounds(bounds)

  setOrigin: (@origin) ->

  setDestination: (@destination) ->

  getLocationForRequest: (location) ->
    location

  getOriginForRequest: () ->
    this.getLocationForRequest(@origin)

  getDestinationForRequest: () ->
    this.getLocationForRequest(@destination)

  getDirectionsRequest: (mode) ->
    googleMode = {
      driving: google.maps.TravelMode.DRIVING,
      bicycling: google.maps.TravelMode.BICYCLING
    }[mode]
    {
      origin: this.getOriginForRequest(),
      destination: this.getDestinationForRequest(),
      travelMode: googleMode,
      provideRouteAlternatives: false,
      unitSystem: google.maps.UnitSystem.METRIC,
      region: 'ca'
    }

  getDirectionsService: () ->
    @directionsService ||= new google.maps.DirectionsService()

  getDirectionsRenderer: () ->
    return @directionsRenderer if @directionsRenderer?

    @directionsRenderer = new google.maps.DirectionsRenderer()
    @directionsRenderer.setMap(@map)
    @directionsRenderer

  queryAndUpdateDirections: (callback) ->
    request = this.getDirectionsRequest('bicycling')
    service = this.getDirectionsService()
    renderer = this.getDirectionsRenderer()
    service.route request, (result, status) ->
      if status == google.maps.DirectionsStatus.OK
        renderer.setDirections(result)
        callback(result)

  queryAndUpdatePolylineRelatedLayer: (googleDirectionsResult) ->
    encoded_polyline = googleDirectionsResult.routes[0].overview_polyline.points

    if @markers?
      for marker in @markers
        marker.setMap(null)
    @markers = []

    $dataDiv = $(@dataDiv || [])
    $chartDiv = $(@chartDiv || [])

    $dataDiv.empty()
    $chartDiv.empty()

    postData = { encoded_polyline: encoded_polyline }

    url = URL.replace(/%\{city\}/, @city)

    $.ajax({ url: url, type: 'POST', data: postData, dataType: 'json', success: (data) =>
      minYear = undefined
      maxYear = undefined

      $dataDiv.empty()
      $chartDiv.empty()

      tableRenderer = new AccidentsTableRenderer($dataDiv[0])
      tableRenderer.render(data)

      for accident in data
        minYear = accident.year if !minYear? || minYear > accident.year
        maxYear = accident.year if !maxYear? || maxYear < accident.year

      seriesMaker = new ChartSeriesMaker()

      return if !data || !data.length

      for accident, rowNumber in data
        latitude = accident.Latitude
        longitude = accident.Longitude
        latLng = new google.maps.LatLng(latitude, longitude)
        marker = new google.maps.Marker(position: latLng)
        @markers.push(marker)
        marker.setMap(@map)

        seriesMaker.add(accident.Time.split('-')[0])

      plotSeries = seriesMaker.getSeries()
      $chartInner = $('<div></div>')
      $chartInner.attr('id', @chartDiv.id + '-chartInner')
      $chartDiv.append($chartInner)

      $.jqplot($chartInner[0].id, [plotSeries], {
        highlighter: { show: true, sizeAdjust: 8 },
        cursor: { show: false },
        xaxis: {},
        yaxis: { min: 0 },
      })
    })

window.Manager = Manager
