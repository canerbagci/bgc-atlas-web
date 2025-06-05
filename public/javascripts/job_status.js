// Store the original results data
let originalResults = [];

// Define the threshold for putative BGCs
const PUTATIVE_THRESHOLD = 0.4;

// Store the map instance
let map = null;

// Store the markers layer
let markers = null;

// Store the biome chart instance
let biomeChart = null;

// Store the raw biome data
let rawBiomeData = [];

// Function to display results in the table
function displayResults(data, filterPutative = false) {
    // Store the original data
    if (!filterPutative) {
        originalResults = [...data];
    }

    const results = document.getElementById('results');
    results.innerHTML = '';

    // Filter data if needed
    let filteredData = data;
    if (filterPutative) {
        filteredData = data.filter(item => parseFloat(item.membership_value) <= PUTATIVE_THRESHOLD);
    }

    if (filteredData.length > 0) {
        filteredData.forEach(item => {
            const row = document.createElement('tr');
            const nameCell = document.createElement('td');
            const idCell = document.createElement('td');
            const valueCell = document.createElement('td');

            nameCell.textContent = item.bgc_name;

            // Create a link for the GCF ID
            const gcfLink = document.createElement('a');
            gcfLink.href = `https://bgc-atlas.cs.uni-tuebingen.de/bgcs?gcf=${item.gcf_id}`;
            gcfLink.textContent = item.gcf_id;
            gcfLink.target = '_blank';
            idCell.appendChild(gcfLink);

            valueCell.textContent = item.membership_value;

            // Add putative-bgc class if membership value is greater than the threshold
            if (parseFloat(item.membership_value) > PUTATIVE_THRESHOLD) {
                row.classList.add('putative-bgc');
            }

            row.appendChild(nameCell);
            row.appendChild(idCell);
            row.appendChild(valueCell);
            results.appendChild(row);
        });
    } else {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 3;
        cell.className = 'text-center';
        cell.textContent = 'No hits found';
        row.appendChild(cell);
        results.appendChild(row);
    }
}

// Function to update the job ID display
function updateJobIdDisplay(jobId) {
    const jobIdDisplay = document.getElementById('jobIdDisplay');
    if (jobIdDisplay) {
        jobIdDisplay.textContent = jobId;
    }
}

// Function to load job results
function loadJobResults(jobId) {
    console.log(`Loading results for job ${jobId}`);
    // Add cache-busting parameter to prevent caching
    const timestamp = new Date().getTime();
    fetch(`/jobs/${jobId}/results?_=${timestamp}`)
        .then(response => {
            console.log(`Response status: ${response.status}`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`Received ${data.length} results:`, data);

            // Check if the hide putative toggle is checked
            const hidePutativeToggle = document.getElementById('hidePutativeToggle');
            const filterPutative = hidePutativeToggle ? hidePutativeToggle.checked : false;

            // Display results with or without filtering
            displayResults(data, filterPutative);

            // Update the map with the results
            updateMapWithResults(data, filterPutative);

            // Hide loading indicator
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) {
                loadingIndicator.classList.add('d-none');
            }
        })
        .catch(error => {
            console.error('Error loading job results:', error);
            const status = document.getElementById('status');
            status.innerHTML = `<strong>Status:</strong> Error loading results`;

            // Hide loading indicator
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) {
                loadingIndicator.classList.add('d-none');
            }
        });
}

