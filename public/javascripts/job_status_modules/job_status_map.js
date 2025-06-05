// Map handling functions for job status page

let map = null;
let markers = null;

function initializeMap() {
    // Check if map is already initialized
    if (map) return;

    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    map = L.map('map').setView({lat: 0, lng: 0}, 2.5);

    const southWest = L.latLng(-90, -180);
    const northEast = L.latLng(90, 180);
    const bounds = L.latLngBounds(southWest, northEast);

    map.setMaxBounds(bounds);
    map.on('drag', function () {
        map.panInsideBounds(bounds, {animate: false});
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', {
        minZoom: 2,
        maxZoom: 9,
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    }).addTo(map);

    L.control.scale({imperial: true, metric: true}).addTo(map);

    markers = L.markerClusterGroup();
    map.addLayer(markers);

    setTimeout(() => {
        map.invalidateSize();
    }, 100);

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' &&
                (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
                map.invalidateSize();
            }
        });
    });

    observer.observe(mapContainer, { attributes: true });
}

function collectGcfIds(results, filterPutative = false) {
    let filteredResults = results;
    if (filterPutative) {
        filteredResults = results.filter(item => parseFloat(item.membership_value) <= window.PUTATIVE_THRESHOLD);
    }
    return [...new Set(filteredResults.map(item => item.gcf_id))];
}

async function fetchGeographicalData(gcfIds) {
    let allMarkerData = [];
    for (const gcfId of gcfIds) {
        try {
            let gcfIdParam = gcfId;
            if (typeof gcfId === 'string' && gcfId.startsWith('GCF_')) {
                gcfIdParam = gcfId.substring(4);
            }
            const response = await fetch(`/map-data-gcf?gcf=${gcfIdParam}`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            allMarkerData = allMarkerData.concat(data);
        } catch (error) {
            console.error(`Error fetching geographical data for GCF ${gcfId}:`, error);
        }
    }
    return allMarkerData;
}

function displayGeographicalData(data) {
    markers.clearLayers();
    let latSum = 0;
    let lngSum = 0;
    let count = 0;
    const markerBounds = L.latLngBounds([]);

    for (const point of data) {
        if (point.latitude && point.longitude) {
            const lat = parseFloat(point.latitude);
            const lng = parseFloat(point.longitude);
            if (isNaN(lat) || isNaN(lng)) continue;
            const marker = L.marker({
                lon: lng,
                lat: lat
            }).bindPopup(`<a href="https://www.ebi.ac.uk/metagenomics/samples/${point.sample}" target="_blank">${point.sample}</a>`);
            markers.addLayer(marker);
            markerBounds.extend(marker.getLatLng());
            latSum += lat;
            lngSum += lng;
            count++;
        }
    }

    if (count > 0) {
        const avgLat = latSum / count;
        const avgLng = lngSum / count;
        map.setView([avgLat, avgLng]);
    }
}

async function updateMapWithResults(results, filterPutative = false) {
    initializeMap();
    const gcfIds = collectGcfIds(results, filterPutative);
    if (gcfIds.length === 0) {
        markers.clearLayers();
        return;
    }
    const geographicalData = await fetchGeographicalData(gcfIds);
    displayGeographicalData(geographicalData);
    if (typeof updateBiomeChart === 'function') {
        updateBiomeChart(gcfIds);
    }
}
