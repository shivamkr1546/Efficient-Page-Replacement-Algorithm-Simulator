// Algorithm information data
const algorithmInfo = {
    fifo: {
        name: "First In First Out (FIFO)",
        description: "FIFO is one of the simplest page replacement algorithms. It works by maintaining a queue of pages in memory, where the oldest page is removed when a new page needs to be loaded.",
        features: [
            "Simple to implement and understand",
            "Uses a queue data structure",
            "Removes the oldest page in memory",
            "Does not consider page usage frequency",
            "Can suffer from Belady's anomaly"
        ],
        complexity: {
            time: "O(1) for page replacement",
            space: "O(n) where n is the number of page frames"
        },
        applications: [
            "Simple memory management systems",
            "Embedded systems with limited resources",
            "Teaching and learning operating system concepts"
        ],
        tutorial: {
            steps: [
                {
                    title: "Initial State",
                    description: "Start with empty page frames and a reference string.",
                    image: "static/images/fifo_tutorial_1.png"
                },
                {
                    title: "Page Loading",
                    description: "When a new page is requested, check if it's already in memory.",
                    image: "static/images/fifo_tutorial_2.png"
                },
                {
                    title: "Page Fault",
                    description: "If the page is not in memory and frames are full, remove the oldest page.",
                    image: "static/images/fifo_tutorial_3.png"
                },
                {
                    title: "Queue Update",
                    description: "Add the new page to the queue and update the memory state.",
                    image: "static/images/fifo_tutorial_4.png"
                }
            ]
        },
        quiz: {
            questions: [
                {
                    question: "What data structure is used in FIFO page replacement?",
                    options: ["Queue", "Stack", "Tree", "Hash Table"],
                    correct: 0
                },
                {
                    question: "What is Belady's anomaly?",
                    options: [
                        "Increasing page faults with more frames",
                        "Decreasing page faults with fewer frames",
                        "Equal page faults with different frames",
                        "Random page fault occurrence"
                    ],
                    correct: 0
                }
            ]
        }
    },
    lru: {
        name: "Least Recently Used (LRU)",
        description: "LRU replaces the page that hasn't been used for the longest period. It tracks when each page was last accessed to make replacement decisions.",
        features: [
            "Based on temporal locality principle",
            "Tracks page access history",
            "Better performance than FIFO",
            "More complex implementation",
            "Immune to Belady's anomaly"
        ],
        complexity: {
            time: "O(1) for page access and replacement with hardware support",
            space: "O(n) where n is the number of page frames"
        },
        applications: [
            "Modern operating systems",
            "Database buffer management",
            "Cache replacement policies"
        ],
        tutorial: {
            steps: [
                {
                    title: "Initial Setup",
                    description: "Begin with empty frames and track access times.",
                    image: "static/images/lru_tutorial_1.png"
                },
                {
                    title: "Page Access",
                    description: "Update the access time when a page is referenced.",
                    image: "static/images/lru_tutorial_2.png"
                },
                {
                    title: "Page Replacement",
                    description: "When needed, remove the page with the oldest access time.",
                    image: "static/images/lru_tutorial_3.png"
                },
                {
                    title: "State Update",
                    description: "Add the new page and record its access time.",
                    image: "static/images/lru_tutorial_4.png"
                }
            ]
        },
        quiz: {
            questions: [
                {
                    question: "What is the main advantage of LRU over FIFO?",
                    options: [
                        "Better handling of locality",
                        "Simpler implementation",
                        "Lower memory usage",
                        "Faster execution"
                    ],
                    correct: 0
                },
                {
                    question: "What information does LRU track for each page?",
                    options: [
                        "Last access time",
                        "Page size",
                        "Page content",
                        "Page location"
                    ],
                    correct: 0
                }
            ]
        }
    }
};

// Current state
let currentAlgorithm = null;
let currentTutorialStep = 0;
let currentQuizQuestion = 0;
let quizScore = 0;

// Initialize modal content
function initializeAlgorithmInfo(algorithm) {
    currentAlgorithm = algorithm;
    currentTutorialStep = 0;
    currentQuizQuestion = 0;
    quizScore = 0;
    
    const info = algorithmInfo[algorithm];
    
    // Update overview tab
    document.getElementById('algorithmName').textContent = info.name;
    document.getElementById('algorithmDescription').textContent = info.description;
    
    const featuresList = document.getElementById('featuresList');
    featuresList.innerHTML = info.features.map(feature => `<li>${feature}</li>`).join('');
    
    document.getElementById('timeComplexity').textContent = info.complexity.time;
    document.getElementById('spaceComplexity').textContent = info.complexity.space;
    
    const applicationsList = document.getElementById('applicationsList');
    applicationsList.innerHTML = info.applications.map(app => `<li>${app}</li>`).join('');
    
    // Initialize tutorial
    updateTutorialStep();
    
    // Initialize quiz
    updateQuizQuestion();
}

