(function(global) {
  const JS = global.JobStatus || (global.JobStatus = {});
  JS.PUTATIVE_THRESHOLD = JS.PUTATIVE_THRESHOLD || 0.4;

  JS.map = JS.map || null;
  JS.markers = JS.markers || null;

  JS.initializeMap = function() {
    if (JS.map) return;
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    JS.map = L.map('map').setView({lat: 0, lng: 0}, 2.5);
    const southWest = L.latLng(-90, -180);
    const northEast = L.latLng(90, 180);
    const bounds = L.latLngBounds(southWest, northEast);

    JS.map.setMaxBounds(bounds);
    JS.map.on('drag', function () {
      JS.map.panInsideBounds(bounds, {animate: false});
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', {
      minZoom: 2,
      maxZoom: 9,
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    }).addTo(JS.map);

    L.control.scale({imperial: true, metric: true}).addTo(JS.map);

    JS.markers = L.markerClusterGroup();
    JS.map.addLayer(JS.markers);

    setTimeout(() => JS.map.invalidateSize(), 100);

    const observer = new MutationObserver(() => JS.map.invalidateSize());
    observer.observe(mapContainer, { attributes: true });
  };

  JS.collectGcfIds = function(results) {
    return [...new Set(results.map(item => item.gcf_id))];
  };

  JS.fetchGeographicalData = async function(gcfIds, jobId = null, filterPutative = false) {
    let allData = [];

    if (jobId) {
      let url = `/map-data-gcf?jobId=${jobId}`;
      if (filterPutative) {
        url += `&putativeThreshold=${JS.PUTATIVE_THRESHOLD}`;
      }
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP error! Status: ${resp.status}`);
        allData = await resp.json();
      } catch (err) {
        console.error('Error fetching geographical data for job', jobId, err);
      }
    } else {
      for (const gcfId of gcfIds) {
        const gcfParam = encodeURIComponent(gcfId);
        try {
          const resp = await fetch(`/map-data-gcf?gcf=${gcfParam}`);
          if (!resp.ok) throw new Error(`HTTP error! Status: ${resp.status}`);
          const data = await resp.json();
          allData = allData.concat(data);
        } catch (err) {
          console.error('Error fetching geographical data for GCF', gcfId, err);
        }
      }
    }

    return allData;
  };

  JS.displayGeographicalData = function(data) {
    if (!JS.markers) return;
    JS.markers.clearLayers();
    let latSum = 0;
    let lngSum = 0;
    let count = 0;
    const bounds = L.latLngBounds();

    for (const point of data) {
      if (typeof point.longitude === 'string' && typeof point.latitude === 'string') {
        const lat = parseFloat(point.latitude);
        const lng = parseFloat(point.longitude);
        if (isNaN(lat) || isNaN(lng)) continue;
        const marker = L.marker({ lon: lng, lat: lat })
          .bindPopup(`<a href="https://www.ebi.ac.uk/metagenomics/samples/${point.sample}" target="_blank">${point.sample}</a>`);
        JS.markers.addLayer(marker);
        bounds.extend(marker.getLatLng());
        latSum += lat;
        lngSum += lng;
        count++;
      }
    }

    if (count > 0) {
      const avgLat = latSum / count;
      const avgLng = lngSum / count;
      JS.map.setView([avgLat, avgLng]);
    }
  };

  JS.updateMapWithResults = async function(results) {
    JS.initializeMap();
    const gcfIds = JS.collectGcfIds(results);
    if (gcfIds.length === 0) {
      JS.markers.clearLayers();
      if (typeof JS.clearBiomeChart === 'function') JS.clearBiomeChart();
      return;
    }

    const jobIdDisplay = document.getElementById('jobIdDisplay');
    const jobId = jobIdDisplay ? jobIdDisplay.textContent : null;
    const hidePutativeToggle = document.getElementById('hidePutativeToggle');
    const filterPutative = hidePutativeToggle ? hidePutativeToggle.checked : false;

    const geoData = await JS.fetchGeographicalData(gcfIds, jobId, filterPutative);
    JS.displayGeographicalData(geoData);

    if (typeof JS.updateBiomeChart === 'function') {
      JS.updateBiomeChart(gcfIds, null, jobId, filterPutative);
    }
  };
})(window);
