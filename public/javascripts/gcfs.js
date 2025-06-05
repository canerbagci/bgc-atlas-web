function getInfo() {
    $.ajax({
        url: '/bgc-info',
        type: 'GET',
        dataType: 'json',
        success: function(results) {
            $("#gcf-count").html("Total GCFs: " + results[0].gcf_count);
            $("#mean-gcf").html("Mean #BGC per GCF: " + results[0].meanbgc);
        }
    });
}

function plotGCFChart() {
    $.ajax({
        url: '/gcf-category-count',
        type: 'GET',
        dataType: 'json',
        success: function(results) {
            const labels = results.map((row) => row.bgc_type);
            const data = results.map((row) => row.unique_families);

            const canvas = $('#gcf-category-chart')[0];
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Create a gradient color scheme for improved visuals
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(171, 71, 188, 0.9)'); // light purple
            gradient.addColorStop(1, 'rgba(123, 31, 162, 0.7)');  // dark purple

            const chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'GCFs by Category',
                            data: data,
                            backgroundColor: gradient,
                            borderColor: 'rgba(123, 31, 162, 1)',
                            borderWidth: 2,
                            borderRadius: 5,
                            hoverBackgroundColor: 'rgba(171, 71, 188, 1)',
                            hoverBorderColor: 'rgba(74, 20, 140, 1)',
                            hoverBorderWidth: 2,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 1000,
                        easing: 'easeOutQuart'
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                font: {
                                    size: 14,
                                    weight: 'bold'
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(200, 200, 200, 0.3)'
                            },
                            ticks: {
                                font: {
                                    weight: 'bold'
                                }
                            }
                        }
                    }
                },
            });
        }
    });
}

function plotGCFCountHist() {
    $.ajax({
        url: '/gcf-count-hist',
        type: 'GET',
        dataType: 'json',
        success: function(results) {
            const labels = results.map((row) => row.bucket_range);
            const data = results.map((row) => row.count_in_bucket);

            const canvas = $('#gcf-count-hist-chart')[0];
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Create a gradient color scheme
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(77, 182, 172, 0.9)');  // light teal
            gradient.addColorStop(1, 'rgba(38, 166, 154, 0.7)');   // dark teal

            const chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Histogram of BGC counts per GCF',
                            data: data,
                            backgroundColor: gradient,
                            borderColor: 'rgba(0, 131, 143, 1)',
                            borderWidth: 2,
                            borderRadius: 5,
                            hoverBackgroundColor: 'rgba(77, 182, 172, 1)',
                            hoverBorderColor: 'rgba(0, 77, 64, 1)',
                            hoverBorderWidth: 2,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 1000,
                        easing: 'easeOutQuart'
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                font: {
                                    size: 14,
                                    weight: 'bold'
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                autoSkip: false,
                                font: {
                                    weight: 'bold'
                                }
                            },
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            type: 'logarithmic',
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(200, 200, 200, 0.3)'
                            },
                            ticks: {
                                font: {
                                    weight: 'bold'
                                }
                            }
                        }
                    }
                },
            });
        }
    });
}

let legendLabels = new Set();

