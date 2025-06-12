(function(global){
  const JS = global.JobStatus || (global.JobStatus = {});
  JS.PUTATIVE_THRESHOLD = JS.PUTATIVE_THRESHOLD || 0.4;
  JS.originalResults = JS.originalResults || [];

  JS.displayResults = function(data, filterPutative = false){
    if(!filterPutative){
      JS.originalResults = [...data];
    }

    const results = document.getElementById('results');
    results.innerHTML = '';

    let filtered = data;
    if(filterPutative){
      filtered = data.filter(item => parseFloat(item.membership_value) <= JS.PUTATIVE_THRESHOLD);
    }

    if(filtered.length > 0){
      filtered.forEach(item => {
        const row = document.createElement('tr');
        const nameCell = document.createElement('td');
        const idCell = document.createElement('td');
        const valueCell = document.createElement('td');

        nameCell.textContent = item.bgc_name;

        const gcfLink = document.createElement('a');
        let base = (window.APP_URL || '');
        console.log(`Base URL: ${base}`);
        base = base.endsWith('/') ? base.slice(0, -1) : base;
        console.log(`Adjusted Base URL: ${base}`);
        gcfLink.href = `${base}/bgcs?gcf=${item.gcf_id}`;
        gcfLink.textContent = item.gcf_id;
        gcfLink.target = '_blank';
        idCell.appendChild(gcfLink);

        valueCell.textContent = item.membership_value;

        if(parseFloat(item.membership_value) > JS.PUTATIVE_THRESHOLD){
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
  };

  JS.updateJobIdDisplay = function(jobId){
    const el = document.getElementById('jobIdDisplay');
    if(el) el.textContent = jobId;
  };

  JS.loadJobResults = function(jobId){
    const hideToggle = document.getElementById('hidePutativeToggle');
    const filter = hideToggle ? hideToggle.checked : false;
    const ts = new Date().getTime();
    let url = `/jobs/${jobId}/results?_=${ts}`;
    if(filter){
      url += `&putativeThreshold=${JS.PUTATIVE_THRESHOLD}`;
    }

    fetch(url)
      .then(r => { if(!r.ok) throw new Error(`HTTP error! Status: ${r.status}`); return r.json(); })
      .then(data => {
        JS.originalResults = [...data];
        JS.displayResults(data, false);
        JS.updateMapWithResults(data, false);
        const loading = document.getElementById('loadingIndicator');
        if(loading) loading.classList.add('d-none');
      })
      .catch(err => {
        console.error('Error loading job results:', err);
        const status = document.getElementById('status');
        status.innerHTML = `<strong>Status:</strong> Error loading results`;
        const loading = document.getElementById('loadingIndicator');
        if(loading) loading.classList.add('d-none');
      });
  };

  JS.checkJobStatus = function(jobId){
    const ts = new Date().getTime();
    fetch(`/jobs/${jobId}?_=${ts}`)
      .then(r => { if(!r.ok) throw new Error(`HTTP error! Status: ${r.status}`); return r.json(); })
      .then(job => {
        const statusEl = document.getElementById('status');
        statusEl.innerHTML = `<strong>Status:</strong> ${job.status}`;

        const queueInfo = document.getElementById('queueInfo');
        if(queueInfo){
          if(job.status === 'queued' && job.queueInfo){
            const queuePosition = document.getElementById('queuePosition');
            const totalJobs = document.getElementById('totalJobs');
            const estimatedTime = document.getElementById('estimatedTime');
            if(queuePosition) queuePosition.textContent = job.queueInfo.queuePosition;
            if(totalJobs) totalJobs.textContent = job.queueInfo.totalJobs;
            if(estimatedTime && job.queueInfo.queuePosition > 1){
              const jobsAhead = job.queueInfo.queuePosition - 1;
              const estMin = jobsAhead * 2;
              estimatedTime.textContent = `Estimated wait time: approximately ${estMin} minutes`;
            } else if(estimatedTime){
              estimatedTime.textContent = 'Your job is next in the queue!';
            }
            queueInfo.classList.remove('d-none');
          } else {
            queueInfo.classList.add('d-none');
          }
        }

        const loading = document.getElementById('loadingIndicator');
        if(loading){
          if(job.status === 'running') loading.classList.remove('d-none');
          else loading.classList.add('d-none');
        }

        if(job.status === 'completed'){
          JS.loadJobResults(jobId);
        } else if(job.status === 'queued' || job.status === 'running'){
          setTimeout(() => JS.checkJobStatus(jobId), 5000);
        }
      })
      .catch(err => {
        console.error('Error checking job status:', err);
        const statusEl = document.getElementById('status');
        statusEl.innerHTML = `<strong>Status:</strong> Error checking job status`;
        const loading = document.getElementById('loadingIndicator');
        if(loading) loading.classList.add('d-none');
      });
  };

  JS.handleHidePutativeToggle = function(){
    const toggle = document.getElementById('hidePutativeToggle');
    if(toggle){
      toggle.addEventListener('change', function(){
        const jobIdDisplay = document.getElementById('jobIdDisplay');
        const jobId = jobIdDisplay ? jobIdDisplay.textContent : null;
        if(jobId){
          JS.loadJobResults(jobId);
        }
      });
    }
  };

  document.addEventListener('DOMContentLoaded', function(){
    JS.handleHidePutativeToggle();
    JS.initializeMap();

    const biomeLevelSelect = document.getElementById('biomeLevelSelect');
    if(biomeLevelSelect){
      biomeLevelSelect.addEventListener('change', function(){
        const level = this.value;
        const jobIdDisplay = document.getElementById('jobIdDisplay');
        const jobId = jobIdDisplay ? jobIdDisplay.textContent : null;
        const hideToggle = document.getElementById('hidePutativeToggle');
        const filter = hideToggle ? hideToggle.checked : false;
        const gcfIds = JS.collectGcfIds(JS.originalResults);
        JS.updateBiomeChart(gcfIds, level, jobId, filter);
      });
    }

    let jobId;
    if(typeof serverJobId !== 'undefined' && serverJobId){
      jobId = serverJobId;
    } else {
      const urlParams = new URLSearchParams(window.location.search);
      jobId = urlParams.get('jobId');
    }

    if(!jobId){
      const status = document.getElementById('status');
      status.innerHTML = `<strong>Status:</strong> No job ID provided`;
      return;
    }

    JS.updateJobIdDisplay(jobId);
    JS.checkJobStatus(jobId);

    // Try to use EventSource for real-time updates, with fallback to polling
    let usePolling = false;
    let eventSource;

    try {
      eventSource = new EventSource('/events');

      eventSource.onmessage = function(event){
        const data = JSON.parse(event.data);
        if(data.jobId && data.jobId === jobId){
          const statusEl = document.getElementById('status');
          statusEl.innerHTML = `<strong>Status:</strong> ${data.status}`;

          const queueInfo = document.getElementById('queueInfo');
          if(queueInfo){
            if(data.status === 'Queued' && data.queuePosition){
              const queuePosition = document.getElementById('queuePosition');
              const totalJobs = document.getElementById('totalJobs');
              const estimatedTime = document.getElementById('estimatedTime');
              if(queuePosition) queuePosition.textContent = data.queuePosition;
              if(totalJobs) totalJobs.textContent = data.totalJobs || 0;
              if(estimatedTime && data.queuePosition > 1){
                const jobsAhead = data.queuePosition - 1;
                const estMin = jobsAhead * 2;
                estimatedTime.textContent = `Estimated wait time: approximately ${estMin} minutes`;
              } else if(estimatedTime){
                estimatedTime.textContent = 'Your job is next in the queue!';
              }
              queueInfo.classList.remove('d-none');
            } else {
              queueInfo.classList.add('d-none');
            }
          }

          const loading = document.getElementById('loadingIndicator');
          if(loading){
            if(data.status === 'Running' || data.status === 'Uploading'){ loading.classList.remove('d-none'); }
            else { loading.classList.add('d-none'); }
          }

          if(data.status === 'completed' && data.records){
            const hideToggle = document.getElementById('hidePutativeToggle');
            const filter = hideToggle ? hideToggle.checked : false;
            JS.displayResults(data.records, filter);
            JS.updateMapWithResults(data.records, filter);
          }
        }
      };

      // Handle EventSource errors
      eventSource.onerror = function(event) {
        console.info('EventSource connection failed - falling back to polling');
        // Close the connection and fall back to polling
        eventSource.close();
        usePolling = true;
        // Start polling immediately
        JS.checkJobStatus(jobId);
      };
    } catch (error) {
      console.info('EventSource not supported or failed to initialize:', error);
      usePolling = true;
      // Start polling immediately
      JS.checkJobStatus(jobId);
    }

    // If we're using polling, don't call checkJobStatus initially as it will be called by the error handler
  });
})(window);
