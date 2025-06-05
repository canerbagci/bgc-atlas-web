function parseBiomes(biomes) {
    // Create the root node
    const root = { name: 'root', levelId: 'root', children: [] };

    // For each biome in the array
    biomes.forEach(biome => {
        // Split the longest_biome into levels, trim whitespace, and filter out 'root'
        const levels = biome.longest_biome.split(':').map(level => level.trim()).filter(level => level !== 'root');
        // Start at the root node
        let currentLevel = root;
        // For each level in the biome
        levels.forEach((level, i) => {
            // Try to find a child node with the same name
            let nextLevel = currentLevel.children.find(child => child.name === level);
            // If the node doesn't exist, create it
            if (!nextLevel) {
                // Assign level ID, defaulting to the level name if it's not the second level or higher
                const levelId = i >= 1 ? levels[1] : level;
                nextLevel = { name: level, children: [], levelId: levelId };
                currentLevel.children.push(nextLevel);
            }
            // If this is the last level, add the count as the value
            if (i === levels.length - 1) {
                nextLevel.value = parseInt(biome.count);
            }
            // Move to the next level
            currentLevel = nextLevel;
        });
    });

    // Initialize the id counter and the flat data array
    let id = 0;
    const flatData = [];

    // Define a function to traverse the tree and flatten it
    function traverse(node, parentId) {
        // Assign an id to the current node
        const currentNodeId = id++;
        // Add the current node to the flat data array
        flatData.push({
            id: currentNodeId,
            parent: parentId,
            name: node.name,
            value: node.value,
            levelId: node.levelId,
        });
        // Traverse the children of the current node
        node.children.forEach(child => traverse(child, currentNodeId));
    }
    // Start the traversal at the root node
    traverse(root, null);
    // Return the flattened data
    return flatData;
}

function calculateColumns(data, maxItemsPerColumn) {
    const uniqueItems = new Set(data.map(item => item.levelId));
    const numUniqueItems = uniqueItems.size;
    return Math.ceil(numUniqueItems / maxItemsPerColumn);
}

function render(data, targetElement) {
    // calculate columns for legend
    const columns = calculateColumns(data, 20);

    // Create a new Vega view
    const spec = {
        "$schema": "https://vega.github.io/schema/vega/v5.json",
        "description": "A hierarchical view of biome tree distribution with zoom functionality and tooltip on click.",
        "width": 350,
        "height": 350,
        "padding": 5,
        "autosize": "pad",

        // Define a signal to handle the current zoom level and tooltip interaction
        "signals": [
            {
                "name": "current",  // Signal to track the current focused/zoomed node
                "value": null,
                "on": [
                    {"events": "arc:click", "update": "datum"}  // Track the clicked node
                ]
            },
            {
                "name": "tooltipNode",  // Signal to handle the clicked node for tooltip
                "value": null,
                "on": [
                    {"events": "arc:click", "update": "datum"}  // Set tooltip node on arc click
                ]
            },
            {
                "name": "tooltipX",  // X position of the tooltip
                "value": 0,
                "on": [
                    {"events": "arc:click", "update": "x()"}  // Position the tooltip based on click
                ]
            },
            {
                "name": "tooltipY",  // Y position of the tooltip
                "value": 0,
                "on": [
                    {"events": "arc:click", "update": "y()"}  // Position the tooltip based on click
                ]
            },
            {
                "name": "tooltipVisible",  // Control the visibility of the tooltip
                "value": false,
                "on": [
                    {"events": "arc:click", "update": "true"}  // Make tooltip visible on click
                ]
            }
        ],

        "data": [
            {
                "name": "tree",
                "values": data,
                "transform": [
                    {
                        "type": "stratify",
                        "key": "id",
                        "parentKey": "parent"
                    },
                    {
                        "type": "partition",
                        "field": "value",
                        "sort": {"field": "value"},
                        "size": [{"signal": "2 * PI"}, {"signal": "width / 2"}],
                        "as": ["a0", "r0", "a1", "r1", "depth", "children"]
                    }
                ]
            }
        ],

        "scales": [
            {
                "name": "color",
                "type": "ordinal",
                "domain": {"data": "tree", "field": "levelId"},
                "range": {"scheme": "category20b"}
            }
        ],

        // Include the legend here
        "legends": [
            {
                "fill": "color",
                "title": "Biomes",
                "orient": "right",
                "columns": 3,
                "labelLimit": 0
            }
        ],

        "marks": [
            {
                "type": "arc",
                "from": {"data": "tree"},
                "encode": {
                    "enter": {
                        "x": {"signal": "width / 2"},
                        "y": {"signal": "height / 2"},
                        "fill": {
                            "condition": {
                                "test": "datum.depth == 0",
                                "value": "white"
                            },
                            "scale": "color", "field": "levelId"
                        }
                    },
                    "update": {
                        "startAngle": {"field": "a0"},
                        "endAngle": {"field": "a1"},
                        "innerRadius": {"field": "r0"},
                        "outerRadius": {"field": "r1"},
                        "stroke": {"value": "white"},
                        "strokeWidth": {"value": 1},
                        "zindex": {"value": 0}
                    },
                    "hover": {
                        "stroke": {"value": "red"},
                        "strokeWidth": {"value": 2},
                        "zindex": {"value": 1}
                    }
                }
            },
            // Tooltip mark: this will appear on click
            {
                "type": "text",
                "encode": {
                    "enter": {
                        "align": {"value": "center"},
                        "baseline": {"value": "middle"},
                        "fontSize": {"value": 12},
                        "fill": {"value": "black"}
                    },
                    "update": {
                        "x": {"signal": "tooltipX"},
                        "y": {"signal": "tooltipY"},
                        "text": {"signal": "tooltipNode ? tooltipNode.name + (tooltipNode.value ? ', ' + tooltipNode.value + ' count' : '') : ''"},
                        "opacity": {"signal": "tooltipVisible ? 1 : 0"}
                    }
                }
            }
        ]
    };

// Create a new Vega view
    const view = new vega.View(vega.parse(spec), {
        renderer: 'canvas',
        container: targetElement,
        hover: true,
    });

    return view.runAsync();
}

function createSunburstView(targetElement) {
    // Parse the URL parameters
    const urlParams = new URLSearchParams(window.location.search);

    // Get the gcf and samples query parameters
    const gcf = urlParams.get('gcf');
    const samples = urlParams.get('samples');

    // Construct the base URL
    let url = '/gcf-table-sunburst';

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

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => parseBiomes(data))
        .then(data => render(data, targetElement))
        .catch(error => console.error('Error:', error));
}
