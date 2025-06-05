// Job status polling and result handling

let originalResults = [];

function displayResults(data, filterPutative = false) {
    if (!filterPutative) {
        originalResults = [...data];
    }
    const results = document.getElementById('results');
    results.innerHTML = '';
    let filteredData = data;
    if (filterPutative) {
        filteredData = data.filter(item => parseFloat(item.membership_value) <= window.PUTATIVE_THRESHOLD);
    }
    if (filteredData.length > 0) {
        filteredData.forEach(item => {
            const row = document.createElement('tr');
            const nameCell = document.createElement('td');
            const idCell = document.createElement('td');
            const valueCell = document.createElement('td');
            nameCell.textContent = item.bgc_name;
            const gcfLink = document.createElement('a');
            gcfLink.href = `https://bgc-atlas.cs.uni-tuebingen.de/bgcs?gcf=${item.gcf_id}`;
            gcfLink.textContent = item.gcf_id;
            gcfLink.target = '_blank';
            idCell.appendChild(gcfLink);
            valueCell.textContent = item.membership_value;
            if (parseFloat(item.membership_value) > window.PUTATIVE_THRESHOLD) {
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

function updateJobIdDisplay(jobId) {
    const jobIdDisplay = document.getElementById('jobIdDisplay');
    if (jobIdDisplay) {
        jobIdDisplay.textContent = jobId;
    }
}

function loadJobResults(jobId) {
    const timestamp = new Date().getTime();
    fetch(`/jobs/${jobId}/results?_=${timestamp}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const hidePutativeToggle = document.getElementById('hidePutativeToggle');
            const filterPutative = hidePutativeToggle ? hidePutativeToggle.checked : false;
            displayResults(data, filterPutative);
            updateMapWithResults(data, filterPutative);
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) {
                loadingIndicator.classList.add('d-none');
            }
        })
        .catch(error => {
            console.error('Error loading job results:', error);
            const status = document.getElementById('status');
            status.innerHTML = `<strong>Status:</strong> Error loading results`;
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) {
                loadingIndicator.classList.add('d-none');
            }
        });
}

function checkJobStatus(jobId) {
    const timestamp = new Date().getTime();
    fetch(`/jobs/${jobId}?_=${timestamp}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(job => {
            const status = document.getElementById('status');
            status.innerHTML = `<strong>Status:</strong> ${job.status}`;
            const queueInfo = document.getElementById('queueInfo');
            if (queueInfo) {
                if (job.status === 'queued' && job.queueInfo) {
                    const queuePosition = document.getElementById('queuePosition');
                    const totalJobs = document.getElementById('totalJobs');
                    const estimatedTime = document.getElementById('estimatedTime');
                    if (queuePosition) queuePosition.textContent = job.queueInfo.queuePosition;
                    if (totalJobs) totalJobs.textContent = job.queueInfo.totalJobs;
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
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) {
                if (job.status === 'running') {
                    loadingIndicator.classList.remove('d-none');
                } else {
                    loadingIndicator.classList.add('d-none');
                }
            }
            if (job.status === 'completed') {
                loadJobResults(jobId);
            } else if (job.status === 'queued' || job.status === 'running') {
                setTimeout(() => checkJobStatus(jobId), 5000);
            }
        })
        .catch(error => {
            console.error('Error checking job status:', error);
            const status = document.getElementById('status');
            status.innerHTML = `<strong>Status:</strong> Error checking job status`;
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) {
                loadingIndicator.classList.add('d-none');
            }
        });
}

function handleHidePutativeToggle() {
    const hidePutativeToggle = document.getElementById('hidePutativeToggle');
    if (hidePutativeToggle) {
        hidePutativeToggle.addEventListener('change', function() {
            displayResults(originalResults, this.checked);
            updateMapWithResults(originalResults, this.checked);
            const gcfIds = collectGcfIds(originalResults, this.checked);
            const biomeLevelSelect = document.getElementById('biomeLevelSelect');
            const level = biomeLevelSelect ? biomeLevelSelect.value : '1';
            updateBiomeChart(gcfIds, level);
        });
    }
}

document.addEventListener('DOMContentLoaded', function() {
    handleHidePutativeToggle();
    initializeMap();
    const biomeLevelSelect = document.getElementById('biomeLevelSelect');
    if (biomeLevelSelect) {
        biomeLevelSelect.addEventListener('change', function() {
            const hidePutativeToggle = document.getElementById('hidePutativeToggle');
            const filterPutative = hidePutativeToggle ? hidePutativeToggle.checked : false;
            const gcfIds = collectGcfIds(originalResults, filterPutative);
            const level = this.value;
            updateBiomeChart(gcfIds, level);
        });
    }
    let jobId;
    if (typeof serverJobId !== 'undefined' && serverJobId) {
        jobId = serverJobId;
    } else {
        const urlParams = new URLSearchParams(window.location.search);
        jobId = urlParams.get('jobId');
    }
    if (!jobId) {
        const status = document.getElementById('status');
        status.innerHTML = `<strong>Status:</strong> No job ID provided`;
        return;
    }
    updateJobIdDisplay(jobId);
    checkJobStatus(jobId);
    const eventSource = new EventSource('/events');
    eventSource.onmessage = function (event) {
        const data = JSON.parse(event.data);
        if (data.jobId && data.jobId === jobId) {
            const status = document.getElementById('status');
            status.innerHTML = `<strong>Status:</strong> ${data.status}`;
            const queueInfo = document.getElementById('queueInfo');
            if (queueInfo) {
                if (data.status === 'Queued' && data.queuePosition) {
                    const queuePosition = document.getElementById('queuePosition');
                    const totalJobs = document.getElementById('totalJobs');
                    const estimatedTime = document.getElementById('estimatedTime');
                    if (queuePosition) queuePosition.textContent = data.queuePosition;
                    if (totalJobs) totalJobs.textContent = data.totalJobs || 0;
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
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) {
                if (data.status === 'Running' || data.status === 'Uploading') {
                    loadingIndicator.classList.remove('d-none');
                } else {
                    loadingIndicator.classList.add('d-none');
                }
            }
            if (data.status === 'completed' && data.records) {
                const hidePutativeToggle = document.getElementById('hidePutativeToggle');
                const filterPutative = hidePutativeToggle ? hidePutativeToggle.checked : false;
                displayResults(data.records, filterPutative);
                updateMapWithResults(data.records, filterPutative);
            }
        }
    };
});
