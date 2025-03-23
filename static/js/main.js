document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('simulationForm');
    const themeToggle = document.getElementById('themeToggle');
    const htmlElement = document.documentElement;
    const themeIcon = themeToggle.querySelector('i');

    // Theme management
    function setTheme(theme) {
        htmlElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        themeIcon.className = theme === 'light' ? 'bi bi-moon' : 'bi bi-sun';
        
        // Update any plotly charts if they exist
        const plots = document.querySelectorAll('[id^="visualization"]');
        plots.forEach(plot => {
            if (plot.data) {
                const newTemplate = theme === 'light' ? 'plotly' : 'plotly_dark';
                Plotly.relayout(plot, {template: newTemplate});
            }
        });
    }

    // Load saved theme or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);

    // Theme toggle handler
    themeToggle.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    });
    
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
    // Show results container
    const resultsContainer = document.getElementById('results');
    resultsContainer.style.display = 'flex';
    
    // Display metrics
    const metrics = document.getElementById('metrics');
    metrics.innerHTML = `
        <div class="col-md-6">
            <div class="mb-3">
                <h6><i class="bi bi-star-fill text-warning"></i> Best Algorithm</h6>
                <p class="h4">${data.best_algorithm}</p>
            </div>
            <div class="mb-3">
                <h6><i class="bi bi-calculator"></i> Average Faults</h6>
                <p class="h4">${data.avg_faults.toFixed(2)}</p>
            </div>
            <div class="mb-3">
                <h6><i class="bi bi-arrow-down-up"></i> Median Faults</h6>
                <p class="h4">${data.median_faults}</p>
            </div>
        </div>
        <div class="col-md-6">
            <div class="mb-3">
                <h6><i class="bi bi-arrow-down"></i> Min Faults</h6>
                <p class="h4">${data.min_faults}</p>
            </div>
            <div class="mb-3">
                <h6><i class="bi bi-arrow-up"></i> Max Faults</h6>
                <p class="h4">${data.max_faults}</p>
            </div>
            <div class="mb-3">
                <h6><i class="bi bi-distribute-vertical"></i> Standard Deviation</h6>
                <p class="h4">${data.std_dev.toFixed(2)}</p>
            </div>
        </div>
    `;

    // Create Plotly visualizations with theme support
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const plotlyTemplate = currentTheme === 'light' ? 'plotly' : 'plotly_dark';

    // Update visualization layout with theme
    const visualizationLayout = {
        ...data.visualization.layout,
        template: plotlyTemplate
    };
    const missRatioLayout = {
        ...data.miss_ratio_visualization.layout,
        template: plotlyTemplate
    };

    Plotly.newPlot('visualization', data.visualization.data, visualizationLayout);
    Plotly.newPlot('miss-ratio-visualization', data.miss_ratio_visualization.data, missRatioLayout);

    // Display algorithm visualizations
    const algoVisContainer = document.getElementById('algorithm-visualizations');
    algoVisContainer.innerHTML = '';

    const algorithms = ['FIFO', 'LRU', 'Optimal', 'LFU', 'Clock', 'FLRU', 'LRUF'];
    algorithms.forEach(algo => {
        const algoDiv = document.createElement('div');
        algoDiv.className = 'col-md-4 mb-4';
        
        const faults = data[algo.toLowerCase() + '_faults'];
        const hitRate = data.hit_rates[algo.toLowerCase()] * 100;
        const missRate = data.miss_ratios[algo.toLowerCase()] * 100;
        
        algoDiv.innerHTML = `
            <div class="card h-100">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="card-title mb-0">${algo}</h5>
                    <button class="btn btn-sm btn-outline-primary learn-more-btn" data-algorithm="${algo.toLowerCase()}">
                        <i class="bi bi-info-circle"></i> Learn More
                    </button>
                </div>
                <div class="card-body">
                    <div class="mb-3">
                        <div class="d-flex justify-content-between mb-2">
                            <span>Page Faults: ${faults}</span>
                            <span>Hit Rate: ${hitRate.toFixed(1)}%</span>
                        </div>
                        <div class="progress">
                            <div class="progress-bar bg-success" style="width: ${hitRate}%">
                                Hits ${hitRate.toFixed(1)}%
                            </div>
                            <div class="progress-bar bg-danger" style="width: ${missRate}%">
                                Misses ${missRate.toFixed(1)}%
                            </div>
                        </div>
                    </div>
                    <div class="visualization-container position-relative">
                        <img src="data:image/png;base64,${data.algorithm_visualizations[algo.toLowerCase()]}" 
                             class="img-fluid" alt="${algo} visualization" data-algo="${algo}">
                        <div class="visualization-controls">
                            <button class="btn btn-sm btn-outline-primary zoom-in">
                                <i class="bi bi-zoom-in"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-primary zoom-out">
                                <i class="bi bi-zoom-out"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-primary fullscreen">
                                <i class="bi bi-fullscreen"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-primary play-pause">
                                <i class="bi bi-play-fill"></i>
                            </button>
                            <select class="form-select form-select-sm animation-speed">
                                <option value="0.5">0.5x</option>
                                <option value="1" selected>1x</option>
                                <option value="2">2x</option>
                            </select>
                        </div>
                        <div class="visualization-tooltip"></div>
                    </div>
                </div>
            </div>
        `;

        // Add event listener for Learn More button
        const learnMoreBtn = algoDiv.querySelector('.learn-more-btn');
        learnMoreBtn.addEventListener('click', () => {
            const algorithmName = learnMoreBtn.dataset.algorithm;
            showAlgorithmInfo(algorithmName);
        });

        algoVisContainer.appendChild(algoDiv);

        // Initialize visualization controls
        initializeVisualizationControls(algoDiv, data, algo);
    });
    
    // Update system resources
    updateSystemResources(data.memory_stats);
}