// Function to map a label to a consistent color
function getColorForLabel(label) {
    let hash = 0;
    for (let i = 0; i < label.length; i++) {
        hash = label.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Generate a color from the hash
    const r = (hash >> 24) & 255;
    const g = (hash >> 16) & 255;
    const b = (hash >> 8) & 255;

    return `rgb(${Math.abs(r)}, ${Math.abs(g)}, ${Math.abs(b)})`;
}

function addToLegend(labels) {
    const legendContainer = document.getElementById('legend-container');

    // Add only new labels to the global legend tracker
    labels.forEach(label => {
        if (!legendLabels[label]) {
            legendLabels[label] = getColorForLabel(label); // Add label to global legend tracker

            // Create a new legend item
            const legendItem = document.createElement('div');
            legendItem.innerHTML = `
                        <div style="display: flex; align-items: center;">
                            <div style="width: 20px; height: 20px; background-color: ${legendLabels[label]}; margin-right: 10px;"></div>
                            <span>${label}</span>
                        </div>
                    `;
            legendContainer.appendChild(legendItem);
        }
    });
}

function buildHierarchy(labels, counts) {
    const root = {name: "root", children: []};

    labels.forEach((label, index) => {
        const parts = label.split(':');
        let currentLevel = root;

        parts.forEach((part, i) => {
            let existingNode = currentLevel.children.find(node => node.name === part);

            if (!existingNode) {
                existingNode = {name: part, children: []};
                currentLevel.children.push(existingNode);
            }

            if (i === parts.length - 1) {
                existingNode.value = counts[index]; // Add the count at the last level
            }

            currentLevel = existingNode;
        });
    });

    return root;
}


function createPieChart(canvasId, labels, counts, percentages) {
    const canvas = document.createElement('canvas');
    canvas.id = canvasId;
    canvas.width = 150;
    canvas.height = 150;

    const data = buildHierarchy(labels, counts);

    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) {
        console.error(`Canvas with ID ${canvasId} not found.`);
        return;
    }
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels, // Labels are needed for the tooltip
            datasets: [{
                data: percentages, // Percentages for pie chart distribution
                backgroundColor: labels.map(label => getColorForLabel(label)), // Generate colors based on labels
                borderColor: 'rgba(255, 255, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            cutout: '50%',
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: {
                    display: false // Hide the legend labels
                },
                tooltip: {
                    displayColors: false, // Remove the color box
                    padding: 10, // Add padding inside the tooltip
                    bodyFont: {
                        size: 12 // Increase the font size
                    },
                    callbacks: {
                        // Custom label callback to wrap text and show count + percentage
                        label: function (tooltipItem) {
                            let label = labels[tooltipItem.dataIndex] || '';
                            const count = counts[tooltipItem.dataIndex] || 0;
                            const percentage = percentages[tooltipItem.dataIndex] || 0;

                            label = label.replace(/:/g, ': ');

                            // Split the label into lines if it's too long
                            const maxLineLength = 30;
                            let lines = [];
                            let currentLine = '';

                            label.split(' ').forEach(word => {
                                if (currentLine.length + word.length > maxLineLength) {
                                    lines.push(currentLine);
                                    currentLine = word;
                                } else {
                                    currentLine += (currentLine ? ' ' : '') + word;
                                }
                            });
                            lines.push(currentLine); // Add the last line

                            // Return wrapped label with count and percentage
                            return [...lines, `Count: ${count}, Percentage: ${percentage}%`];
                        },
                        title: function () {
                            return ''; // Remove the title
                        }
                    },
                    // Ensure tooltips can overflow outside table cell
                    external: function (context) {
                        const tooltip = context.tooltip;
                        if (!tooltip) {
                            return;
                        }
                        tooltip.display = true;
                        tooltip.opacity = 1;
                        tooltip.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                    }
                }
            }
        }
    });

    // addToLegend(labels);

    return canvas.outerHTML;
}

