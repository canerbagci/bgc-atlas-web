// Store the original results data
let originalResults = [];

// Define the threshold for putative BGCs
const PUTATIVE_THRESHOLD = 0.4;

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
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing job status page');

    // Set up the hide putative toggle
    handleHidePutativeToggle();

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
            }
        } else {
            console.log('Ignoring SSE event for different job or without job ID');
        }
    };
});
