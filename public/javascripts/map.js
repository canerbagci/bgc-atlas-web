async function createMap() {
    const map = initBaseMap();
    const { clusterGroup, markerIds } = await loadMarkers(map);
    initDrawTools(map, clusterGroup, markerIds);
    initInspectButton(map, markerIds);
}

/* ---------- helpers ---------- */

function initBaseMap() {
    const map = L.map("map", {
        center: [0, 0],
        zoom: 2,
        maxBounds: [[-90, -180], [90, 180]],
        worldCopyJump: true,
        zoomSnap: 0.5,
    });

    L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        {
            minZoom: 2,
            maxZoom: 9,
            attribution:
                "© Carto, © OpenStreetMap contributors",
        },
    ).addTo(map);

    L.control.scale({ imperial: true, metric: true }).addTo(map);
    return map;
}

async function loadMarkers(map) {
    const clusterGroup = L.markerClusterGroup();
    const markerIds = new Map();          // marker → assembly ID

    try {
        const response = await fetch("/map-data");
        const points = await response.json();

        points
            .filter(
                ({ latitude, longitude }) =>
                    Number.isFinite(latitude) && Number.isFinite(longitude),
            )
            .forEach(({ latitude, longitude, assembly }) => {
                const marker = L.marker([latitude, longitude]).bindPopup(
                    `<a href="/antismash?dataset=${assembly}" target="_blank">${assembly}</a>`,
                );
                markerIds.set(marker, assembly);
                clusterGroup.addLayer(marker);
            });

        map.addLayer(clusterGroup);

        // Fit once everything is on the map (skip if empty)
        if (clusterGroup.getLayers().length) {
            map.fitBounds(clusterGroup.getBounds(), { padding: [20, 20] });
        }
    } catch (err) {
        console.error(err);
        alert("⚠️  Couldn’t load marker data.");
    }

    return { clusterGroup, markerIds };
}

function initDrawTools(map, clusterGroup, markerIds) {
    const drawnItems = new L.FeatureGroup().addTo(map);

    new L.Control.Draw({
        draw: {
            rectangle: true,
            polyline: polygon = circle = marker = circlemarker = false,
        },
        edit: { featureGroup: drawnItems },
    }).addTo(map);

    map.on("draw:created", ({ layer }) => {
        const bounds = layer.getBounds();
        const selected = [];
        clusterGroup.eachLayer((m) => {
            if (bounds.contains(m.getLatLng())) selected.push(markerIds.get(m));
        });
        layer._selectedIds = selected;      // stash for the inspect button
        drawnItems.clearLayers().addLayer(layer);
    });
}

function initInspectButton(map, markerIds) {
    const InspectControl = L.Control.extend({
        onAdd() {
            const btn = L.DomUtil.create(
                "button",
                "leaflet-control-inspect leaflet-bar",
            );
            btn.textContent = "Inspect";

            L.DomEvent.on(btn, "click", () => {
                // Gather selected IDs from drawn layers
                const ids = [];
                map.eachLayer((l) => {
                    if (Array.isArray(l._selectedIds)) ids.push(...l._selectedIds);
                });

                if (ids.length) {
                    const url = `https://bgc-atlas.cs.uni-tuebingen.de/bgcs?samples=${encodeURIComponent(ids.join(","))}`;
                    window.open(url, "_blank");
                } else {
                    alert("Draw a rectangle first.");
                }
            });

            return btn;
        },
    });

    new InspectControl({ position: "topright" }).addTo(map);
}