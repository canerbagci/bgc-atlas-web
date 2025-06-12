function getInfo() {
    const urlParams = new URLSearchParams(window.location.search);
    const gcf = urlParams.get('gcf');
    const samples = urlParams.get('samples');

    // Update the request URL to include both gcf and samples
    let url = gcf ? `/bgc-info?gcf=${gcf}` : '/bgc-info';
    if (samples) {
        url += `?samples=${samples}`;
    }

    $.ajax({
        url: url,
        type: 'GET',
        dataType: 'json',
        success: function(results) {
            $("#bgc-count").html(Number(results[0].bgc_count).toLocaleString());
            $("#meanbgcsamples").html(results[0].meanbgcsamples);
            $("#core-count").html(Number(results[0].core_count).toLocaleString());
            $("#non-putative-count").html(Number(results[0].non_putative_count).toLocaleString());

            // Update the header
            $("h1").html(gcf ? `GCF ${gcf}` : 'BGC Overview');
        }
    });
}

function plotProdChart() {
    // Parse the URL parameters
    const urlParams = new URLSearchParams(window.location.search);

    // Get the gcf and samples query parameters
    const gcf = urlParams.get('gcf');
    const samples = urlParams.get('samples');

    // Construct the base URL
    let url = '/pc-product-count';

    // Append query parameters if they exist
    if (gcf || samples) {
        url += '?';
        if (gcf) {
            url += `gcf=${gcf}`;
        }
        if (samples) {
            // Append '&' if gcf already exists
            url += gcf ? `&samples=${samples}` : `samples=${samples}`;
        }
    }

    $.ajax({
        url: url,
        type: 'GET',
        dataType: 'json',
        success: function(results) {
            const labels = results.map((row) => row.prod);
            const data = results.map((row) => row.count);

            const canvas = $('#product-chart')[0];
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Create a gradient color scheme with a smoother transition
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(255, 183, 77, 0.9)');    // light orange
            gradient.addColorStop(1, 'rgba(251, 140, 0, 0.7)');     // dark orange

            const chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Regions by Product',
                            data: data,
                            backgroundColor: gradient,
                            borderColor: 'rgba(204, 51, 51, 1)',
                            borderWidth: 2,
                            borderRadius: 5,
                            hoverBackgroundColor: 'rgba(255, 102, 102, 1)',
                            hoverBorderColor: 'rgba(153, 0, 0, 1)',
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
                        },
                        tooltip: {
                            backgroundColor: 'rgba(51, 51, 51, 0.9)',
                            titleFont: {
                                size: 14,
                                weight: 'bold'
                            },
                            bodyFont: {
                                size: 13
                            },
                            padding: 12,
                            displayColors: false,
                            callbacks: {
                                label: function(context) {
                                    return `Count: ${context.parsed.y}`;
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

function plotTaxonomicChart() {
    // Parse the URL parameters
    const urlParams = new URLSearchParams(window.location.search);

    // Get the gcf and samples query parameters
    const gcf = urlParams.get('gcf');
    const samples = urlParams.get('samples');

    // Construct the base URL
    let url = '/pc-taxonomic-count';

    // Append query parameters if they exist
    if (gcf || samples) {
        url += '?';
        if (gcf) {
            url += `gcf=${gcf}`;
        }
        if (samples) {
            // Append '&' if gcf already exists
            url += gcf ? `&samples=${samples}` : `samples=${samples}`;
        }
    }

    $.ajax({
        url: url,
        type: 'GET',
        dataType: 'json',
        success: function(results) {
            const labels = results.map((row) => row.taxon);
            const data = results.map((row) => row.count);

            const canvas = $('#taxonomic-chart')[0];
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Create a gradient color scheme with a smoother transition
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(66, 165, 245, 0.9)');    // light blue
            gradient.addColorStop(1, 'rgba(30, 136, 229, 0.7)');     // dark blue

            const chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Regions by Taxonomy',
                            data: data,
                            backgroundColor: gradient,
                            borderColor: 'rgba(25, 118, 210, 1)',
                            borderWidth: 2,
                            borderRadius: 5,
                            hoverBackgroundColor: 'rgba(66, 165, 245, 1)',
                            hoverBorderColor: 'rgba(13, 71, 161, 1)',
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
                        },
                        tooltip: {
                            backgroundColor: 'rgba(51, 51, 51, 0.9)',
                            titleFont: {
                                size: 14,
                                weight: 'bold'
                            },
                            bodyFont: {
                                size: 13
                            },
                            padding: 12,
                            displayColors: false,
                            callbacks: {
                                label: function(context) {
                                    return `Count: ${context.parsed.y}`;
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

function plotChart() {
    // Parse the URL parameters
    const urlParams = new URLSearchParams(window.location.search);

    // Get the gcf and samples query parameters
    const gcf = urlParams.get('gcf');
    const samples = urlParams.get('samples');

    // Construct the base URL
    let url = '/pc-category-count';

    // Append query parameters if they exist
    if (gcf || samples) {
        url += '?';
        if (gcf) {
            url += `gcf=${gcf}`;
        }
        if (samples) {
            // Append '&' if gcf already exists
            url += gcf ? `&samples=${samples}` : `samples=${samples}`;
        }
    }

    $.ajax({
        url: url,
        type: 'GET',
        dataType: 'json',
        success: function(results) {
            const labels = results.map((row) => row.categories);
            const data = results.map((row) => row.count);

            const canvas = $('#category-chart')[0];
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Create a gradient color scheme - using a different shade for this chart
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(102, 187, 106, 0.9)');  // light green
            gradient.addColorStop(1, 'rgba(56, 142, 60, 0.7)');    // dark green

            const chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Regions by Category',
                            data: data,
                            backgroundColor: gradient,
                            borderColor: 'rgba(51, 102, 204, 1)',
                            borderWidth: 2,
                            borderRadius: 5,
                            hoverBackgroundColor: 'rgba(102, 153, 255, 1)',
                            hoverBorderColor: 'rgba(0, 51, 153, 1)',
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
                        },
                        tooltip: {
                            backgroundColor: 'rgba(51, 51, 51, 0.9)',
                            titleFont: {
                                size: 14,
                                weight: 'bold'
                            },
                            bodyFont: {
                                size: 13
                            },
                            padding: 12,
                            displayColors: false,
                            callbacks: {
                                label: function(context) {
                                    return `Count: ${context.parsed.y}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                font: {
                                    weight: 'bold'
                                }
                            },
                            grid: {
                                display: false
                            }
                        },
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

function drawTable() {
    var table = $('#bgcTable').DataTable({
        "processing": true,
        "serverSide": true,
        "responsive": true,
        "searchDelay": 500, // Delay search execution by 500ms after user stops typing
        "ajax": {
            "url": '/bgc-table',
            "data": function (d) {
                const urlParams = new URLSearchParams(window.location.search);
                const gcfVal = urlParams.get('gcf');
                if (gcfVal) {
                    d.gcf = gcfVal;
                }
                const samplesVal = urlParams.get('samples');
                if (samplesVal) {
                    d.samples = samplesVal;
                }
                d.showCoreMembers = $('#showCoreMembers').is(':checked');
                d.showNonPutativeMembers = $('#showNonPutativeMembers').is(':checked');
            }
        },
        "pageLength": 10,
        "lengthMenu": [[10, 25, 100, 500, 1000], [10, 25, 100, 500, 1000]],
        "paging": true,
        "scrollCollapse": true,
        "dom": 'Bflriptip',
        "drawCallback": function (settings) {
            // Append the custom input box and Go button after pagination is redrawn
            if (!$('#custom-page-input').length) {
                $('#bgcTable_paginate').append(
                    '<div style="display: inline-flex; align-items: center; margin-left: 10px;">' +
                    '<input id="custom-page-input" type="text" placeholder="Page" style="width: 60px; text-align: center; margin-right: 5px;" />' +
                    '<button id="custom-page-go" class="btn btn-primary btn-sm" style="height: 30px;">Go</button>' +
                    '</div>'
                );
            }

            // Update the input box with the current page number
            var currentPage = table.page.info().page + 1; // DataTables uses zero-based page index
            $('#custom-page-input').val(currentPage);

            // Re-bind the click event for the Go button after each redraw
            $('#custom-page-go').off('click').on('click', function () {
                goToPage();
            });

            // Handle the Enter key press to trigger the page change
            $('#custom-page-input').off('keypress').on('keypress', function (e) {
                if (e.which == 13) { // Enter key code is 13
                    goToPage();
                }
            });

            // Function to go to the specified page
            function goToPage() {
                var pageNum = parseInt($('#custom-page-input').val(), 10);
                var totalPages = table.page.info().pages;

                if (!isNaN(pageNum) && pageNum > 0 && pageNum <= totalPages) {
                    table.page(pageNum - 1).draw('page');
                } else {
                    alert('Invalid page number');
                }
            }
        },
        columns: [
            {data: 'region_id', name: 'BGC ID', title: 'BGC ID', type: 'num'},
            {data: 'assembly', name: 'Assembly', title: 'Assembly', type: 'string'},
            {data: 'taxon_name', name: 'Taxon', title: 'Taxon', type: 'string'},
            {data: 'product_categories', name: 'Category', title: 'Category', type: 'string'},
            {data: 'products', name: 'Product', title: 'Product', type: 'string'},
            {data: 'longest_biome', name: 'Biome', title: 'Biome', type: 'string'},
            {
                data: null, name: 'Length', title: 'Length', type: 'num',
                render: function (data, type, row) {
                    var length = row.end - row.start + 1;
                    ;
                    return length;
                }
            },
            {data: 'bigslice_gcf_id', name: 'GCF', title: 'GCF', type: 'string'},
            {
                data: 'membership_value', name: 'Membership Value', title: 'Membership Value', type: 'num',
                render: function (data, type, row) {
                    // Ensure data is numeric and not null
                    if (type === 'display' && !isNaN(data) && data !== null) {
                        // Format the number to display only two decimal points
                        return parseFloat(data).toFixed(2);
                    }
                    return data;
                }
            },
            {
                data: 'gcf_from_search', name: 'Core', title: 'Core', type: 'boolean',
                render: function (data, type, row, meta) {
                    return !data; // Negate the value here
                }
            },
            {data: 'contig_edge', name: 'Contig Edge', title: 'Contig Edge', type: 'boolean'},
            {data: 'contig_name', name: 'Contig', title: 'Contig', type: 'string'},
            {data: 'region_num', name: 'Region#', title: 'Region#', type: 'string'},
        ],
        createdRow: function (row, data, dataIndex) {
            if (data.region_id > 0) {
                var rowNumCell = $(row).find('td').eq(0);
                var rowNum = rowNumCell.html();
                var paddedRowNum = rowNum.padStart(9, '0');
                rowNumCell.html("BGC_" + paddedRowNum);
                var biomeCell = $(row).find('td').eq(5);
                biomeCell.html(biomeCell.html().replaceAll('root:', ''));
                var assemblyCell = $(row).find('td').eq(1);
                var assemblyID = assemblyCell.html();
                base = '';
                base = base.replace(/\/$/, ''); // Remove trailing slash if exists
                assemblyCell.html('<a href="' + base + '/antismash?dataset=' + assemblyCell.html() + '" target="_blank">' + assemblyCell.html() + '</a>');

                // assemblyCell.html('<a href="https://bgc-atlas.ziemertlab.com/datasets/' + assemblyCell.html() + '/antismash/index.html" target="_blank">' + assemblyCell.html() + '</a>');
                var bgcCell = $(row).find('td').eq(0);
                bgcCell.html('<a href="' + base + '/antismash?dataset=' + assemblyID + '&anchor=' + data.anchor + '" target="_blank">' + bgcCell.html() + '</a>');

                //bgcCell.html('<a href="https://bgc-atlas.ziemertlab.com/datasets/' + data.assembly + '/antismash/index.html#' + data.anchor + '" target="_blank">' + bgcCell.html() + '</a>');
                var gcfCell = $(row).find('td').eq(7);
                gcfCell.html('<a href="/bgcs?gcf=' + gcfCell.html() + '" target="_blank">' + gcfCell.html() + '</a>');
            }
        },
        rowCallback: function (row, data) {
            if (parseFloat(data.membership_value) > 0.405) {
                $(row).addClass('putative-bgc');
            }
        },
        headerCallback: function (thead, data, start, end, display) {
            $(thead).find('th').eq(0).html(`
                        Region ID
                        <span class="info-icon" data-bs-toggle="tooltip" title="Unique identifier for the region. Clicking this opens the antiSMASH viewer for this specific region.">
                            <img src="/images/info.svg" width="12" height="12" alt="Info" loading="lazy" />
                        </span>
                    `);
            $(thead).find('th').eq(1).html(`
                        Assembly
                        <span class="info-icon" data-bs-toggle="tooltip" title="MGnify Assembly identifier. Clicking this opens the antiSMASH viewer for the assembly.">
                            <img src="/images/info.svg" width="12" height="12" alt="Info" loading="lazy" />
                        </span>
                    `);
            $(thead).find('th').eq(2).html(`
                        Taxon
                        <span class="info-icon" data-bs-toggle="tooltip" title="Taxonomic name associated with the region.">
                            <img src="/images/info.svg" width="12" height="12" alt="Info" loading="lazy" />
                        </span>
                    `);
            $(thead).find('th').eq(3).html(`
                        Product Category
                        <span class="info-icon" data-bs-toggle="tooltip" title="Product category of the BGC.">
                            <img src="/images/info.svg" width="12" height="12" alt="Info" loading="lazy" />
                        </span>
                    `);
            $(thead).find('th').eq(4).html(`
                        Product
                        <span class="info-icon" data-bs-toggle="tooltip" title="Product type of the BGC.">
                            <img src="/images/info.svg" width="12" height="12" alt="Info" loading="lazy" />
                        </span>
                    `);
            $(thead).find('th').eq(5).html(`
                        Biome
                        <span class="info-icon" data-bs-toggle="tooltip" title="Biome annotation of the sample.">
                            <img src="/images/info.svg" width="12" height="12" alt="Info" loading="lazy" />
                        </span>
                    `);
            $(thead).find('th').eq(6).html(`
                        Length
                        <span class="info-icon" data-bs-toggle="tooltip" title="Length of the BGC.">
                            <img src="/images/info.svg" width="12" height="12" alt="Info" loading="lazy" />
                        </span>
                    `);
            $(thead).find('th').eq(7).html(`
                        GCF
                        <span class="info-icon" data-bs-toggle="tooltip" title="GCF identifier. Clicking this opens the GCF page.">
                            <img src="/images/info.svg" width="12" height="12" alt="Info" loading="lazy" />
                        </span>
                    `);
            $(thead).find('th').eq(8).html(`
                        Membership Value
                        <span class="info-icon" data-bs-toggle="tooltip" title="Membership value of the BGC to its assigned GCF. Values above 0.4 mean that the BGC is a putative member of the GCF.">
                            <img src="/images/info.svg" width="12" height="12" alt="Info" loading="lazy" />
                        </span>
                    `);
            $(thead).find('th').eq(9).html(`
                        Core
                        <span class="info-icon" data-bs-toggle="tooltip" title="Core BGCs are those that are annotated as complete by antiSMASH and used to construct the initial clustering of BGCs into GCFs.">
                            <img src="/images/info.svg" width="12" height="12" alt="Info" loading="lazy" />
                        </span>
                    `);
            $(thead).find('th').eq(10).html(`
                        Contig Edge
                        <span class="info-icon" data-bs-toggle="tooltip" title="Indicates whether the BGC is located at the edge of a contig.">
                            <img src="/images/info.svg" width="12" height="12" alt="Info" loading="lazy" />
                        </span>
                    `);
            $(thead).find('th').eq(11).html(`
                        Contig
                        <span class="info-icon" data-bs-toggle="tooltip" title="Name of the contig where the BGC is located.">
                            <img src="/images/info.svg" width="12" height="12" alt="Info" loading="lazy" />
                        </span>
                    `);
            $(thead).find('th').eq(12).html(`
                        Region#
                        <span class="info-icon" data-bs-toggle="tooltip" title="Region number of the BGC.">
                            <img src="/images/info.svg" width="12" height="12" alt="Info" loading="lazy" />
                        </span>
                    `);
        },
        deferRender: true
    });
    return table;
}

function downloadTableDataAsJson() {
    var data = [];
    $('#bgcTable').DataTable().rows().every(function() {
        var row = $(this.node());
        var rowData = {};
        row.find('td').each(function(index) {
            var cell = $(this);
            var cellData = cell.text(); // Get the cell text
            var headerText = $('#bgcTable').DataTable().column(index).header().innerText;
            rowData[headerText] = cellData;
            // If the cell contains a hyperlink, extract the href value
            var href = cell.find('a').attr('href');
            if (href && href.startsWith('https')) {
                rowData[headerText + ' Link'] = href; // Add a new key-value pair for the href
            }
        });
        data.push(rowData);
    });

    // Convert the data to a JSON string
    var json = JSON.stringify(data, null, 2);

    // Create a blob from the JSON string
    var blob = new Blob([json], {type: "application/json"});

    // Create a link to download the blob
    var url = URL.createObjectURL(blob);

    // Create and trigger download using jQuery
    var $a = $('<a>', {
        href: url,
        download: (function() {
            // Determine the filename based on the gcf value
            var params = new URLSearchParams(window.location.search);
            var gcf = params.get('gcf');
            return gcf ? 'GCF_' + gcf + '.json' : 'all_bgcs.json';
        })()
    });

    // Append to body, trigger click, and remove
    $a.appendTo('body').trigger('click').remove();
}

// Initialize everything when jQuery is ready
$(document).ready(function () {
    console.log('[DEBUG_LOG] bgcs.js: Document ready event triggered');

    try {
        // Check if Bootstrap is available
        if (typeof bootstrap !== 'undefined') {
            console.log('[DEBUG_LOG] bgcs.js: Bootstrap is available, version:', bootstrap.Tooltip.VERSION);
        } else {
            console.error('[DEBUG_LOG] bgcs.js: Bootstrap is not available!');
        }

        // Check for collapse elements
        const collapseElements = document.querySelectorAll('.collapse');
        console.log(`[DEBUG_LOG] bgcs.js: Found ${collapseElements.length} collapse elements`);

        // Log each collapse element's ID for debugging
        collapseElements.forEach((el, index) => {
            console.log(`[DEBUG_LOG] bgcs.js: Collapse #${index}: id=${el.id}, classList=${el.className}`);
        });

        // Check for card headers
        const cardHeaders = document.querySelectorAll('.card-header');
        console.log(`[DEBUG_LOG] bgcs.js: Found ${cardHeaders.length} card headers`);

        // Initialize the page content
        console.log('[DEBUG_LOG] bgcs.js: Initializing page content');
        getInfo();
        plotChart();
        plotProdChart();
        plotTaxonomicChart();
        createMapGCF();
        createSunburstView('#sunburst-chart');

        // Initialize the DataTable
        console.log('[DEBUG_LOG] bgcs.js: Initializing DataTable');
        var table = drawTable();

        // Add event listeners for checkboxes
        $('#showCoreMembers').on('change', function() {
            console.log('[DEBUG_LOG] bgcs.js: showCoreMembers checkbox changed');
            $('#bgcTable').DataTable().ajax.reload();
        });

        $('#showNonPutativeMembers').on('change', function() {
            console.log('[DEBUG_LOG] bgcs.js: showNonPutativeMembers checkbox changed');
            $('#bgcTable').DataTable().ajax.reload();
        });

        // Activate tooltips when table is redrawn
        $('#bgcTable').on('draw.dt', function () {
            console.log('[DEBUG_LOG] bgcs.js: DataTable draw event triggered, initializing tooltips');
            try {
                $('[data-bs-toggle="tooltip"]').tooltip();
                console.log('[DEBUG_LOG] bgcs.js: Tooltips initialized successfully');
            } catch (error) {
                console.error(`[DEBUG_LOG] bgcs.js: Error initializing tooltips: ${error.message}`);
            }
        });

        // Test a collapse operation programmatically after a delay
        setTimeout(function() {
            console.log('[DEBUG_LOG] bgcs.js: Testing collapse functionality programmatically');
            try {
                const firstCollapseId = collapseElements[0]?.id;
                if (firstCollapseId) {
                    console.log(`[DEBUG_LOG] bgcs.js: Attempting to toggle collapse #${firstCollapseId}`);
                    const collapseElement = document.getElementById(firstCollapseId);
                    const bsCollapse = new bootstrap.Collapse(collapseElement);
                    bsCollapse.toggle();
                    console.log(`[DEBUG_LOG] bgcs.js: Successfully toggled collapse #${firstCollapseId}`);
                } else {
                    console.log('[DEBUG_LOG] bgcs.js: No collapse elements found to test');
                }
            } catch (error) {
                console.error(`[DEBUG_LOG] bgcs.js: Error testing collapse functionality: ${error.message}`);
            }
        }, 3000);
    } catch (error) {
        console.error(`[DEBUG_LOG] bgcs.js: Error in document ready handler: ${error.message}`);
    }
});
