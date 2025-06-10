// JavaScript to handle card collapse functionality and ensure parent containers resize
document.addEventListener('DOMContentLoaded', function() {
  console.log('[DEBUG_LOG] Card collapse script initialized');

  try {
    // Get all collapse elements
    const collapseElements = document.querySelectorAll('.collapse');
    console.log(`[DEBUG_LOG] Found ${collapseElements.length} collapse elements`);

    // Log each collapse element's ID for debugging
    collapseElements.forEach((el, index) => {
      console.log(`[DEBUG_LOG] Collapse #${index}: id=${el.id}, classList=${el.className}`);
    });

    // Add event listeners for bootstrap collapse events
    collapseElements.forEach(function(collapseElement) {
      // When a collapse is shown
      collapseElement.addEventListener('shown.bs.collapse', function() {
        console.log(`[DEBUG_LOG] Collapse shown event triggered for #${this.id}`);
        // Find the parent row and ensure it resizes
        const parentRow = findParentWithClass(this, 'row');
        if (parentRow) {
          console.log(`[DEBUG_LOG] Found parent row for #${this.id}, setting height to auto`);
          parentRow.style.height = 'auto';
        } else {
          console.log(`[DEBUG_LOG] No parent row found for #${this.id}`);
        }
      });

      // When a collapse is hidden
      collapseElement.addEventListener('hidden.bs.collapse', function() {
        console.log(`[DEBUG_LOG] Collapse hidden event triggered for #${this.id}`);
        // Find the parent row and ensure it resizes
        const parentRow = findParentWithClass(this, 'row');
        if (parentRow) {
          console.log(`[DEBUG_LOG] Found parent row for #${this.id}, setting height to auto`);
          parentRow.style.height = 'auto';
        } else {
          console.log(`[DEBUG_LOG] No parent row found for #${this.id}`);
        }
      });
    });

    // Helper function to find parent element with a specific class
    function findParentWithClass(element, className) {
      let parent = element.parentElement;
      while (parent) {
        if (parent.classList.contains(className)) {
          return parent;
        }
        parent = parent.parentElement;
      }
      return null;
    }

    // Add click event to card headers to toggle collapse
    const cardHeaders = document.querySelectorAll('.card-header');
    console.log(`[DEBUG_LOG] Found ${cardHeaders.length} card headers`);

    // Log each card header for debugging
    cardHeaders.forEach((header, index) => {
      console.log(`[DEBUG_LOG] Card header #${index}: content="${header.textContent.trim()}", nextElementSibling.id=${header.nextElementSibling ? header.nextElementSibling.id : 'none'}`);
    });

    cardHeaders.forEach(function(header) {
      header.addEventListener('click', function(e) {
        console.log(`[DEBUG_LOG] Card header clicked: ${this.textContent.trim()}`);

        // Only trigger if the click was directly on the header (not on a button inside it)
        if (e.target === this || (e.target.parentElement === this && !e.target.classList.contains('btn'))) {
          console.log(`[DEBUG_LOG] Click target validated, proceeding with collapse toggle`);
          const collapseId = this.nextElementSibling.id;
          console.log(`[DEBUG_LOG] Next element sibling ID: ${collapseId || 'none'}`);

          if (collapseId) {
            const collapseElement = document.getElementById(collapseId);
            console.log(`[DEBUG_LOG] Found collapse element: ${collapseElement ? 'yes' : 'no'}`);

            try {
              console.log(`[DEBUG_LOG] Creating Bootstrap Collapse instance for #${collapseId}`);
              const bsCollapse = new bootstrap.Collapse(collapseElement);

              // Toggle the collapse
              if (collapseElement.classList.contains('show')) {
                console.log(`[DEBUG_LOG] Collapse #${collapseId} is shown, hiding it`);
                bsCollapse.hide();
              } else {
                console.log(`[DEBUG_LOG] Collapse #${collapseId} is hidden, showing it`);
                bsCollapse.show();
              }
            } catch (error) {
              console.error(`[DEBUG_LOG] Error creating/toggling Bootstrap Collapse: ${error.message}`);
            }
          } else {
            console.log(`[DEBUG_LOG] No collapse ID found for this header`);
          }
        } else {
          console.log(`[DEBUG_LOG] Click was on a child element that should handle its own events`);
        }
      });
    });
  } catch (error) {
    console.error(`[DEBUG_LOG] Error in card-collapse.js: ${error.message}`);
  }
});
