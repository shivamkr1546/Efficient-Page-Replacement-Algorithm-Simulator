document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables for Page Replacement
    let currentAlgorithmIndex = 0;
    const algorithms = ['fifo', 'lru', 'optimal', 'lfu', 'clock', 'flru', 'lruf'];
    let simulationData = null;
    let scale = 1;
    let isPlaying = false;
    let animationInterval;

    // Form elements
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

    function updateVisualization(data) {
        if (!data) return;
        
        simulationData = data;
        const algorithm = algorithms[currentAlgorithmIndex];
        const algorithmUpper = algorithm.toUpperCase();
        
        // Get all required elements
        const elements = {
            title: document.getElementById('currentAlgorithmTitle'),
            faults: document.getElementById('currentFaults'),
            hitRate: document.getElementById('currentHitRate'),
            hit: document.getElementById('currentHit'),
            miss: document.getElementById('currentMiss'),
            visualization: document.getElementById('currentVisualization'),
            learnMore: document.getElementById('currentLearnMore'),
            prevBtn: document.getElementById('prevAlgorithm'),
            nextBtn: document.getElementById('nextAlgorithm'),
            select: document.getElementById('algorithmSelect')
        };

        // Check if all elements exist
        if (Object.values(elements).some(el => !el)) {
            console.error('Some required elements are missing');
            return;
        }

        // Update the elements
        elements.title.textContent = algorithmUpper;
        elements.faults.textContent = data[`${algorithm}_faults`];
        elements.hitRate.textContent = `${(data.hit_rates[algorithm] * 100).toFixed(1)}%`;
        elements.hit.style.width = `${data.hit_rates[algorithm] * 100}%`;
        elements.miss.style.width = `${data.miss_ratios[algorithm] * 100}%`;
        elements.visualization.innerHTML = `
            <img src="data:image/png;base64,${data.algorithm_visualizations[algorithm]}" 
                 class="img-fluid" alt="${algorithmUpper} Visualization">
        `;
        elements.learnMore.dataset.algorithm = algorithm;
        elements.prevBtn.disabled = currentAlgorithmIndex === 0;
        elements.nextBtn.disabled = currentAlgorithmIndex === algorithms.length - 1;
        elements.select.value = algorithm;

        // Initialize visualization controls after updating the visualization
        initializeVisualizationControls();
    }

    function initializeVisualizationControls() {
        const container = document.querySelector('.visualization-container');
        if (!container) return;

        const img = container.querySelector('img');
        if (!img) return;

        // Reset scale and animation state
        scale = 1;
        isPlaying = false;
        if (animationInterval) clearInterval(animationInterval);

        // Initialize zoom controls
        const zoomIn = container.querySelector('.zoom-in');
        const zoomOut = container.querySelector('.zoom-out');
        if (zoomIn && zoomOut) {
            zoomIn.onclick = () => {
                scale = Math.min(scale + 0.2, 2);
                img.style.transform = `scale(${scale})`;
            };
            zoomOut.onclick = () => {
                scale = Math.max(scale - 0.2, 0.5);
                img.style.transform = `scale(${scale})`;
            };
        }

        // Initialize fullscreen control
        const fullscreenBtn = container.querySelector('.fullscreen');
        if (fullscreenBtn) {
            fullscreenBtn.onclick = () => {
                if (!document.fullscreenElement) {
                    img.requestFullscreen();
                } else {
                    document.exitFullscreen();
                }
            };
        }

        // Initialize animation controls
        const playPauseBtn = container.querySelector('.play-pause');
        const speedSelect = container.querySelector('.animation-speed');
        if (playPauseBtn && speedSelect) {
            playPauseBtn.onclick = () => toggleAnimation(playPauseBtn, speedSelect);
        }
    }

    function toggleAnimation(playPauseBtn, speedSelect) {
        isPlaying = !isPlaying;
        playPauseBtn.innerHTML = isPlaying ? 
            '<i class="bi bi-pause-fill"></i>' : 
            '<i class="bi bi-play-fill"></i>';
        
        if (isPlaying) {
            startAnimation(speedSelect.value);
        } else {
            clearInterval(animationInterval);
        }
    }

    function startAnimation(speed) {
        if (!simulationData) return;
        
        const algorithm = algorithms[currentAlgorithmIndex];
        const states = simulationData.memory_states[algorithm];
        let currentStep = 0;
        
        clearInterval(animationInterval);
        animationInterval = setInterval(() => {
            currentStep = (currentStep + 1) % states.length;
            updateVisualizationStep(currentStep, algorithm, simulationData);
        }, 1000 / parseFloat(speed));
    }

    // Form submission handler
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Show loading spinner
        document.getElementById('loading').style.display = 'block';
        document.getElementById('results').style.display = 'none';
        
        try {
            const pageFrames = document.getElementById('pageFrames').value;
            const referenceString = document.getElementById('referenceString').value;
            
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
            
            // Reset current algorithm index
            currentAlgorithmIndex = 0;
            
            // Update the visualization
            updateVisualization(data);
            
            // Update other displays
            updateMetricsDisplay(data);
            updatePerformanceCharts(data);
            updateSystemResources(data.memory_stats);
            
            // Show results
            document.getElementById('results').style.display = 'flex';
            
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while running the simulation: ' + error.message);
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    });

    // Initialize navigation controls
    const prevBtn = document.getElementById('prevAlgorithm');
    const nextBtn = document.getElementById('nextAlgorithm');
    const algoSelect = document.getElementById('algorithmSelect');

    if (prevBtn && nextBtn && algoSelect) {
        prevBtn.addEventListener('click', () => {
            if (currentAlgorithmIndex > 0) {
                currentAlgorithmIndex--;
                updateVisualization(simulationData);
            }
        });

        nextBtn.addEventListener('click', () => {
            if (currentAlgorithmIndex < algorithms.length - 1) {
                currentAlgorithmIndex++;
                updateVisualization(simulationData);
            }
        });

        algoSelect.addEventListener('change', (e) => {
            currentAlgorithmIndex = algorithms.indexOf(e.target.value);
            updateVisualization(simulationData);
        });
    }

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

