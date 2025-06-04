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

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
        .catch(error => {
            console.error('Error:', error);
        });
}

function displayResults(data) {
    const results = document.getElementById('results');
    results.innerHTML = '';

    if (data.length > 0) {
        data.forEach(item => {
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

            // Add putative-bgc class if membership value is less than 0.405
            console.log(parseFloat(item.membership_value));
            if (parseFloat(item.membership_value) > 0.405) {
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
        cell.className = 'colspan-3 text-center';
        cell.textContent = 'No results to display';
        row.appendChild(cell);
        results.appendChild(row);
    }
}

function toggleSubmitButton() {
    const submitButton = document.getElementById('submitButton');
    if (submitButton) {
        submitButton.disabled = selectedFiles.length === 0;
    }
}

// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the Submit button state
    toggleSubmitButton();
    
    // Initialize tooltips
    if (typeof $ !== 'undefined' && $.fn.tooltip) {
        $('[data-bs-toggle="tooltip"]').tooltip();
    }
    
    // Listen for server-sent events
    const eventSource = new EventSource('/events');
    eventSource.onmessage = function (event) {
        const data = JSON.parse(event.data);
        const status = document.getElementById('status');

        if (data.status === 'Complete') {
            displayResults(data.records);
        }

        status.innerHTML = `<strong>Status:</strong> ${data.status}`;
    };
});