$(document).ready(function() {
  // DOM elements
  const loadingIndicator = $('#loading-indicator');
  const errorMessage = $('#error-message');
  const gcfInfo = $('#gcf-info');
  const gcfSummary = $('#gcf-summary');
  const bgcContainer = $('#bgc-container');

  // Function to generate a color based on a string (for consistent gene coloring)
  function getColorForString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Generate HSL color with good saturation and lightness for visibility
    const h = Math.abs(hash) % 360;
    const s = 70 + (Math.abs(hash) % 20); // 70-90% saturation
    const l = 45 + (Math.abs(hash) % 15); // 45-60% lightness

    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  // Function to format number with commas
  function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  // Function to create a scale bar
  function createScaleBar(container, maxLength, containerWidth) {
    const scaleBar = $('<div class="scale-bar"></div>');
    container.prepend(scaleBar); // Add scale bar at the top instead of appending at the bottom

    // Create markers every 1000 bp or appropriate interval
    const interval = determineScaleInterval(maxLength);

    for (let i = 0; i <= maxLength; i += interval) {
      const position = (i / maxLength) * containerWidth;
      const marker = $(`<div class="scale-marker" style="left: ${position}px;"></div>`);
      const label = $(`<div class="scale-label" style="left: ${position}px;">${formatNumber(i)}</div>`);

      scaleBar.append(marker);
      scaleBar.append(label);
    }
  }

  // Function to determine appropriate scale interval
  function determineScaleInterval(maxLength) {
    if (maxLength <= 5000) return 1000;
    if (maxLength <= 10000) return 2000;
    if (maxLength <= 50000) return 10000;
    return 20000;
  }

  // Function to render BGCs and their genes
  function renderBGCs(data) {
    bgcContainer.empty();

    if (data.length === 0) {
      bgcContainer.html('<p>No BGCs found for this GCF.</p>');
      return;
    }

    // Update GCF title and summary
    const urlParams = new URLSearchParams(window.location.search);
    const gcfId = urlParams.get('gcf');
    $('#gcf-title').text(`GCF ${gcfId}`);
    gcfSummary.text(`Found ${data.length} BGCs for GCF ${gcfId}`);
    gcfInfo.removeClass('d-none');

    // Create a tooltip element
    const tooltip = $('<div class="gene-tooltip"></div>');
    $('body').append(tooltip);

    // Render each BGC
    data.forEach((bgc, index) => {
      // Create a row with a flex layout
      const bgcRow = $(`
        <div class="bgc-row">
          <div class="bgc-content">
            <div class="bgc-id">
              ${bgc.region_info ? 
                `<a href="/antismash?dataset=${bgc.region_info.assembly}&anchor=${bgc.region_info.anchor}" 
                   target="_blank" class="bgc-link">
                   ${bgc.region_info.region_id}
                 </a>` : 
                `BGC ID: ${bgc.id}`
              }
            </div>
            <div class="gene-container" id="gene-container-${bgc.id}"></div>
          </div>
        </div>
      `);

      bgcContainer.append(bgcRow);

      const geneContainer = $(`#gene-container-${bgc.id}`);
      const containerWidth = geneContainer.width();

      // Set a fixed width for the gene container
      geneContainer.css('width', containerWidth);

      // Add scale bar at the top
      createScaleBar(geneContainer, bgc.length_nt, containerWidth);

      // Render genes
      bgc.genes.forEach(gene => {
        const start = gene.nt_start;
        const end = gene.nt_end;
        const width = end - start;

        // Calculate position and width as percentage of BGC length
        const leftPos = (start / bgc.length_nt) * containerWidth;
        const geneWidth = (width / bgc.length_nt) * containerWidth;

        // Determine gene direction class
        const directionClass = gene.strand === 1 ? 'gene-forward' : 'gene-reverse';

        // Generate color based on product or locus tag
        const colorKey = gene.product || gene.locus_tag || gene.protein_id || `gene_${gene.id}`;
        const color = getColorForString(colorKey);

        // Create gene element
        const geneElement = $('<div></div>')
          .addClass(`gene ${directionClass}`)
          .css({
            left: `${leftPos}px`,
            width: `${geneWidth}px`,
            backgroundColor: color
          })
          .attr('data-gene-id', gene.id)
          .attr('data-start', gene.nt_start)
          .attr('data-end', gene.nt_end)
          .attr('data-strand', gene.strand)
          .attr('data-locus', gene.locus_tag || 'N/A')
          .attr('data-protein', gene.protein_id || 'N/A')
          .attr('data-product', gene.product || 'N/A');

        geneContainer.append(geneElement);

        // Add hover event for tooltip
        geneElement.on('mouseenter', function(e) {
          const gene = $(this);
          const tooltipContent = `
            <div>
              <strong>Position:</strong> ${formatNumber(gene.data('start'))} - ${formatNumber(gene.data('end'))}<br>
              <strong>Strand:</strong> ${gene.data('strand') === 1 ? 'Forward' : 'Reverse'}<br>
              <strong>Locus Tag:</strong> ${gene.data('locus')}<br>
              <strong>Protein ID:</strong> ${gene.data('protein')}<br>
              <strong>Product:</strong> ${gene.data('product')}
            </div>
          `;

          tooltip.html(tooltipContent);
          tooltip.css({
            display: 'block',
            left: e.pageX + 10,
            top: e.pageY + 10
          });
        });

        geneElement.on('mousemove', function(e) {
          tooltip.css({
            left: e.pageX + 10,
            top: e.pageY + 10
          });
        });

        geneElement.on('mouseleave', function() {
          tooltip.css('display', 'none');
        });
      });
    });
  }

  // Function to load GCF data
  function loadGCF(gcfId) {
    // Show loading indicator
    loadingIndicator.removeClass('d-none');
    errorMessage.addClass('d-none');
    gcfInfo.addClass('d-none');
    bgcContainer.empty();

    // Fetch data from API
    $.ajax({
      url: `/gcf-genes/${gcfId}`,
      method: 'GET',
      dataType: 'json',
      success: function(data) {
        loadingIndicator.addClass('d-none');
        renderBGCs(data);
      },
      error: function(xhr, status, error) {
        loadingIndicator.addClass('d-none');

        let errorText = 'Error loading GCF data.';

        // Check for specific error status codes
        if (xhr.status === 404) {
          // 404 means the GCF ID was not found or has no BGCs
          errorText = 'GCF not found or has no associated BGCs. Please check the GCF ID and try again.';
        } else if (xhr.responseJSON && xhr.responseJSON.error) {
          // Use the error message from the server if available
          errorText = xhr.responseJSON.error;
        }

        errorMessage.text(errorText);
        errorMessage.removeClass('d-none');
      }
    });
  }

  // Check if there's a GCF ID in the URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const gcfIdParam = urlParams.get('gcf');

  if (gcfIdParam && !isNaN(gcfIdParam) && gcfIdParam > 0) {
    loadGCF(gcfIdParam);
  } else if (!gcfIdParam) {
    errorMessage.text('No GCF ID provided. Please include a GCF ID in the URL (e.g., ?gcf=123).');
    errorMessage.removeClass('d-none');
  } else {
    errorMessage.text('Invalid GCF ID. Please provide a valid positive number (e.g., ?gcf=123).');
    errorMessage.removeClass('d-none');
  }
});