function initializeVisualizationControls(container, data, algo) {
    const img = container.querySelector('img');
    const controls = container.querySelector('.visualization-controls');
    const tooltip = container.querySelector('.visualization-tooltip');
    const playPause = controls.querySelector('.play-pause');
    const speedSelect = controls.querySelector('.animation-speed');
    let isPlaying = false;
    
    // Add zoom functionality
    const zoomIn = controls.querySelector('.zoom-in');
    const zoomOut = controls.querySelector('.zoom-out');
    let scale = 1;
    
    zoomIn.addEventListener('click', () => {
        scale = Math.min(scale + 0.2, 2);
        img.style.transform = `scale(${scale})`;
    });
    
    zoomOut.addEventListener('click', () => {
        scale = Math.max(scale - 0.2, 0.5);
        img.style.transform = `scale(${scale})`;
    });

    // Add fullscreen functionality
    const fullscreenBtn = controls.querySelector('.fullscreen');
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            img.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    });
    
    // Add animation controls
    let animationInterval;
    let currentStep = 0;
    const totalSteps = data.memory_states[algo.toLowerCase()].length;
    
    playPause.addEventListener('click', () => {
        isPlaying = !isPlaying;
        playPause.innerHTML = isPlaying ? 
            '<i class="bi bi-pause-fill"></i>' : 
            '<i class="bi bi-play-fill"></i>';
        
        if (isPlaying) {
            const speed = parseFloat(speedSelect.value);
            animationInterval = setInterval(() => {
                currentStep = (currentStep + 1) % totalSteps;
                updateVisualizationStep(currentStep, algo, data);
            }, 1000 / speed);
        } else {
            clearInterval(animationInterval);
        }
    });
    
    speedSelect.addEventListener('change', () => {
        if (isPlaying) {
            clearInterval(animationInterval);
            const speed = parseFloat(speedSelect.value);
            animationInterval = setInterval(() => {
                currentStep = (currentStep + 1) % totalSteps;
                updateVisualizationStep(currentStep, algo, data);
            }, 1000 / speed);
        }
    });
    
    // Add tooltip functionality
    img.addEventListener('mousemove', (e) => {
        const rect = img.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        tooltip.style.display = 'block';
        tooltip.style.left = `${x + 10}px`;
        tooltip.style.top = `${y + 10}px`;
        
        // Calculate time step and page number from position
        const timeStep = Math.floor((x / rect.width) * totalSteps);
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
}

function updateVisualizationStep(step, algo, data) {
    const state = data.memory_states[algo.toLowerCase()][step];
    const tooltip = document.querySelector(`[data-algo="${algo}"]`).nextElementSibling;
    
    tooltip.innerHTML = `
        Time Step: ${step}<br>
        Pages in Memory: ${state.join(', ') || 'None'}<br>
        Memory Usage: ${state.length} pages
    `;
}

function showAlgorithmInfo(algorithmName) {
    const modal = new bootstrap.Modal(document.getElementById('algorithmInfoModal'));
    const info = algorithmInfo[algorithmName];
    
    // Update overview tab
    document.getElementById('algo-description').textContent = info.description;
    
    const featuresList = document.getElementById('algo-features');
    featuresList.innerHTML = info.features.map(feature => `<li>${feature}</li>`).join('');
    
    document.getElementById('algo-complexity').textContent = `Time: ${info.complexity}, Space: ${info.space}`;
    
    const applicationsList = document.getElementById('algo-applications');
    applicationsList.innerHTML = info.applications.map(app => `<li>${app}</li>`).join('');
    
    // Update tutorial tab
    const tutorialContent = document.getElementById('tutorial-content');
    let currentStep = 0;
    
    function updateTutorialStep() {
        const step = info.tutorial[currentStep];
        tutorialContent.innerHTML = `
            <h5>Step ${step.step}</h5>
            <p>${step.description}</p>
            <img src="/static/images/${step.visualization}" class="img-fluid" alt="Step visualization">
        `;
        
        document.getElementById('prevStep').disabled = currentStep === 0;
        document.getElementById('nextStep').disabled = currentStep === info.tutorial.length - 1;
    }
    
    updateTutorialStep();
    
    document.getElementById('prevStep').onclick = () => {
        if (currentStep > 0) {
            currentStep--;
            updateTutorialStep();
        }
    };
    
    document.getElementById('nextStep').onclick = () => {
        if (currentStep < info.tutorial.length - 1) {
            currentStep++;
            updateTutorialStep();
        }
    };
    
    // Update quiz tab
    const quizContent = document.getElementById('quiz-content');
    quizContent.innerHTML = info.quiz.map((q, i) => `
        <div class="mb-4">
            <h5>Question ${i + 1}</h5>
            <p>${q.question}</p>
            ${q.options.map((opt, j) => `
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="q${i}" value="${j}" id="q${i}opt${j}">
                    <label class="form-check-label" for="q${i}opt${j}">${opt}</label>
                </div>
            `).join('')}
        </div>
    `).join('');
    
    document.getElementById('submitQuiz').onclick = () => {
        let score = 0;
        info.quiz.forEach((q, i) => {
            const selected = document.querySelector(`input[name="q${i}"]:checked`);
            if (selected && parseInt(selected.value) === q.correct) {
                score++;
            }
        });
        alert(`Your score: ${score}/${info.quiz.length}`);
    };
    
    modal.show();
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