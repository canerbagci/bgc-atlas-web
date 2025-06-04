$(document).ready(function () {
    // Initialize the DataTable
    var table = $('#samplesTable').DataTable({
        ajax: '/sample-data',
        serverSide: true, // Enable server-side processing
        processing: true, // Show processing indicator
        pageLength: 50, // Ensure appropriate page length
        paging: true, // Ensure paging is enabled
        scrollCollapse: true,
        searchDelay: 500, // Delay search execution by 500ms after user stops typing
        language: {
            searchBuilder: {
                button: 'Filter',
            },
            processing: 'Loading...'
        },
        buttons: [
            'searchBuilder'
        ],
        dom: 'Bflriptip',
        columns: [
            {data: 'status', name: 'Status', title: 'Status', type: 'string'},
            {data: 'sampleacc', name: 'Sample Accession', title: 'Sample Accession', type: 'string'},
            {data: 'assembly', name: 'Assembly', title: 'Assembly', type: 'string'},
            {data: 'longest_biome', name: 'Biome', title: 'Biome', type: 'string'},
            {data: 'submittedseqs', name: '# Contigs', title: '# Contigs', type: 'num'},
            {data: 'protocluster_count', name: '#BGCs', title: '#BGCs', type: 'num'},
            {data: 'longitude', name: 'Longitude', title: 'Longitude', type: 'num'},
            {data: 'latitude', name: 'Latitude', title: 'Latitude', type: 'num'},
            {data: 'envbiome', name: 'Environment (biome)', title: 'Environment (biome)', type: 'string'},
            {data: 'envfeat', name: 'Environment (feature)', title: 'Environment (feature)', type: 'string'},
            {data: 'collectdate', name: 'Collection date', title: 'Collection date', type: 'string'},
            {data: 'biosample', name: 'Sample', title: 'Sample', type: 'string'},
            {data: 'species', name: 'Species', title: 'Species', type: 'string'},
            {data: 'hosttaxid', name: 'Host tax id', title: 'Host tax id', type: 'num'},
        ],
        order: [[0, 'desc'], [4, 'desc']],
        createdRow: function (row, data, dataIndex) {
            if (data.status === 'success') {
                var statusCell = $(row).find('td').eq(0);
                var assemblyCell = $(row).find('td').eq(2);
                statusCell.addClass('status-cell');
                statusCell.html('<a href="/antismash?dataset=' + assemblyCell.html() + '" target="_blank"> <img src="/images/antismash_logo.svg" alt="View AS Results" class="status-image"> </a>');
                var biomeCell = $(row).find('td').eq(3);
                biomeCell.html(biomeCell.html().replace('root:', ''));
                var sampleCell = $(row).find('td').eq(1);
                sampleCell.html('<a href="https://www.ebi.ac.uk/metagenomics/samples/' + sampleCell.html() + '" target="_blank">' + sampleCell.html() + '</a>');
                assemblyCell.html('<a href="https://www.ebi.ac.uk/metagenomics/analyses/' + assemblyCell.html() + '" target="_blank">' + assemblyCell.html() + '</a>');
            }
        },
        initComplete: function (settings, json) {
            // Ensure page method is available
            if (typeof table.page === 'function') {
                appendCustomPaginationControls(table);
            }
        },
        drawCallback: function (settings) {
            // Re-append the custom pagination controls after each draw (if table.page is available)
            if (table && typeof table.page === 'function') {
                appendCustomPaginationControls(table);
            }
        }
    });

    // Function to append custom pagination controls (input box and Go button)
    function appendCustomPaginationControls(table) {
        // Check if the input and Go button already exist to avoid duplicates
        if (!$('#custom-page-input').length) {
            $('#samplesTable_paginate').append(
                '<div style="display: inline-flex; align-items: center; margin-left: 10px;">' +
                '<input id="custom-page-input" type="text" placeholder="Page" style="width: 60px; text-align: center; margin-right: 5px;" />' +
                '<button id="custom-page-go" class="btn btn-primary btn-sm" style="height: 30px;">Go</button>' +
                '</div>'
            );
        }

        // Ensure table.page() is defined and valid before continuing
        if (typeof table.page === 'function') {
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
        } else {
            console.error("DataTable page method is not available.");
        }
    }

    // Function to go to the specified page
    function goToPage(table) {
        // Ensure table.page() is valid before using it
        if (typeof table.page === 'function') {
            var pageNum = parseInt($('#custom-page-input').val(), 10);
            var totalPages = table.page.info().pages;

            if (!isNaN(pageNum) && pageNum > 0 && pageNum <= totalPages) {
                table.page(pageNum - 1).draw('page');
            } else {
                alert('Invalid page number');
            }
        } else {
            console.error("DataTable page method is not available.");
        }
    }
});