// Function to check job status
function checkJobStatus(jobId) {
    console.log(`Checking status for job ${jobId}`);
    // Add cache-busting parameter to prevent caching
    const timestamp = new Date().getTime();
    fetch(`/jobs/${jobId}?_=${timestamp}`)
        .then(response => {
            console.log(`Response status: ${response.status}`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(job => {
            console.log(`Job status: ${job.status}`, job);
            const status = document.getElementById('status');
            status.innerHTML = `<strong>Status:</strong> ${job.status}`;

            // Show/hide queue information based on job status
            const queueInfo = document.getElementById('queueInfo');
            if (queueInfo) {
                if (job.status === 'queued' && job.queueInfo) {
                    // Update queue information
                    const queuePosition = document.getElementById('queuePosition');
                    const totalJobs = document.getElementById('totalJobs');
                    const estimatedTime = document.getElementById('estimatedTime');

                    if (queuePosition) queuePosition.textContent = job.queueInfo.queuePosition;
                    if (totalJobs) totalJobs.textContent = job.queueInfo.totalJobs;

                    // Calculate estimated wait time (rough estimate: 2 minutes per job ahead in queue)
                    if (estimatedTime && job.queueInfo.queuePosition > 1) {
                        const jobsAhead = job.queueInfo.queuePosition - 1;
                        const estimatedMinutes = jobsAhead * 2;
                        estimatedTime.textContent = `Estimated wait time: approximately ${estimatedMinutes} minutes`;
                    } else if (estimatedTime) {
                        estimatedTime.textContent = 'Your job is next in the queue!';
                    }

                    queueInfo.classList.remove('d-none');
                } else {
                    queueInfo.classList.add('d-none');
                }
            }

            // Show/hide loading indicator based on job status
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) {
                if (job.status === 'running') {
                    loadingIndicator.classList.remove('d-none');
                } else {
                    loadingIndicator.classList.add('d-none');
                }
            }

            // Check for both lowercase 'completed' and capitalized 'Complete'
            if (job.status === 'completed' || job.status === 'Complete') {
                console.log(`Job ${jobId} is completed, loading results`);
                loadJobResults(jobId);
            } else if (job.status === 'queued' || job.status === 'running') {
                console.log(`Job ${jobId} is still running, checking again in 5 seconds`);
                // Check again in 5 seconds
                setTimeout(() => checkJobStatus(jobId), 5000);
            } else {
                console.log(`Job ${jobId} has status ${job.status}, not loading results`);
            }
        })
        .catch(error => {
            console.error('Error checking job status:', error);
            const status = document.getElementById('status');
            status.innerHTML = `<strong>Status:</strong> Error checking job status`;

            // Hide loading indicator
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) {
                loadingIndicator.classList.add('d-none');
            }
        });
}

// Function to handle the hide putative toggle
function handleHidePutativeToggle() {
    const hidePutativeToggle = document.getElementById('hidePutativeToggle');
    if (hidePutativeToggle) {
        hidePutativeToggle.addEventListener('change', function() {
            // Re-display results with or without filtering
            displayResults(originalResults, this.checked);

            // Update the map with the filtered results
            updateMapWithResults(originalResults, this.checked);

            // Update the biome chart with the filtered results
            const gcfIds = collectGcfIds(originalResults, this.checked);

            // Get the current selected level from the dropdown
            const biomeLevelSelect = document.getElementById('biomeLevelSelect');
            const level = biomeLevelSelect ? biomeLevelSelect.value : '1';

            // Update the biome chart with the current level
            updateBiomeChart(gcfIds, level);
        });
    }
}

// Function to initialize the map
function initializeMap() {
    // Check if map is already initialized
    if (map) return;

    // Check if map container exists
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    // Initialize the map
    map = L.map('map').setView({lat: 0, lng: 0}, 2.5);

    // Set map bounds
    const southWest = L.latLng(-90, -180);
    const northEast = L.latLng(90, 180);
    const bounds = L.latLngBounds(southWest, northEast);

    map.setMaxBounds(bounds);
    map.on('drag', function () {
        map.panInsideBounds(bounds, {animate: false});
    });

    // Add the OpenStreetMap tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', {
        minZoom: 2,
        maxZoom: 9,
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    }).addTo(map);

    // Show the scale bar on the lower left corner
    L.control.scale({imperial: true, metric: true}).addTo(map);

    // Initialize the markers cluster group
    markers = L.markerClusterGroup();

    // Add the markers layer to the map
    map.addLayer(markers);

    // Invalidate size after a short delay to ensure proper rendering
    setTimeout(() => {
        map.invalidateSize();
    }, 100);

    console.log('Map initialized');

    // Add an observer to detect when the map container becomes visible
    // This is important for maps in tabs or collapsed sections
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && 
                (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
                map.invalidateSize();
                console.log('Map size invalidated due to visibility change');
            }
        });
    });

    // Start observing the map container for attribute changes
    observer.observe(mapContainer, { attributes: true });
}

