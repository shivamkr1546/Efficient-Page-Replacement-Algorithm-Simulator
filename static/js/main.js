document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('simulationForm');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Show loading spinner
        document.getElementById('loading').style.display = 'block';
        document.getElementById('results').style.display = 'none';
        
        // Get input values
        const pageFrames = document.getElementById('pageFrames').value;
        const referenceString = document.getElementById('referenceString').value;

        try {
            const response = await fetch('/simulate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    page_frames: parseInt(pageFrames),
                    reference_string: referenceString.split(',').map(num => parseInt(num.trim())).filter(num => !isNaN(num))
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to run simulation');
            }

            const data = await response.json();
            displayResults(data);

        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while running the simulation: ' + error.message);
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    });

    // Add input validation
    const pageFramesInput = document.getElementById('pageFrames');
    const referenceStringInput = document.getElementById('referenceString');

    pageFramesInput.addEventListener('input', function() {
        const value = parseInt(this.value);
        if (value < 1) {
            this.setCustomValidity('Number of page frames must be at least 1');
        } else if (value > 100) {
            this.setCustomValidity('Number of page frames cannot exceed 100');
        } else {
            this.setCustomValidity('');
        }
    });

    referenceStringInput.addEventListener('input', function() {
        const value = this.value.trim();
        if (!value) {
            this.setCustomValidity('Reference string cannot be empty');
        } else {
            const numbers = value.split(',').map(num => parseInt(num.trim()));
            if (numbers.some(num => isNaN(num))) {
                this.setCustomValidity('Please enter valid numbers separated by commas');
            } else if (numbers.some(num => num < 0)) {
                this.setCustomValidity('Page numbers cannot be negative');
            } else if (numbers.length > 1000) {
                this.setCustomValidity('Reference string cannot exceed 1000 pages');
            } else {
                this.setCustomValidity('');
            }
        }
    });
});