// Tutorial navigation
function updateTutorialStep() {
    const tutorial = algorithmInfo[currentAlgorithm].tutorial;
    const step = tutorial.steps[currentTutorialStep];
    
    document.getElementById('tutorialTitle').textContent = step.title;
    document.getElementById('tutorialDescription').textContent = step.description;
    document.getElementById('tutorialImage').src = step.image;
    
    // Update navigation buttons
    document.getElementById('prevTutorial').disabled = currentTutorialStep === 0;
    document.getElementById('nextTutorial').disabled = currentTutorialStep === tutorial.steps.length - 1;
}

function nextTutorialStep() {
    if (currentTutorialStep < algorithmInfo[currentAlgorithm].tutorial.steps.length - 1) {
        currentTutorialStep++;
        updateTutorialStep();
    }
}

function prevTutorialStep() {
    if (currentTutorialStep > 0) {
        currentTutorialStep--;
        updateTutorialStep();
    }
}

// Quiz handling
function updateQuizQuestion() {
    const quiz = algorithmInfo[currentAlgorithm].quiz;
    const question = quiz.questions[currentQuizQuestion];
    
    document.getElementById('quizQuestion').textContent = question.question;
    
    const optionsContainer = document.getElementById('quizOptions');
    optionsContainer.innerHTML = question.options.map((option, index) => `
        <div class="form-check">
            <input class="form-check-input" type="radio" name="quizOption" value="${index}" id="option${index}">
            <label class="form-check-label" for="option${index}">${option}</label>
        </div>
    `).join('');
    
    // Reset feedback
    document.getElementById('quizFeedback').textContent = '';
    document.getElementById('quizFeedback').className = '';
}

function submitQuizAnswer() {
    const selectedOption = document.querySelector('input[name="quizOption"]:checked');
    if (!selectedOption) {
        document.getElementById('quizFeedback').textContent = 'Please select an answer';
        document.getElementById('quizFeedback').className = 'text-warning';
        return;
    }
    
    const quiz = algorithmInfo[currentAlgorithm].quiz;
    const question = quiz.questions[currentQuizQuestion];
    const isCorrect = parseInt(selectedOption.value) === question.correct;
    
    if (isCorrect) {
        quizScore++;
        document.getElementById('quizFeedback').textContent = 'Correct!';
        document.getElementById('quizFeedback').className = 'text-success';
    } else {
        document.getElementById('quizFeedback').textContent = 'Incorrect. Try again!';
        document.getElementById('quizFeedback').className = 'text-danger';
    }
    
    // Move to next question or show results
    setTimeout(() => {
        if (currentQuizQuestion < quiz.questions.length - 1) {
            currentQuizQuestion++;
            updateQuizQuestion();
        } else {
            showQuizResults();
        }
    }, 1500);
}

function showQuizResults() {
    const quiz = algorithmInfo[currentAlgorithm].quiz;
    const percentage = (quizScore / quiz.questions.length) * 100;
    
    document.getElementById('quizContainer').innerHTML = `
        <div class="text-center">
            <h4>Quiz Complete!</h4>
            <p>Your score: ${quizScore}/${quiz.questions.length} (${percentage}%)</p>
            <button class="btn btn-primary" onclick="resetQuiz()">Try Again</button>
        </div>
    `;
}

function resetQuiz() {
    currentQuizQuestion = 0;
    quizScore = 0;
    updateQuizQuestion();
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Tutorial navigation
    document.getElementById('prevTutorial').addEventListener('click', prevTutorialStep);
    document.getElementById('nextTutorial').addEventListener('click', nextTutorialStep);
    
    // Quiz submission
    document.getElementById('submitQuiz').addEventListener('click', submitQuizAnswer);
    
    // Tab switching
    const tabs = document.querySelectorAll('[data-bs-toggle="tab"]');
    tabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', (e) => {
            if (e.target.getAttribute('href') === '#quiz') {
                resetQuiz();
            }
        });
    });
}); 