(function(global){
  const JS = global.JobStatus || (global.JobStatus = {});
  JS.biomeChart = JS.biomeChart || null;
  JS.rawBiomeData = JS.rawBiomeData || [];

  JS.clearBiomeChart = function(){
    if (JS.biomeChart) {
      JS.biomeChart.destroy();
      JS.biomeChart = null;
    }
    JS.rawBiomeData = [];
  };

  JS.fetchBiomeData = async function(gcfIds, jobId = null, filterPutative = false){
    try {
      let url = '';
      if (jobId) {
        url = `/biome-data-gcfs?jobId=${jobId}`;
        if (filterPutative) {
          url += `&putativeThreshold=${JS.PUTATIVE_THRESHOLD}`;
        }
      } else {
        const gcfParam = gcfIds.join(',');
        url = `/biome-data-gcfs?gcfs=${encodeURIComponent(gcfParam)}`;
      }

      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP error! Status: ${resp.status}`);

      const data = await resp.json();
      JS.rawBiomeData = data;
      return data;
    } catch(err) {
      console.error('Error fetching biome data:', err);
      return [];
    }
  };

  JS.processBiomeDataByLevel = function(data, level = 1, topN = 15){
    const target = Number(level) >= 1 ? Number(level) : 1;
    const grouped = new Map();
    for(const { biome, count } of data){
      const parts = biome.split(':');
      const idx = Math.min(target - 1, parts.length - 1);
      let key = (parts[idx] ?? '').trim() || 'Unknown';
      if (target > parts.length) key += ':undefined';
      const nCount = Number(count) || 0;
      grouped.set(key, (grouped.get(key) || 0) + nCount);
    }

    const sorted = [...grouped.entries()].map(([biome,count]) => ({ biome, count }))
      .sort((a,b) => b.count - a.count);

    if(sorted.length > topN){
      const top = sorted.slice(0, topN);
      const others = sorted.slice(topN).reduce((sum,{count}) => sum + count,0);
      if (others > 0) top.push({ biome: 'Others', count: others });
      return top;
    }

    return sorted;
  };

  JS.updateBiomeChart = async function(gcfIds, level, jobId = null, filterPutative = false){
    if(!level){
      const levelSelect = document.getElementById('biomeLevelSelect');
      level = levelSelect ? levelSelect.value : '1';
    }

    await JS.fetchBiomeData(gcfIds, jobId, filterPutative);
    if(JS.rawBiomeData.length === 0){
      if(JS.biomeChart){
        JS.biomeChart.destroy();
        JS.biomeChart = null;
      }
      return;
    }

    const processed = JS.processBiomeDataByLevel(JS.rawBiomeData, level);
    const labels = processed.map(i => i.biome);
    const counts = processed.map(i => i.count);

    const ctx = document.getElementById('biomeChart');
    if(!ctx){
      console.error('Biome chart canvas not found');
      return;
    }

    if(JS.biomeChart) JS.biomeChart.destroy();

    JS.biomeChart = new Chart(ctx, {
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
          legend: { display: true, position: 'top' },
          title: { display: true, text: `Biome Distribution of Hits (Level ${level})` }
        }
      }
    });
  };
})(window);
