function createMap() {
    var map = L.map('map').setView({lat: 0, lng: 0}, 2.5);

    const southWest = L.latLng(-90, -180);
    const northEast = L.latLng(90, 180);
    const bounds = L.latLngBounds(southWest, northEast);

    map.setMaxBounds(bounds);
    map.on('drag', function () {
        map.panInsideBounds(bounds, {animate: false});
    });

    // add the OpenStreetMap tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', {
        minZoom: 2,
        maxZoom: 9,
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    }).addTo(map);

    // show the scale bar on the lower left corner
    L.control.scale({imperial: true, metric: true}).addTo(map);

    const markers = L.markerClusterGroup();
    const markerList = [];

    $.ajax({
        url: '/map-data',
        type: 'GET',
        dataType: 'json',
        success: function(results) {
            for (var i = 0; i < results.length; i++) {
                if (typeof results[i].longitude === 'number' && typeof results[i].latitude === 'number') {
                    const marker = L.marker({
                        lon: parseFloat(results[i].longitude),
                        lat: parseFloat(results[i].latitude)
                    }).bindPopup("<a href=\"/antismash?dataset=" + results[i].assembly + " \" target='_blank'> " + results[i].assembly + "</a>");

                    // Store marker and its associated data
                    markerList.push({
                        marker: marker,
                        id: results[i].assembly
                    });

                    markers.addLayer(marker);
                }
            }
        },
        complete: function() {
            map.addLayer(markers);
        }
    });

    // Add drawing controls
    var drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    var drawControl = new L.Control.Draw({
        draw: {
            polyline: false,
            polygon: false,
            circle: false,
            marker: false,
            circlemarker: false,
            rectangle: true // Enable rectangle drawing
        },
        edit: {
            featureGroup: drawnItems
        }
    });
    map.addControl(drawControl);

    let containedIDs = [];

    // Handle the rectangle draw event
    map.on('draw:created', function (e) {
        var type = e.layerType,
            layer = e.layer;

        if (type === 'rectangle') {
            var bounds = layer.getBounds(); // Get the bounds of the drawn rectangle

            var containedMarkers = markerList.filter(function(item) {
                return bounds.contains(item.marker.getLatLng()); // Check if marker is within the bounds
            });

            containedIDs = containedMarkers.map(function(item) {
                return item.id; // Get the IDs of the contained markers
            });
        }

        drawnItems.addLayer(layer);
    });

    // Add an "Analyze" button to the map
    L.Control.AnalyzeButton = L.Control.extend({
        onAdd: function(map) {
            var btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control leaflet-control-custom');
            btn.innerHTML = 'Inspect';
            btn.style.backgroundColor = '#fff';
            btn.style.padding = '5px';
            btn.style.cursor = 'pointer';

            // Handle button click event
            L.DomEvent.on(btn, 'click', function() {
                if (containedIDs.length > 0) {
                    // Construct the URL with the sample IDs
                    // Get base URL and ensure it doesn't have a trailing slash
                    let base = (window.APP_URL || '');
                    if (base.endsWith('/')) {
                        base = base.slice(0, -1);
                    }
                    var baseUrl = base + '/bgcs?samples=';
                    var sampleIdsParam = containedIDs.join(','); // Join the IDs with commas
                    var fullUrl = baseUrl + encodeURIComponent(sampleIdsParam);

                    // Open the URL in a new tab using "noopener" for security
                    window.open(fullUrl, '_blank', 'noopener'); // Opens in a new tab
                    // Alternatively, you can use window.location.href = fullUrl; to redirect in the same tab
                } else {
                    alert("Please use the rectangle tool on the left-side to select a region for inspection.");
                }
            });

            return btn;
        },

        onRemove: function(map) {
            // Nothing to clean up here
        }
    });

    // Add the "Analyze" button to the top-left corner of the map
    L.control.analyzeButton = function(opts) {
        return new L.Control.AnalyzeButton(opts);
    }
    L.control.analyzeButton({ position: 'topright' }).addTo(map);
}

function getSampleInfo() {
    $.ajax({
        url: '/sample-info',
        type: 'GET',
        dataType: 'json',
        success: function(results) {
            $("#samples-count").html(results[0].sample_count);
            $("#analyzed-count").html(results[0].success);
            $("#running-count").html(results[0].running);
            $("#bgcs-count").html(results[0].protoclusters);
            $("#compl-bgcs").html(results[0].complbgcscount);
        }
    });
}

// Initialize the map when jQuery is ready
$(document).ready(function() {
    getSampleInfo();
    createMap();
});