// Function to collect GCF IDs from the results
function collectGcfIds(results, filterPutative = false) {
    // Filter results if needed
    let filteredResults = results;
    if (filterPutative) {
        filteredResults = results.filter(item => parseFloat(item.membership_value) <= PUTATIVE_THRESHOLD);
    }

    // Extract unique GCF IDs
    const gcfIds = [...new Set(filteredResults.map(item => item.gcf_id))];

    console.log(`Collected ${gcfIds.length} unique GCF IDs`);
    return gcfIds;
}

// Function to fetch geographical data for GCF IDs
async function fetchGeographicalData(gcfIds) {
    console.log(`Fetching geographical data for ${gcfIds.length} GCF IDs`);

    // Create an array to store all marker data
    let allMarkerData = [];

    // Fetch data for each GCF ID
    for (const gcfId of gcfIds) {
        try {
            // Extract the numeric part of the GCF ID if it's in the format "GCF_123"
            let gcfIdParam = gcfId;
            if (typeof gcfId === 'string' && gcfId.startsWith('GCF_')) {
                gcfIdParam = gcfId.substring(4); // Remove "GCF_" prefix
            }

            const response = await fetch(`/map-data-gcf?gcf=${gcfIdParam}`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            console.log(`Received ${data.length} geographical points for GCF ${gcfId}`);

            // Add the data to the array
            allMarkerData = allMarkerData.concat(data);
        } catch (error) {
            console.error(`Error fetching geographical data for GCF ${gcfId}:`, error);
        }
    }

    console.log(`Total geographical points: ${allMarkerData.length}`);
    return allMarkerData;
}

// Function to display geographical data on the map
function displayGeographicalData(data) {
    console.log(`Displaying ${data.length} geographical points on the map`);

    // Clear existing markers
    markers.clearLayers();

    // Variables to store the sum of all latitudes and longitudes
    let latSum = 0;
    let lngSum = 0;
    let count = 0;

    // Create a new LatLngBounds object
    const markerBounds = L.latLngBounds();

    // Add markers for each data point
    for (const point of data) {
        if (typeof point.longitude === 'string' && typeof point.latitude === 'string') {
            const lat = parseFloat(point.latitude);
            const lng = parseFloat(point.longitude);

            // Skip invalid coordinates
            if (isNaN(lat) || isNaN(lng)) continue;

            const marker = L.marker({
                lon: lng,
                lat: lat
            }).bindPopup(`<a href="https://www.ebi.ac.uk/metagenomics/samples/${point.sample}" target="_blank">${point.sample}</a>`);

            markers.addLayer(marker);

            // Extend the bounds with the marker's coordinates
            markerBounds.extend(marker.getLatLng());

            // Add the marker's latitude and longitude to the sums
            latSum += lat;
            lngSum += lng;
            count++;
        }
    }

    // Adjust the map view to the average latitude and longitude of all markers
    if (count > 0) {
        const avgLat = latSum / count;
        const avgLng = lngSum / count;
        map.setView([avgLat, avgLng]);
    }

    console.log(`Added ${count} markers to the map`);
}

// Function to update the map with results
async function updateMapWithResults(results, filterPutative = false) {
    console.log('Updating map with results');

    // Initialize the map if not already initialized
    initializeMap();

    // Collect GCF IDs from the results
    const gcfIds = collectGcfIds(results, filterPutative);

    // If no GCF IDs, clear the map and return
    if (gcfIds.length === 0) {
        markers.clearLayers();
        return;
    }

    // Fetch geographical data for the GCF IDs
    const geographicalData = await fetchGeographicalData(gcfIds);

    // Display the geographical data on the map
    displayGeographicalData(geographicalData);

    // Update the biome chart with the same GCF IDs
    updateBiomeChart(gcfIds);
}

// Function to fetch biome data for GCF IDs
async function fetchBiomeData(gcfIds) {
    console.log(`Fetching biome data for ${gcfIds.length} GCF IDs`);

    try {
        // Convert GCF IDs to a comma-separated string
        const gcfIdsParam = gcfIds.join(',');

        // Fetch biome data from the API
        const response = await fetch(`/biome-data-gcfs?gcfs=${encodeURIComponent(gcfIdsParam)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Received biome data: ${data.length} entries`);

        // Store the raw biome data
        rawBiomeData = data;

        return data;
    } catch (error) {
        console.error('Error fetching biome data:', error);
        return [];
    }
}

/**
 * Group biome records by a chosen hierarchy level and return
 * an array like [{ biome: "Human", count: 123 }, ...] sorted by count ↓.
 *
 * @param {Array<{biome: string, count: string|number}>} data
 * @param {number|string} [level=1] – 1-based depth in the “:” hierarchy
 * @returns {Array<{biome: string, count: number}>}
 */
function processBiomeDataByLevel(
    data,
    level = 1,
    topN = 15
) {
    const targetLevel = Number(level) >= 1 ? Number(level) : 1;
    const grouped     = new Map();                     // Map<levelName, numericCount>

    for (const { biome, count } of data) {
        const parts   = biome.split(':');
        const idx     = Math.min(targetLevel - 1, parts.length - 1);
        let   keyName = (parts[idx] ?? '').trim() || 'Unknown';

        // Flag missing depths, e.g. "Aquatic:undefined"
        if (targetLevel > parts.length) {
            keyName += ':undefined';
        }

        const nCount = Number(count) || 0;
        grouped.set(keyName, (grouped.get(keyName) || 0) + nCount);
    }

    // Sorted array of { biome, count }
    const sorted = [...grouped.entries()]
        .map(([biome, count]) => ({ biome, count }))
        .sort((a, b) => b.count - a.count);

    // Collapse the long tail into "Others"
    if (sorted.length > topN) {
        const top    = sorted.slice(0, topN);
        const others = sorted.slice(topN)
            .reduce((sum, { count }) => sum + count, 0);

        if (others > 0) {
            top.push({ biome: 'Others', count: others });  // always the last element
        }
        return top;
    }

    return sorted;   // fewer than topN rows → return as-is
}

// Function to create and update the biome chart
async function updateBiomeChart(gcfIds, level) {
    console.log('Updating biome chart');

    // Get the selected level from the dropdown if not provided
    if (!level) {
        const biomeLevelSelect = document.getElementById('biomeLevelSelect');
        level = biomeLevelSelect ? biomeLevelSelect.value : '1';
    }

    // Fetch biome data if not already available
    if (!rawBiomeData.length) {
        await fetchBiomeData(gcfIds);
    }

    if (rawBiomeData.length === 0) {
        console.log('No biome data available');
        // Clear the chart if it exists
        if (biomeChart) {
            biomeChart.destroy();
            biomeChart = null;
        }
        return;
    }

    console.log(rawBiomeData);

    // Process the biome data by the selected level
    const processedData = processBiomeDataByLevel(rawBiomeData, level);

    // Prepare data for the chart
    const labels = processedData.map(item => item.biome);
    const counts = processedData.map(item => item.count);

    console.log(labels);
    console.log(counts);

    // Get the canvas element
    const ctx = document.getElementById('biomeChart');
    if (!ctx) {
        console.error('Biome chart canvas not found');
        return;
    }

    // Destroy existing chart if it exists
    if (biomeChart) {
        biomeChart.destroy();
    }

    // Create a new chart
    biomeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Samples',
                data: counts,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Samples'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: `Biome (Level ${level})`
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                title: {
                    display: true,
                    text: `Biome Distribution of Hits (Level ${level})`
                }
            }
        }
    });

    console.log(`Biome chart created for level ${level}`);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing job status page');

    // Set up the hide putative toggle
    handleHidePutativeToggle();

    // Initialize the map
    initializeMap();

    // Set up biome level dropdown change event
    const biomeLevelSelect = document.getElementById('biomeLevelSelect');
    if (biomeLevelSelect) {
        biomeLevelSelect.addEventListener('change', function() {
            // Get the selected level
            const level = this.value;
            console.log(`Biome level changed to ${level}`);

            // Get the current GCF IDs from the results
            const hidePutativeToggle = document.getElementById('hidePutativeToggle');
            const filterPutative = hidePutativeToggle ? hidePutativeToggle.checked : false;
            const gcfIds = collectGcfIds(originalResults, filterPutative);

            // Update the chart with the new level
            updateBiomeChart(gcfIds, level);
        });
    }

    // Get job ID from server or URL
    let jobId;

    // Check if serverJobId is defined (passed from the server)
    if (typeof serverJobId !== 'undefined' && serverJobId) {
        console.log(`Using server-provided job ID: ${serverJobId}`);
        jobId = serverJobId;
    } else {
        // Fallback to URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        jobId = urlParams.get('jobId');
        console.log(`Using URL parameter job ID: ${jobId}`);
    }

    if (!jobId) {
        // No job ID provided, show error
        console.error('No job ID provided');
        const status = document.getElementById('status');
        status.innerHTML = `<strong>Status:</strong> No job ID provided`;
        return;
    }

    console.log(`Initializing job status page for job ID: ${jobId}`);

    // Update job ID display
    updateJobIdDisplay(jobId);

    // Start checking job status
    checkJobStatus(jobId);

    // Listen for server-sent events
    console.log('Setting up SSE event listener');
    const eventSource = new EventSource('/events');

    eventSource.onopen = function() {
        console.log('SSE connection opened');
    };

    eventSource.onerror = function(error) {
        console.error('SSE connection error:', error);
    };

    eventSource.onmessage = function (event) {
        console.log('Received SSE event:', event.data);
        const data = JSON.parse(event.data);

        // Only process events for this job
        if (data.jobId && data.jobId === jobId) {
            console.log(`Processing SSE event for job ${jobId}:`, data);
            const status = document.getElementById('status');
            status.innerHTML = `<strong>Status:</strong> ${data.status}`;

            // Show/hide queue information based on job status
            const queueInfo = document.getElementById('queueInfo');
            if (queueInfo) {
                if (data.status === 'Queued' && data.queuePosition) {
                    // Update queue information
                    const queuePosition = document.getElementById('queuePosition');
                    const totalJobs = document.getElementById('totalJobs');
                    const estimatedTime = document.getElementById('estimatedTime');

                    if (queuePosition) queuePosition.textContent = data.queuePosition;
                    if (totalJobs) totalJobs.textContent = data.totalJobs || 0;

                    // Calculate estimated wait time (rough estimate: 2 minutes per job ahead in queue)
                    if (estimatedTime && data.queuePosition > 1) {
                        const jobsAhead = data.queuePosition - 1;
                        const estimatedMinutes = jobsAhead * 2;
                        estimatedTime.textContent = `Estimated wait time: approximately ${estimatedMinutes} minutes`;
                    } else if (estimatedTime) {
                        estimatedTime.textContent = 'Your job is next in the queue!';
                    }

                    queueInfo.classList.remove('d-none');
                } else {
                    queueInfo.classList.add('d-none');
                }
            }

            // Show/hide loading indicator based on job status
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) {
                if (data.status === 'Running' || data.status === 'Uploading') {
                    loadingIndicator.classList.remove('d-none');
                } else {
                    loadingIndicator.classList.add('d-none');
                }
            }

            // If job is complete and has results, display them
            if (data.status === 'Complete' && data.records) {
                console.log(`Job ${jobId} is complete with ${data.records.length} results, displaying them`);

                // Check if the hide putative toggle is checked
                const hidePutativeToggle = document.getElementById('hidePutativeToggle');
                const filterPutative = hidePutativeToggle ? hidePutativeToggle.checked : false;

                // Display results with or without filtering
                displayResults(data.records, filterPutative);

                // Update the map with the results
                updateMapWithResults(data.records, filterPutative);
            }
        } else {
            console.log('Ignoring SSE event for different job or without job ID');
        }
    };
});
