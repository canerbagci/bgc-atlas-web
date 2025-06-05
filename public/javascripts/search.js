let selectedFiles = [];

function registerFiles(event) {
    event.preventDefault();
    const input = document.getElementById('formFile');
    const fileList = document.getElementById('fileList');

    const newFiles = Array.from(input.files);

    // Filter out files that are already in the selectedFiles array
    const uniqueNewFiles = newFiles.filter(file => {
        const fileName = file.name.toLowerCase();
        const fileExtension = fileName.split('.').pop();

        // Only allow files with the extension 'gbk' or 'genbank'
        if (fileExtension !== 'gbk' && fileExtension !== 'genbank') {
            alert(`Invalid file type: ${fileName}. Please upload files with '.gbk' or '.genbank' extensions.`);
            return false;
        }

        return !selectedFiles.some(existingFile => existingFile.name === file.name && existingFile.size === file.size && existingFile.lastModified === file.lastModified);
    });

    selectedFiles = selectedFiles.concat(uniqueNewFiles);

    updateFileListDisplay();
    toggleSubmitButton(); // Call here to update the submit button state
}

function updateFileListDisplay() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';

    selectedFiles.forEach((file, index) => {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.textContent = file.name;
        const removeButton = document.createElement('button');
        removeButton.textContent = 'X';
        removeButton.className = 'btn btn-danger btn-sm float-end';
        removeButton.onclick = () => removeFile(index);
        cell.appendChild(removeButton);
        row.appendChild(cell);
        fileList.appendChild(row);
    });

    if (selectedFiles.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.className = 'colspan-4 text-center';
        cell.textContent = 'No files selected';
        row.appendChild(cell);
        fileList.appendChild(row);
    }

    toggleSubmitButton(); // Call here to update the submit button state
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateFileListDisplay();
    toggleSubmitButton(); // Call here to update the submit button state
}