function updateMetricsDisplay(data) {
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
}

function updatePerformanceCharts(data) {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const plotlyTemplate = currentTheme === 'light' ? 'plotly' : 'plotly_dark';
    const textColor = currentTheme === 'light' ? '#333333' : '#ffffff';
    const gridColor = currentTheme === 'light' ? '#e5e5e5' : '#404040';

    // Common layout properties
    const commonLayout = {
        font: {
            family: 'Inter, system-ui, -apple-system, sans-serif',
            color: textColor
        },
        showlegend: false,
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        margin: {
            l: 50,
            r: 20,
            t: 40,
            b: 60
        },
        xaxis: {
            tickangle: -45,
            tickfont: {
                size: 11,
                color: textColor
            },
            gridcolor: gridColor,
            linecolor: gridColor,
            showgrid: true,
            zeroline: false,
            fixedrange: true
        },
        yaxis: {
            gridcolor: gridColor,
            linecolor: gridColor,
            tickfont: {
                size: 11,
                color: textColor
            },
            title: {
                text: 'Number of Page Faults',
                font: {
                    size: 12,
                    color: textColor
                },
                standoff: 15
            },
            showgrid: true,
            zeroline: false,
            fixedrange: true,
            rangemode: 'tozero',
            dtick: 1
        }
    };

    // Update the data styling for Page Faults chart
    const faultsData = [{
        ...data.visualization.data[0],
        textposition: 'outside',
        textfont: {
            size: 10,
            color: textColor
        },
        marker: {
            color: ['#0d6efd', '#198754', '#dc3545', '#ffc107', '#0dcaf0', '#6f42c1', '#fd7e14'],
            line: {
                color: currentTheme === 'light' ? '#ffffff' : '#2c2c2c',
                width: 1
            }
        },
        hovertemplate: '<b>%{x}</b><br>Page Faults: %{y}<br>Hit Rate: %{text}<extra></extra>',
        text: Object.keys(data.hit_rates).map(algo => 
            `${(data.hit_rates[algo] * 100).toFixed(1)}%`
        )
    }];

    // Create the chart with responsive configuration
    Plotly.newPlot('visualization', faultsData, commonLayout, {
        displayModeBar: false,
        responsive: true,
        useResizeHandler: true
    });
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

function updateVisualizationStep(step, algo, data) {
    const state = data.memory_states[algo][step];
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