// Function to check if an element is in the viewport
function isElementInViewport(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// Function to handle lazy loading of charts
function handleLazyLoad() {
    // Check if chart containers are in viewport
    const gcfCategoryChart = document.getElementById('gcf-category-chart');
    const gcfCountHistChart = document.getElementById('gcf-count-hist-chart');

    // Load charts if they're in viewport and not already loaded
    if (gcfCategoryChart && !gcfCategoryChart.classList.contains('chart-loaded') && isElementInViewport(gcfCategoryChart)) {
        plotGCFChart();
        gcfCategoryChart.classList.add('chart-loaded');
    }

    if (gcfCountHistChart && !gcfCountHistChart.classList.contains('chart-loaded') && isElementInViewport(gcfCountHistChart)) {
        plotGCFCountHist();
        gcfCountHistChart.classList.add('chart-loaded');
    }
}

$(document).ready(function () {
    // Initialize the page content
    getInfo();

    // Set up lazy loading for charts
    handleLazyLoad(); // Check on initial load

    // Add event listeners for scroll and resize to trigger lazy loading
    $(window).on('scroll resize', handleLazyLoad);

    let isTextView = false; // Flag to toggle between text and chart view

    $('#toggleViewButton').on('click', function () {
        isTextView = !isTextView; // Toggle the view state
        const buttonText = isTextView ? 'Switch to Pie Charts' : 'Switch to Text View';
        $(this).text(buttonText); // Update button text
        $('#gcfTable').DataTable().draw(); // Redraw the table with the updated view
    });

    // Initialize the DataTable
    var table = $('#gcfTable').DataTable({
        "ajax": {
            "url": '/gcf-table',
            "type": "GET",
            "data": function(d) {
                // Convert the order array to a string for transmission
                d.order = JSON.stringify(d.order);
                return d;
            }
        },
        "serverSide": true, // Enable server-side processing
        "processing": true, // Show processing indicator
        "pageLength": 10,
        "paging": true, // Ensure paging is explicitly enabled
        "scrollCollapse": true,
        "autoWidth": false,
        "searchDelay": 500, // Delay search execution by 500ms after user stops typing
        "language": {
            searchBuilder: {
                button: 'Filter',
            },
            processing: '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>'
        },
        "dom": 'Bflriptip',
        "buttons": [
            'searchBuilder'
        ],
        "columns": [
            {data: 'gcf_id', name: 'GCF Family', title: 'GCF Family', type: 'int', width: '2.5%'},
            {data: 'num_core_regions', name: '# Core BGCs', title: '# Core BGCs', type: 'num', width: '2.5%'},
            {
                data: 'core_products',
                name: 'Types (Core)',
                title: 'Types (Core)',
                type: 'string',
                width: '15%',
                render: function (data, type, row) {
                    return type === 'display' ? data : data;
                }
            },
            {
                data: 'core_biomes',
                name: 'Biomes (Core)',
                title: 'Biomes (Core)',
                type: 'string',
                width: '15%',
                render: function (data, type, row) {
                    if (type === 'display') {
                        if (isTextView) {
                            // Return raw text when in text view
                            return data;
                        } else {
                            // Return pie chart when in chart view
                            const canvasId = `biomes-pie-chart-${row.gcf_id}`;
                            return `<div id="chart-container-${row.gcf_id}">
                                                                    <canvas id="${canvasId}" width="150" height="150"></canvas>
                                                                </div>`;
                        }
                    }
                    return data;
                }
            },
            {
                data: 'core_taxa',
                name: 'Taxa (Core)',
                title: 'Taxa (Core)',
                type: 'string',
                width: '15%',
                render: function (data, type, row) {
                    if (type === 'display') {
                        if (isTextView) {
                            return data;
                        } else {
                            const canvasId = `taxa-pie-chart-${row.gcf_id}`;
                            return `<div id="chart-container-${row.gcf_id}">
                                                                <canvas id="${canvasId}" width="150" height="150"></canvas>
                                                            </div>`;
                        }
                    }
                    return data;
                }
            },
            {data: 'num_all_regions', name: '# All BGCs', title: '# All BGCs', type: 'num', width: '5%'},
            {
                data: 'all_products',
                name: 'Types (All)',
                title: 'Types (All)',
                type: 'string',
                width: '15%',
                render: function (data, type, row) {
                    return type === 'display' ? data : data;
                }
            },
            {
                data: 'all_biomes',
                name: 'Biomes (All)',
                title: 'Biomes (All)',
                type: 'string',
                width: '15%',
                render: function (data, type, row) {
                    if (type === 'display') {
                        const canvasId = `biomes-all-pie-chart-${row.gcf_id}`;  // Unique ID for each chart
                        // Set the width and height of the canvas
                        return `<div id="chart-container-${row.gcf_id}">
                                                                <canvas id="${canvasId}" width="150" height="150"></canvas>
                                                            </div>`;
                    }
                    return data;
                }
            },
            {
                data: 'all_taxa',
                name: 'Taxa (All)',
                title: 'Taxa (All)',
                type: 'string',
                width: '15%',
                render: function (data, type, row) {
                    if (type === 'display') {
                        const canvasId = `taxa-all-pie-chart-${row.gcf_id}`;
                        return `<div id="chart-container-${row.gcf_id}">
                                                                <canvas id="${canvasId}" width="150" height="150"></canvas>
                                                            </div>`;
                    }
                    return data;
                }
            }

        ],
        "order": [[1, 'desc'], [0, 'desc']],
        "createdRow": function (row, data, dataIndex) {
            if (data.num_core_regions > 0) {
                var biomeCell = $(row).find('td').eq(3);
                biomeCell.html(biomeCell.html().replaceAll('root:', ''));
                var famNumCell = $(row).find('td').eq(0);
                const gcfId = famNumCell.html();
                famNumCell.html(
                  '<a href="/bgcs?gcf=' + gcfId + '" target="_blank">' + gcfId + '</a> ' +
                  '<a href="/gcf-gene-view?gcf=' + gcfId + '" class="btn btn-sm btn-info" title="View gene organization">Genes</a>'
                );
            }
        },
        "initComplete": function (settings, json) {
            appendCustomPaginationControls(table);
        },
        "drawCallback": function (settings) {
            // Ensure table.page is available and valid before appending controls
            if (table && typeof table.page === 'function') {
                appendCustomPaginationControls(table);
            } else {
                console.error("DataTable page method is not available. Table object:", table); // Log the table object for further inspection
            }

            var api = this.api(); // Reference the DataTable API

            // Apply the chart generation only to visible rows
            var visibleRows = api.rows({page: 'current'}).nodes(); // Get visible rows

            // Function to check if a row is in the viewport
            function isRowInViewport($row) {
                if (!$row.length) return false;
                const rect = $row[0].getBoundingClientRect();
                return (
                    rect.top < (window.innerHeight || document.documentElement.clientHeight) &&
                    rect.bottom > 0
                );
            }

            // Function to create a chart for a specific row and chart type
            function createChartIfVisible($row, rowData, chartType) {
                // Only create charts for rows that are in the viewport
                if (!isRowInViewport($row)) return;

                let canvasId, dataField, dataFieldAll;

                if (chartType === 'biomes') {
                    canvasId = `biomes-pie-chart-${rowData.gcf_id}`;
                    dataField = 'core_biomes';
                } else if (chartType === 'biomes-all') {
                    canvasId = `biomes-all-pie-chart-${rowData.gcf_id}`;
                    dataField = 'all_biomes';
                } else if (chartType === 'taxa') {
                    canvasId = `taxa-pie-chart-${rowData.gcf_id}`;
                    dataField = 'core_taxa';
                } else if (chartType === 'taxa-all') {
                    canvasId = `taxa-all-pie-chart-${rowData.gcf_id}`;
                    dataField = 'all_taxa';
                }

                // Skip if the canvas doesn't exist or is already initialized
                const $canvas = $(`#${canvasId}`);
                if (!$canvas.length || $canvas.hasClass('initialized')) return;

                // Skip if the data field is empty
                if (!rowData[dataField]) return;

                // Parse the data
                const itemData = rowData[dataField].split(',').map(item => {
                    const [label, count] = item.trim().split(/\s*\(\s*|\s*\)\s*/);
                    return {label: label, count: parseInt(count) || 0};
                });

                const totalCount = itemData.reduce((acc, curr) => acc + curr.count, 0);
                if (totalCount === 0) return; // Skip if there's no data

                const percentages = itemData.map(b => Math.round((b.count / totalCount) * 100));
                const counts = itemData.map(b => b.count);
                const labels = itemData.map(b => b.label);

                // Mark the canvas as initialized and create the chart
                $canvas.addClass('initialized');
                createPieChart(canvasId, labels, counts, percentages);
            }

            // Process each visible row
            $(visibleRows).each(function() {
                const $row = $(this);
                const rowData = api.row(this).data();

                // Create charts for this row if it's visible
                createChartIfVisible($row, rowData, 'biomes');
                createChartIfVisible($row, rowData, 'biomes-all');
                createChartIfVisible($row, rowData, 'taxa');
                createChartIfVisible($row, rowData, 'taxa-all');
            });

            // Set up lazy loading for charts as user scrolls
            if ('IntersectionObserver' in window) {
                // Use IntersectionObserver if supported
                if (!window.chartObserver) {
                    window.chartObserver = new IntersectionObserver((entries) => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting) {
                                const $row = $(entry.target);
                                const rowData = api.row(entry.target).data();
                                if (rowData) {
                                    createChartIfVisible($row, rowData, 'biomes');
                                    createChartIfVisible($row, rowData, 'biomes-all');
                                    createChartIfVisible($row, rowData, 'taxa');
                                    createChartIfVisible($row, rowData, 'taxa-all');
                                }
                            }
                        });
                    }, {
                        root: null,
                        rootMargin: '100px', // Load charts a bit before they come into view
                        threshold: 0.1
                    });

                    // Observe all rows
                    $(visibleRows).each(function() {
                        window.chartObserver.observe(this);
                    });
                } else {
                    // If observer already exists, disconnect and reconnect with new rows
                    window.chartObserver.disconnect();
                    $(visibleRows).each(function() {
                        window.chartObserver.observe(this);
                    });
                }
            } else {
                // Fallback for browsers that don't support IntersectionObserver
                // Add scroll event listener to check visibility on scroll
                $(window).on('scroll', function() {
                    $(visibleRows).each(function() {
                        const $row = $(this);
                        const rowData = api.row(this).data();
                        if (rowData) {
                            createChartIfVisible($row, rowData, 'biomes');
                            createChartIfVisible($row, rowData, 'biomes-all');
                            createChartIfVisible($row, rowData, 'taxa');
                            createChartIfVisible($row, rowData, 'taxa-all');
                        }
                    });
                });

                // Initial check for visible rows
                $(window).trigger('scroll');
            }
        },
        headerCallback: function (thead, data, start, end, display) {
            $(thead).find('th').eq(0).html(`
                                                    GCF ID
                                                    <span class="info-icon" data-bs-toggle="tooltip" title="Unique identifier for the GCF. Clicking this opens the GCF viewer for this specific cluster.">
                                                        <img src="/images/info.svg" width="12" height="12" alt="Info" loading="lazy" />
                                                    </span>
                                                `);
            $(thead).find('th').eq(1).html(`
                                                    # Core BGCs
                                                    <span class="info-icon" data-bs-toggle="tooltip" title="Number of core BGCs in the GCF. Core BGCs are those that are annotated as complete by antiSMASH and used to construct the initial clustering of BGCs into GCFs.">
                                                        <img src="/images/info.svg" width="12" height="12" alt="Info" loading="lazy" />
                                                    </span>
                                                `);
            $(thead).find('th').eq(2).html(`
                                                    Types (Core)
                                                    <span class="info-icon" data-bs-toggle="tooltip" title="Types of core BGCs in the GCF. Core BGCs are those that are annotated as complete by antiSMASH and used to construct the initial clustering of BGCs into GCFs.">
                                                        <img src="/images/info.svg" width="12" height="12" alt="Info" loading="lazy" />
                                                    </span>
                                                `);
            $(thead).find('th').eq(3).html(`
                                                    Biomes (Core)
                                                    <span class="info-icon" data-bs-toggle="tooltip" title="Biomes where core BGCs are found. Core BGCs are those that are annotated as complete by antiSMASH and used to construct the initial clustering of BGCs into GCFs.">
                                                        <img src="/images/info.svg" width="12" height="12" alt="Info" loading="lazy" />
                                                    </span>
                                                `);
            $(thead).find('th').eq(4).html(`
                                                    Taxa (Core)
                                                    <span class="info-icon" data-bs-toggle="tooltip" title="Taxonomic distribution of core BGCs. Core BGCs are those that are annotated as complete by antiSMASH and used to construct the initial clustering of BGCs into GCFs.">
                                                        <img src="/images/info.svg" width="12" height="12" alt="Info" loading="lazy" />
                                                    </span>
                                                `);
            $(thead).find('th').eq(5).html(`
                                                    # All BGCs
                                                    <span class="info-icon" data-bs-toggle="tooltip" title="Number of all BGCs in the GCF. All BGCs include both core and incomplete BGCs that are assigned to the GCF in the second step of the GCF clustering by using BiG-SLiCE's search function.">
                                                        <img src="/images/info.svg" width="12" height="12" alt="Info" loading="lazy" />
                                                    </span>
                                                `);
            $(thead).find('th').eq(6).html(`
                                                    Types (All)
                                                    <span class="info-icon" data-bs-toggle="tooltip" title="Types of all BGCs in the GCF. All BGCs include both core and incomplete BGCs that are assigned to the GCF in the second step of the GCF clustering by using BiG-SLiCE's search function.">
                                                        <img src="/images/info.svg" width="12" height="12" alt="Info" loading="lazy" />
                                                    </span>
                                                `);
            $(thead).find('th').eq(7).html(`
                                                    Biomes (All)
                                                    <span class="info-icon" data-bs-toggle="tooltip" title="Biomes where all BGCs are found. All BGCs include both core and incomplete BGCs that are assigned to the GCF in the second step of the GCF clustering by using BiG-SLiCE's search function.">
                                                        <img src="/images/info.svg" width="12" height="12" alt="Info" loading="lazy" />
                                                    </span>
                                                `);
            $(thead).find('th').eq(8).html(`
                                                    Taxa (All)
                                                    <span class="info-icon" data-bs-toggle="tooltip" title="Taxonomic distribution of all BGCs. All BGCs include both core and incomplete BGCs that are assigned to the GCF in the second step of the GCF clustering by using BiG-SLiCE's search function.">
                                                        <img src="/images/info.svg" width="12" height="12" alt="Info" loading="lazy" />
                                                    </span>
                                                `);

        }
    });

    $('#gcfTable').on('draw.dt', function () {
        $('[data-bs-toggle="tooltip"]').tooltip(); // Activate Bootstrap tooltips
    });

    // Function to append custom pagination controls (input box and Go button)
    function appendCustomPaginationControls(table) {
        // Check if the input and Go button already exist to avoid duplicates
        if (!$('#custom-page-input').length) {
            $('#gcfTable_paginate').append(
                '<div style="display: inline-flex; align-items: center; margin-left: 10px;">' +
                '<input id="custom-page-input" type="text" placeholder="Page" style="width: 60px; text-align: center; margin-right: 5px;" />' +
                '<button id="custom-page-go" class="btn btn-primary btn-sm" style="height: 30px;">Go</button>' +
                '</div>'
            );
        }

        // Check if table.page() is defined and valid before continuing
        if (typeof table.page === 'function') {
            try {
                // Update the input box with the current page number
                var currentPage = table.page.info().page + 1; // DataTables uses zero-based page index
                $('#custom-page-input').val(currentPage);

                // Re-bind the click event for the Go button after each redraw
                $('#custom-page-go').off('click').on('click', function () {
                    goToPage(table);
                });

                // Handle the Enter key press to trigger the page change
                $('#custom-page-input').off('keypress').on('keypress', function (e) {
                    if (e.which == 13) { // Enter key code is 13
                        goToPage(table);
                    }
                });
            } catch (error) {
                console.error("Error updating pagination controls:", error);
            }
        } else {
            console.error("DataTable page method is not available.");
        }
    }

    // Function to go to the specified page
    function goToPage(table) {
        // Ensure table.page() is defined before using it
        if (typeof table.page === 'function') {
            try {
                var pageNum = parseInt($('#custom-page-input').val(), 10);
                var info = table.page.info();
                var totalPages = info.pages;

                if (!isNaN(pageNum) && pageNum > 0 && pageNum <= totalPages) {
                    // For server-side processing, we need to calculate the correct start position
                    var pageLength = info.length;
                    var start = (pageNum - 1) * pageLength;

                    // Use the page API to navigate to the specified page
                    table.page(pageNum - 1).draw('page');
                } else {
                    alert('Invalid page number. Please enter a number between 1 and ' + totalPages);
                }
            } catch (error) {
                console.error("Error navigating to page:", error);
            }
        } else {
            console.error("DataTable page method is not available.");
        }
    }
});