function submitFiles() {
    if (selectedFiles.length === 0) {
        alert('No files selected');
        return;
    }

    const submitButton = document.getElementById('submitButton');
    const uploadButton = document.getElementById('uploadButton');

    submitButton.disabled = true;
    uploadButton.disabled = true;

    const formData = new FormData();
    selectedFiles.forEach(file => formData.append('file', file));

    // Get CSRF token from the hidden input field
    const csrfToken = document.querySelector('input[name="_csrf"]').value;

    fetch('/upload', {
        method: 'POST',
        headers: {
            'x-csrf-token': csrfToken
        },
        body: formData,
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        // Store job ID in local storage
        if (data.jobId) {
            // Save the job ID to the list of previous jobs
            saveJobId(data.jobId);

            // Store timestamp for this job
            localStorage.setItem(`job_${data.jobId}_timestamp`, Date.now().toString());

            // Refresh the list of previous jobs
            displayPreviousJobs();

            // Redirect to job status page
            window.location.href = `/job/${data.jobId}`;
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

// displayResults function removed as results are now shown on the job status page

function toggleSubmitButton() {
    const submitButton = document.getElementById('submitButton');
    if (submitButton) {
        submitButton.disabled = selectedFiles.length === 0;
    }
}

function updateJobIdDisplay(jobId) {
    const jobIdDisplay = document.getElementById('jobIdDisplay');
    if (jobIdDisplay) {
        jobIdDisplay.textContent = jobId;
        jobIdDisplay.parentElement.classList.remove('d-none');
    }
}

function checkJobStatus(jobId) {
    fetch(`/jobs/${jobId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(job => {
            const status = document.getElementById('status');
            status.innerHTML = `<strong>Status:</strong> ${job.status}`;

            // No automatic redirect, just update the status
            if (job.status === 'queued' || job.status === 'running') {
                // Check again in 5 seconds
                setTimeout(() => checkJobStatus(jobId), 5000);
            }

            // Update job ID display
            updateJobIdDisplay(jobId);
        })
        .catch(error => {
            console.error('Error checking job status:', error);
        });
}

// Function to get previous job IDs from local storage
function getPreviousJobIds() {
    const jobIdsString = localStorage.getItem('previousJobIds');
    if (jobIdsString) {
        try {
            return JSON.parse(jobIdsString);
        } catch (error) {
            console.error('Error parsing previous job IDs:', error);
            return [];
        }
    }
    return [];
}

// Function to save a job ID to local storage
function saveJobId(jobId) {
    const previousJobIds = getPreviousJobIds();

    // Add the new job ID if it's not already in the list
    if (!previousJobIds.includes(jobId)) {
        // Add to the beginning of the array (most recent first)
        previousJobIds.unshift(jobId);

        // Limit to 10 most recent jobs
        const limitedJobIds = previousJobIds.slice(0, 10);

        // Save back to local storage
        localStorage.setItem('previousJobIds', JSON.stringify(limitedJobIds));
    }
}

// Function to display previous jobs
function displayPreviousJobs() {
    const previousJobIds = getPreviousJobIds();
    const previousJobsList = document.getElementById('previousJobsList');

    if (previousJobsList) {
        // Clear the list
        previousJobsList.innerHTML = '';

        if (previousJobIds.length === 0) {
            // No previous jobs
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item text-center';
            listItem.textContent = 'No previous jobs found';
            previousJobsList.appendChild(listItem);
        } else {
            // Display each job as a link
            previousJobIds.forEach(jobId => {
                const listItem = document.createElement('li');
                listItem.className = 'list-group-item';

                const link = document.createElement('a');
                link.href = `/job/${jobId}`;
                link.textContent = `Job ${jobId}`;
                link.className = 'text-decoration-none';

                // Add a timestamp if available
                const timestamp = localStorage.getItem(`job_${jobId}_timestamp`);
                if (timestamp) {
                    const date = new Date(parseInt(timestamp));
                    const formattedDate = date.toLocaleString();
                    const small = document.createElement('small');
                    small.className = 'text-muted ms-2';
                    small.textContent = formattedDate;
                    link.appendChild(small);
                }

                listItem.appendChild(link);
                previousJobsList.appendChild(listItem);
            });
        }
    }
}

// Function to fetch and display queue status
function fetchQueueStatus() {
    fetch('/jobs/queue/status')
        .then(response => response.json())
        .then(data => {
            const queueStatusContainer = document.getElementById('queueStatusContainer');
            const queuedJobsCount = document.getElementById('queuedJobsCount');
            const runningJobsCount = document.getElementById('runningJobsCount');
            const totalJobsProcessed = document.getElementById('totalJobsProcessed');

            if (queueStatusContainer) {
                if (queuedJobsCount) {
                    queuedJobsCount.textContent = data.queuedJobs;
                }

                if (runningJobsCount) {
                    runningJobsCount.textContent = data.runningJobs;
                }

                if (totalJobsProcessed) {
                    totalJobsProcessed.textContent = data.completedJobs;
                }
            }
        })
        .catch(error => {
            console.error('Error fetching queue status:', error);
        });
}

// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the Submit button state
    toggleSubmitButton();

    // Initialize tooltips
    if (typeof $ !== 'undefined' && $.fn.tooltip) {
        $('[data-bs-toggle="tooltip"]').tooltip();
    }

    // Fetch queue status on page load
    fetchQueueStatus();

    // Fetch queue status every 30 seconds
    setInterval(fetchQueueStatus, 30000);

    // Add event listener for form submission
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', registerFiles);
    }

    // Add event listener for submit button
    const submitButton = document.getElementById('submitButton');
    if (submitButton) {
        submitButton.addEventListener('click', submitFiles);
    }

    // Display previous jobs from local storage
    displayPreviousJobs();

    // Listen for server-sent events
    const eventSource = new EventSource('/events');
    eventSource.onmessage = function (event) {
        const data = JSON.parse(event.data);
        const status = document.getElementById('status');

        status.innerHTML = `<strong>Status:</strong> ${data.status || 'Idle'}`;

        // Store job ID if provided
        if (data.jobId) {
            // Save the job ID to the list of previous jobs
            saveJobId(data.jobId);

            // Store timestamp for this job if not already stored
            if (!localStorage.getItem(`job_${data.jobId}_timestamp`)) {
                localStorage.setItem(`job_${data.jobId}_timestamp`, Date.now().toString());
            }

            updateJobIdDisplay(data.jobId);

            // Refresh the list of previous jobs
            displayPreviousJobs();
        }

        // Update queue status if this is a connection event or if queue information changed
        if (data.type === 'connection' || data.queuePosition) {
            fetchQueueStatus();
        }
    };

    // Add job ID lookup form handler
    const lookupForm = document.getElementById('jobLookupForm');
    if (lookupForm) {
        lookupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const jobIdInput = document.getElementById('jobIdInput');
            const jobId = jobIdInput.value.trim();

            if (jobId) {
                // Save the job ID to the list of previous jobs
                saveJobId(jobId);

                // Store timestamp for this job if not already stored
                if (!localStorage.getItem(`job_${jobId}_timestamp`)) {
                    localStorage.setItem(`job_${jobId}_timestamp`, Date.now().toString());
                }

                // Redirect to job status page
                window.location.href = `/job/${jobId}`;
            }
        });
    }
});
