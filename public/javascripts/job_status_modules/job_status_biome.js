// Biome chart handling for job status page

let biomeChart = null;
let rawBiomeData = [];

async function fetchBiomeData(gcfIds) {
    try {
        const gcfIdsParam = gcfIds.join(',');
        const response = await fetch(`/biome-data-gcfs?gcfs=${encodeURIComponent(gcfIdsParam)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        rawBiomeData = data;
        return data;
    } catch (error) {
        console.error('Error fetching biome data:', error);
        return [];
    }
}

function processBiomeDataByLevel(data, level = 1, topN = 15) {
    const targetLevel = Number(level) >= 1 ? Number(level) : 1;
    const grouped = new Map();
    for (const { biome, count } of data) {
        const parts = biome.split(':');
        const idx = Math.min(targetLevel - 1, parts.length - 1);
        let keyName = (parts[idx] ?? '').trim() || 'Unknown';
        if (targetLevel > parts.length) {
            keyName += ':undefined';
        }
        const nCount = Number(count) || 0;
        grouped.set(keyName, (grouped.get(keyName) || 0) + nCount);
    }
    const sorted = [...grouped.entries()]
        .map(([biome, count]) => ({ biome, count }))
        .sort((a, b) => b.count - a.count);
    if (sorted.length > topN) {
        const top = sorted.slice(0, topN);
        const others = sorted.slice(topN).reduce((sum, { count }) => sum + count, 0);
        if (others > 0) {
            top.push({ biome: 'Others', count: others });
        }
        return top;
    }
    return sorted;
}

async function updateBiomeChart(gcfIds, level) {
    if (!level) {
        const biomeLevelSelect = document.getElementById('biomeLevelSelect');
        level = biomeLevelSelect ? biomeLevelSelect.value : '1';
    }
    if (!rawBiomeData.length) {
        await fetchBiomeData(gcfIds);
    }
    if (rawBiomeData.length === 0) {
        if (biomeChart) {
            biomeChart.destroy();
            biomeChart = null;
        }
        return;
    }
    const processedData = processBiomeDataByLevel(rawBiomeData, level);
    const labels = processedData.map(item => item.biome);
    const counts = processedData.map(item => item.count);
    const ctx = document.getElementById('biomeChart');
    if (!ctx) {
        console.error('Biome chart canvas not found');
        return;
    }
    if (biomeChart) {
        biomeChart.destroy();
    }
    biomeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Samples',
                data: counts,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Samples'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: `Biome (Level ${level})`
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                title: {
                    display: true,
                    text: `Biome Distribution of Hits (Level ${level})`
                }
            }
        }
    });
}
