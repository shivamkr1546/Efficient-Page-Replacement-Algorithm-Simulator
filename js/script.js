class PageReplacementSimulator {
    constructor() {
        this.referenceString = [];
        this.frames = [];
        this.frameCount = 0;
        this.pageFaults = 0;
        this.hits = 0;
        this.algorithm = '';
        this.simulationContainer = document.getElementById('simulationContainer');
        this.setupEventListeners();
        this.chartInstance = null;
        this.algorithmResults = new Map();
        this.lastCalculatedMetrics = null;
        this.comparisonMode = 'realWorld'; // Default to real-world mode
    }

    setupEventListeners() {
        document.getElementById('startBtn').addEventListener('click', () => this.startSimulation());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        document.getElementById('generateRandom').addEventListener('click', () => this.generateRandomString());
        document.getElementById('compareAllBtn').addEventListener('click', () => this.compareAllAlgorithms());
        
        // Add event listeners for comparison mode radio buttons
        document.querySelectorAll('input[name="comparisonMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.comparisonMode = e.target.value;
                if (this.algorithmResults.size > 0) {
                    this.updateComparisonTable();
                }
            });
        });
    }

    calculateEfficiencyScore(hitRate, pageFaults) {
        if (this.comparisonMode === 'performance') {
            // Performance-only mode: Focus purely on hit rate and page faults
            return (
                (hitRate * 0.8) +  // Increased weight for hit rate
                ((1 - (pageFaults / this.referenceString.length)) * 100 * 0.2)  // Reduced weight for fault reduction
            ).toFixed(2);
        }

        // Real-world practicality mode - More comprehensive scoring
        const metrics = {
            // Real-world performance (40% of total score)
            performance: {
                hitRate: hitRate * 0.25,                    // 25% - Important but balanced
                faultReduction: (1 - (pageFaults / this.referenceString.length)) * 100 * 0.15  // 15% - System performance
            },
            
            // Implementation practicality (35% of total score)
            practicality: {
                memoryOverhead: this.calculateMemoryOverhead() * 0.20,     // 20% - Increased importance of memory
                cpuOverhead: this.calculateCPUOverhead() * 0.15           // 15% - CPU usage consideration
            },
            
            // Real-world adaptability (25% of total score)
            adaptability: {
                predictability: this.calculatePredictability() * 0.15,      // 15% - Increased weight for consistency
                scalability: this.calculateScalability() * 0.10            // 10% - Workload handling
            }
        };

        const finalScore = (
            metrics.performance.hitRate +
            metrics.performance.faultReduction +
            metrics.practicality.memoryOverhead +
            metrics.practicality.cpuOverhead +
            metrics.adaptability.predictability +
            metrics.adaptability.scalability
        ).toFixed(2);

        this.lastCalculatedMetrics = metrics;
        return finalScore;
    }

    updateComparisonTable() {
        const tbody = document.getElementById('comparisonTableBody');
        tbody.innerHTML = '';
        
        const sortedResults = Array.from(this.algorithmResults.entries())
            .sort(([,a], [,b]) => parseFloat(b.efficiencyScore) - parseFloat(a.efficiencyScore));
        
        sortedResults.forEach(([algo, result]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${result.name}</strong></td>
                <td>${result.pageFaults}</td>
                <td>${result.hits}</td>
                <td>${result.hitRate}%</td>
                <td>${result.missRate}%</td>
                <td class="efficiency-score ${this.getEfficiencyClass(result.efficiencyScore)}">
                    ${result.efficiencyScore}
                    ${this.getScoreBreakdown(algo, result)}
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    getScoreBreakdown(algo, result) {
        if (this.comparisonMode === 'performance') {
            return `
                <div class="score-breakdown">
                    <small>
                        <strong>Performance Metrics:</strong><br>
                        • Hit Rate (80%): ${(result.hitRate * 0.8).toFixed(1)}%<br>
                        • Fault Reduction (20%): ${((1 - (result.pageFaults / this.referenceString.length)) * 100 * 0.2).toFixed(1)}%
                    </small>
                </div>
            `;
        }

        return `
            <div class="score-breakdown">
                <small>
                    <strong>Real-world Performance (40%):</strong><br>
                    • Hit Rate: ${(result.hitRate * 0.25).toFixed(1)}%<br>
                    • Fault Reduction: ${((1 - (result.pageFaults / this.referenceString.length)) * 100 * 0.15).toFixed(1)}%<br>
                    <strong>Implementation Practicality (35%):</strong><br>
                    • Memory Overhead: ${(this.calculateMemoryOverhead() * 0.20).toFixed(1)}%<br>
                    • CPU Usage: ${(this.calculateCPUOverhead() * 0.15).toFixed(1)}%<br>
                    <strong>Real-world Adaptability (25%):</strong><br>
                    • Predictability: ${(this.calculatePredictability() * 0.15).toFixed(1)}%<br>
                    • Scalability: ${(this.calculateScalability() * 0.10).toFixed(1)}%
                </small>
            </div>
        `;
    }

    async compareAllAlgorithms() {
        const algorithms = ['fifo', 'lru', 'optimal', 'lfu', 'afp'];
        this.algorithmResults.clear();
        
        const input = document.getElementById('referenceString').value;
        this.frameCount = parseInt(document.getElementById('frameCount').value);
        
        if (!input || this.frameCount <= 0) {
            alert('Please enter a valid reference string and frame count');
            return;
        }
        
        this.referenceString = input.split(',').map(num => parseInt(num.trim()));
        
        if (!this.validateInput()) {
            alert('Please enter valid input: comma-separated numbers and frame count > 0');
            return;
        }

        // Clear previous results
        document.getElementById('comparisonTableBody').innerHTML = '';
        
        // Run all algorithms
        for (const algo of algorithms) {
            this.pageFaults = 0;
            this.hits = 0;
            this.frames = [];
            
            switch(algo) {
                case 'fifo':
                    this.simulateFIFO(true);
                    break;
                case 'lru':
                    this.simulateLRU(true);
                    break;
                case 'optimal':
                    this.simulateOptimal(true);
                    break;
                case 'lfu':
                    this.simulateLFU(true);
                    break;
                case 'afp':
                    this.simulateAFP(true);
                    break;
            }
            
            const total = this.pageFaults + this.hits;
            const hitRate = (this.hits / total) * 100;
            const missRate = (this.pageFaults / total) * 100;
            
            this.algorithmResults.set(algo, {
                name: this.getAlgorithmName(algo),
                pageFaults: this.pageFaults,
                hits: this.hits,
                hitRate: hitRate.toFixed(2),
                missRate: missRate.toFixed(2),
                efficiencyScore: this.calculateEfficiencyScore(hitRate, this.pageFaults)
            });
        }
        
        this.updateComparisonTable();
    }

    startSimulation() {
        const input = document.getElementById('referenceString').value;
        this.frameCount = parseInt(document.getElementById('frameCount').value);
        this.algorithm = document.getElementById('algorithm').value;
        
        this.referenceString = input.split(',').map(num => parseInt(num.trim()));
        
        if (!this.validateInput()) {
            alert('Please enter valid input: comma-separated numbers and frame count > 0');
            return;
        }

        this.frames = [];
        this.pageFaults = 0;
        this.hits = 0;
        this.simulationContainer.innerHTML = '';
        
        switch(this.algorithm) {
            case 'fifo':
                this.simulateFIFO(false);
                break;
            case 'lru':
                this.simulateLRU(false);
                break;
            case 'optimal':
                this.simulateOptimal(false);
                break;
            case 'lfu':
                this.simulateLFU(false);
                break;
            case 'afp':
                this.simulateAFP(false);
                break;
        }

        this.updateStats();
        this.updateChart();
    }

    getAlgorithmName(algo) {
        const names = {
            'fifo': 'First-In-First-Out',
            'lru': 'Least Recently Used',
            'optimal': 'Optimal',
            'lfu': 'Least Frequently Used',
            'afp': 'Adaptive Frequency-Proximity'
        };
        return names[algo] || algo.toUpperCase();
    }

    calculateMemoryOverhead() {
        // Calculate memory overhead based on actual frame usage and algorithm complexity
        const baseScore = 100;
        const frameUtilization = this.frames.length / this.frameCount;
        const algorithmPenalties = {
            'fifo': 5,    // Minimal overhead
            'lru': 15,    // Needs access time tracking
            'optimal': 40, // Future knowledge overhead
            'lfu': 20,    // Frequency counters
            'afp': 25     // Multiple metrics
        };
        
        return Math.max(0, baseScore - (frameUtilization * 10) - algorithmPenalties[this.algorithm]);
    }

    calculateCPUOverhead() {
        // Calculate CPU overhead based on actual page faults and algorithm operations
        const baseScore = 100;
        const faultRate = this.pageFaults / this.referenceString.length;
        const algorithmComplexity = {
            'fifo': 5,    // O(1) operations
            'lru': 20,    // O(1) but with more bookkeeping
            'optimal': 35, // O(n) future lookups
            'lfu': 25,    // Counter updates
            'afp': 30     // Multiple calculations
        };
        
        return Math.max(0, baseScore - (faultRate * 50) - algorithmComplexity[this.algorithm]);
    }

    calculatePredictability() {
        // Calculate predictability based on hit/fault patterns
        const hitRate = this.hits / (this.hits + this.pageFaults);
        const consecutiveHits = this.analyzeConsecutiveHits();
        return Math.round((hitRate * 60) + (consecutiveHits * 40));
    }

    calculateScalability() {
        // Calculate scalability based on performance with increasing load
        const workloadSize = this.referenceString.length;
        const frameEfficiency = this.hits / (this.frameCount * workloadSize);
        const loadFactor = Math.min(1, workloadSize / (this.frameCount * 10));
        
        return Math.round(frameEfficiency * 70 + (1 - loadFactor) * 30);
    }

    analyzeConsecutiveHits() {
        // Helper method to analyze hit patterns
        let consecutiveHits = 0;
        let maxConsecutive = 0;
        let lastWasHit = false;
        
        this.referenceString.forEach((page, index) => {
            const isHit = this.frames.includes(page);
            if (isHit) {
                if (lastWasHit) {
                    consecutiveHits++;
                    maxConsecutive = Math.max(maxConsecutive, consecutiveHits);
                } else {
                    consecutiveHits = 1;
                }
                lastWasHit = true;
            } else {
                lastWasHit = false;
                consecutiveHits = 0;
            }
        });
        
        return Math.min(1, maxConsecutive / this.frameCount);
    }

    simulateFIFO(runInBackground = false) {
        let frameQueue = [];
        
        this.referenceString.forEach((page, index) => {
            let isHit = frameQueue.includes(page);
            
            if (!isHit) {
                this.pageFaults++;
                if (frameQueue.length >= this.frameCount) {
                    frameQueue.shift();
                }
                frameQueue.push(page);
            } else {
                this.hits++;
            }
            
            if (!runInBackground) {
                this.visualizeStep(frameQueue, page, isHit, index);
            }
        });
    }

    simulateLRU(runInBackground = false) {
        let frameList = [];
        let lastUsed = new Map();
        
        this.referenceString.forEach((page, index) => {
            let isHit = frameList.includes(page);
            
            if (!isHit) {
                this.pageFaults++;
                if (frameList.length >= this.frameCount) {
                    let leastRecentPage = [...lastUsed.entries()]
                        .filter(([p]) => frameList.includes(p))
                        .sort(([,a], [,b]) => a - b)[0][0];
                    frameList = frameList.filter(p => p !== leastRecentPage);
                }
                frameList.push(page);
            } else {
                this.hits++;
            }
            
            lastUsed.set(page, index);
            if (!runInBackground) {
                this.visualizeStep(frameList, page, isHit, index);
            }
        });
    }

    simulateOptimal(runInBackground = false) {
        let frameList = [];
        
        this.referenceString.forEach((page, index) => {
            let isHit = frameList.includes(page);
            
            if (!isHit) {
                this.pageFaults++;
                if (frameList.length >= this.frameCount) {
                    let futureUse = new Map();
                    frameList.forEach(frame => {
                        let nextUse = this.referenceString.slice(index + 1).indexOf(frame);
                        futureUse.set(frame, nextUse === -1 ? Infinity : nextUse);
                    });
                    
                    let farthestPage = [...futureUse.entries()]
                        .sort(([,a], [,b]) => b - a)[0][0];
                    frameList = frameList.filter(p => p !== farthestPage);
                }
                frameList.push(page);
            } else {
                this.hits++;
            }
            
            if (!runInBackground) {
                this.visualizeStep(frameList, page, isHit, index);
            }
        });
    }

    simulateLFU(runInBackground = false) {
        let frameList = [];
        let frequency = new Map(); // Track frequency of each page
        let lastUsed = new Map();  // Track last usage time for tie-breaking
        
        this.referenceString.forEach((page, index) => {
            // Update frequency
            frequency.set(page, (frequency.get(page) || 0) + 1);
            lastUsed.set(page, index);
            
            let isHit = frameList.includes(page);
            
            if (!isHit) {
                this.pageFaults++;
                if (frameList.length >= this.frameCount) {
                    // Find page with minimum frequency
                    let minFreq = Infinity;
                    let leastFreqPage = null;
                    let earliestUsed = Infinity;
                    
                    frameList.forEach(p => {
                        const freq = frequency.get(p);
                        const lastUse = lastUsed.get(p);
                        
                        // If frequency is lower or equal but used earlier
                        if (freq < minFreq || (freq === minFreq && lastUse < earliestUsed)) {
                            minFreq = freq;
                            leastFreqPage = p;
                            earliestUsed = lastUse;
                        }
                    });
                    
                    // Remove the page with lowest score
                    frameList = frameList.filter(p => p !== leastFreqPage);
                }
                frameList.push(page);
            } else {
                this.hits++;
            }
            
            if (!runInBackground) {
                this.visualizeStep(frameList, page, isHit, index);
            }
        });
    }

    simulateAFP(runInBackground = false) {
        let frameList = [];
        let frequency = new Map();      // Track frequency of each page
        let lastAccess = new Map();     // Track last access time
        let accessHistory = new Map();   // Track access intervals
        
        // Constants for the AFP algorithm
        const FREQUENCY_WEIGHT = 0.4;    // Weight for frequency component
        const PROXIMITY_WEIGHT = 0.6;    // Weight for proximity component
        const HISTORY_WINDOW = 5;        // Size of access history window
        
        // Calculate proximity score based on access history
        const calculateProximityScore = (page, currentIndex) => {
            const history = accessHistory.get(page) || [];
            if (history.length < 2) return 0;
            
            // Calculate average access interval
            let totalInterval = 0;
            for (let i = 1; i < history.length; i++) {
                totalInterval += history[i] - history[i-1];
            }
            const avgInterval = totalInterval / (history.length - 1);
            
            // Calculate proximity score based on average interval
            // Lower interval means higher proximity score
            return 1 / (avgInterval + 1);
        };
        
        // Update access history for a page
        const updateAccessHistory = (page, index) => {
            let history = accessHistory.get(page) || [];
            history.push(index);
            
            // Keep only the recent HISTORY_WINDOW accesses
            if (history.length > HISTORY_WINDOW) {
                history = history.slice(-HISTORY_WINDOW);
            }
            accessHistory.set(page, history);
        };
        
        // Calculate the AFP score for a page
        const calculateAFPScore = (page, currentIndex) => {
            const freq = frequency.get(page) || 0;
            const maxFreq = Math.max(...Array.from(frequency.values()));
            const normalizedFreq = maxFreq > 0 ? freq / maxFreq : 0;
            
            const proximityScore = calculateProximityScore(page, currentIndex);
            
            // Combine frequency and proximity scores with weights
            return (normalizedFreq * FREQUENCY_WEIGHT) + 
                   (proximityScore * PROXIMITY_WEIGHT);
        };
        
        this.referenceString.forEach((page, index) => {
            // Update frequency and access history
            frequency.set(page, (frequency.get(page) || 0) + 1);
            lastAccess.set(page, index);
            updateAccessHistory(page, index);
            
            let isHit = frameList.includes(page);
            
            if (!isHit) {
                this.pageFaults++;
                if (frameList.length >= this.frameCount) {
                    // Find page with lowest AFP score to replace
                    let minScore = Infinity;
                    let pageToReplace = null;
                    
                    frameList.forEach(p => {
                        const score = calculateAFPScore(p, index);
                        if (score < minScore) {
                            minScore = score;
                            pageToReplace = p;
                        }
                    });
                    
                    // Remove the page with lowest score
                    frameList = frameList.filter(p => p !== pageToReplace);
                }
                frameList.push(page);
            } else {
                this.hits++;
            }
            
            if (!runInBackground) {
                this.visualizeStep(frameList, page, isHit, index);
            }
        });
    }

    visualizeStep(frames, currentPage, isHit, step) {
        const row = document.createElement('div');
        row.className = 'frame-row';
        
        const refNum = document.createElement('div');
        refNum.className = 'reference-number';
        refNum.textContent = currentPage;
        row.appendChild(refNum);
        
        for (let i = 0; i < this.frameCount; i++) {
            const cell = document.createElement('div');
            cell.className = 'frame-cell';
            if (frames[i] !== undefined) {
                cell.textContent = frames[i];
                cell.classList.add(isHit ? 'hit' : 'fault');
            }
            row.appendChild(cell);
        }
        
        this.simulationContainer.appendChild(row);
        row.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

    updateStats() {
        const total = this.pageFaults + this.hits;
        document.getElementById('pageFaults').textContent = this.pageFaults;
        document.getElementById('hitRate').textContent = 
            total > 0 ? ((this.hits / total) * 100).toFixed(2) + '%' : '0%';
        document.getElementById('missRate').textContent = 
            total > 0 ? ((this.pageFaults / total) * 100).toFixed(2) + '%' : '0%';
    }

    updateChart() {
        const ctx = document.getElementById('comparisonChart').getContext('2d');
        const total = this.pageFaults + this.hits;
        
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }
        
        this.chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Hit Rate', 'Miss Rate'],
                datasets: [{
                    label: 'Percentage',
                    data: [
                        ((this.hits / total) * 100).toFixed(2),
                        ((this.pageFaults / total) * 100).toFixed(2)
                    ],
                    backgroundColor: [
                        'rgba(46, 196, 182, 0.5)',
                        'rgba(239, 71, 111, 0.5)'
                    ],
                    borderColor: [
                        'rgba(46, 196, 182, 1)',
                        'rgba(239, 71, 111, 1)'
                    ],
                    borderWidth: 2,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    resetChart() {
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }
        this.updateChart();
    }

    validateInput() {
        return this.referenceString.every(num => !isNaN(num)) && this.frameCount > 0;
    }

    getEfficiencyClass(score) {
        if (score >= 80) return 'efficiency-high';
        if (score >= 60) return 'efficiency-medium';
        return 'efficiency-low';
    }

    getScoreBreakdown(algo, result) {
        if (this.comparisonMode === 'performance') {
            return `
                <div class="score-breakdown">
                    <small>
                        <strong>Performance Metrics:</strong><br>
                        • Hit Rate (80%): ${(result.hitRate * 0.8).toFixed(1)}%<br>
                        • Fault Reduction (20%): ${((1 - (result.pageFaults / this.referenceString.length)) * 100 * 0.2).toFixed(1)}%
                    </small>
                </div>
            `;
        }

        return `
            <div class="score-breakdown">
                <small>
                    <strong>Real-world Performance (40%):</strong><br>
                    • Hit Rate: ${(result.hitRate * 0.25).toFixed(1)}%<br>
                    • Fault Reduction: ${((1 - (result.pageFaults / this.referenceString.length)) * 100 * 0.15).toFixed(1)}%<br>
                    <strong>Implementation Practicality (35%):</strong><br>
                    • Memory Overhead: ${(this.calculateMemoryOverhead() * 0.20).toFixed(1)}%<br>
                    • CPU Usage: ${(this.calculateCPUOverhead() * 0.15).toFixed(1)}%<br>
                    <strong>Real-world Adaptability (25%):</strong><br>
                    • Predictability: ${(this.calculatePredictability() * 0.15).toFixed(1)}%<br>
                    • Scalability: ${(this.calculateScalability() * 0.10).toFixed(1)}%
                </small>
            </div>
        `;
    }

    generateRandomString() {
        const length = Math.floor(Math.random() * 10) + 10; // Generate between 10-20 numbers
        const maxNumber = Math.floor(Math.random() * 5) + 5; // Range of numbers (5-10)
        const randomString = Array.from({length}, () => Math.floor(Math.random() * maxNumber) + 1);
        document.getElementById('referenceString').value = randomString.join(',');
    }
}

// Initialize the simulator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new PageReplacementSimulator();
});
