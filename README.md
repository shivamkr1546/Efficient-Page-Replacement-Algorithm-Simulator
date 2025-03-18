# Page Replacement Algorithm Simulator

A visual simulator for understanding and experimenting with different page replacement algorithms used in operating systems.

## Overview

This simulator helps visualize and understand various page replacement algorithms by providing an interactive interface to:
- Simulate different page replacement strategies
- Visualize the page frames and their contents
- Track page faults and hit rates
- Compare performance of different algorithms

## Features

- Support for multiple page replacement algorithms:
  - First In First Out (FIFO)
  - Least Recently Used (LRU)
  - Optimal Page Replacement
  - Clock (Second Chance) Algorithm
- Visual representation of page frames
- Real-time statistics and metrics
- Interactive page reference string input
- Performance comparison between algorithms

## Getting Started

### Prerequisites
- Python 3.x
- [Add any other dependencies]

### Installation
1. Clone the repository
2. Navigate to the project directory
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Usage
[Add usage instructions once the implementation is complete]

## Project Structure
```
page-algo-simulator/
├── src/               # Source code
├── tests/             # Test files
├── docs/              # Documentation
└── requirements.txt   # Project dependencies
```

## Algorithms Implemented

### 1. First In First Out (FIFO)
- Simplest page replacement algorithm
- Replaces the page that has been in memory the longest
- Uses a queue data structure

### 2. Least Recently Used (LRU)
- Replaces the page that hasn't been used for the longest time
- Uses a doubly linked list and hash map for O(1) operations

### 3. Optimal Page Replacement
- Theoretical algorithm that replaces the page that won't be used for the longest time
- Used as a benchmark for other algorithms

### 4. Clock (Second Chance) Algorithm
- Circular buffer implementation
- Gives pages a second chance before replacement
- More efficient than pure LRU

## Performance Metrics
- Page Fault Rate
- Hit Rate
- Memory Utilization
- Algorithm-specific metrics

## Contributing
[Add contribution guidelines]

## License
[Add license information]

## Contact
[Add contact information] 