function displayResults(data) {
    // Clear previous results
    clearResults();
    
    // Show results section
    document.getElementById('results').style.display = 'block';
    
    // Display page faults for each algorithm
    const algorithms = ['FIFO', 'LRU', 'Optimal', 'LFU', 'Clock', 'FLRU', 'LRUF'];
    const resultsTable = document.getElementById('results-table');
    
    // Create table header
    const headerRow = resultsTable.insertRow();
    ['Algorithm', 'Page Faults', 'Hit Rate', 'Miss Ratio'].forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });
    
    // Add results for each algorithm
    algorithms.forEach(algo => {
        const row = resultsTable.insertRow();
        const lowerAlgo = algo.toLowerCase();
        
        // Algorithm name
        row.insertCell().textContent = algo;
        
        // Page faults
        row.insertCell().textContent = data[`${lowerAlgo}_faults`];
        
        // Hit rate
        row.insertCell().textContent = `${(data.hit_rates[lowerAlgo] * 100).toFixed(1)}%`;
        
        // Miss ratio
        row.insertCell().textContent = `${(data.miss_ratios[lowerAlgo] * 100).toFixed(1)}%`;
    });
    
    // Display performance metrics
    document.getElementById('best-algorithm').textContent = data.best_algorithm;
    document.getElementById('avg-faults').textContent = data.avg_faults.toFixed(2);
    document.getElementById('min-faults').textContent = data.min_faults;
    document.getElementById('max-faults').textContent = data.max_faults;
    document.getElementById('median-faults').textContent = data.median_faults;
    document.getElementById('std-dev').textContent = data.std_dev.toFixed(2);
    
    // Display visualizations
    Plotly.newPlot('visualization', data.visualization.data, data.visualization.layout);
    Plotly.newPlot('miss-ratio-visualization', data.miss_ratio_visualization.data, data.miss_ratio_visualization.layout);
    
    // Display algorithm-specific visualizations
    const visualizationsDiv = document.getElementById('algorithm-visualizations');
    algorithms.forEach(algo => {
        const algoDiv = document.createElement('div');
        algoDiv.className = 'col-12 mb-4';  // Changed to full width for better visualization
        algoDiv.innerHTML = `
            <div class="card h-100">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="card-title mb-0">${algo} Visualization</h5>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-secondary zoom-in">
                            <i class="bi bi-zoom-in"></i> Zoom In
                        </button>
                        <button class="btn btn-sm btn-outline-secondary zoom-out">
                            <i class="bi bi-zoom-out"></i> Zoom Out
                        </button>
                    </div>
                </div>
                <div class="card-body visualization-container">
                    <img src="data:image/png;base64,${data.algorithm_visualizations[algo.toLowerCase()]}" 
                         alt="${algo} visualization"
                         class="img-fluid visualization-image"
                         data-algo="${algo}">
                    <div class="visualization-tooltip"></div>
                </div>
                <div class="card-footer">
                    <small class="text-muted">
                        Top: Page Presence Timeline (Gantt Chart) - Shows when each page is in memory<br>
                        Bottom: Memory Utilization (Step Chart) - Shows number of pages in memory over time
                    </small>
                </div>
            </div>
        `;
        visualizationsDiv.appendChild(algoDiv);
        
        // Add zoom functionality
        const img = algoDiv.querySelector('.visualization-image');
        const zoomIn = algoDiv.querySelector('.zoom-in');
        const zoomOut = algoDiv.querySelector('.zoom-out');
        let scale = 1;
        
        zoomIn.addEventListener('click', () => {
            scale = Math.min(scale + 0.2, 2);
            img.style.transform = `scale(${scale})`;
        });
        
        zoomOut.addEventListener('click', () => {
            scale = Math.max(scale - 0.2, 0.5);
            img.style.transform = `scale(${scale})`;
        });
        
        // Add tooltip functionality
        const container = algoDiv.querySelector('.visualization-container');
        const tooltip = algoDiv.querySelector('.visualization-tooltip');
        
        img.addEventListener('mousemove', (e) => {
            const rect = img.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            tooltip.style.display = 'block';
            tooltip.style.left = `${x + 10}px`;
            tooltip.style.top = `${y + 10}px`;
            
            // Calculate time step and page number from position
            const timeStep = Math.floor((x / rect.width) * data.memory_states[algo.toLowerCase()].length);
            const state = data.memory_states[algo.toLowerCase()][timeStep] || [];
            
            tooltip.innerHTML = `
                Time Step: ${timeStep}<br>
                Pages in Memory: ${state.join(', ') || 'None'}<br>
                Memory Usage: ${state.length} pages
            `;
        });
        
        img.addEventListener('mouseout', () => {
            tooltip.style.display = 'none';
        });
    });
    
    // Update system resources
    updateSystemResources(data.memory_stats);
}

function updateSystemResources(stats) {
    // Update memory usage progress bar
    const memoryBar = document.getElementById('memory-usage');
    memoryBar.style.width = `${stats.usage}%`;
    memoryBar.textContent = `${stats.usage.toFixed(1)}%`;
    
    // Update CPU usage progress bar
    const cpuBar = document.getElementById('cpu-usage');
    cpuBar.style.width = `${stats.cpu_usage}%`;
    cpuBar.textContent = `${stats.cpu_usage.toFixed(1)}%`;
    
    // Update memory stats
    document.getElementById('rss-memory').textContent = `${stats.rss.toFixed(2)} MB`;
    document.getElementById('virtual-memory').textContent = `${stats.vms.toFixed(2)} MB`;
}

function clearResults() {
    // Clear all result elements
    const elementsToEmpty = [
        'results-table',
        'algorithm-visualizations',
        'visualization',
        'miss-ratio-visualization'
    ];
    
    elementsToEmpty.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.innerHTML = '';
    });
    
    // Clear text content
    const textElements = [
        'best-algorithm',
        'avg-faults',
        'min-faults',
        'max-faults',
        'median-faults',
        'std-dev'
    ];
    
    textElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = '';
    });
} 