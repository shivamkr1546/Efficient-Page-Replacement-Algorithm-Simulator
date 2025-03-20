from flask import Flask, render_template, request, jsonify
from collections import deque, Counter, OrderedDict
import matplotlib
matplotlib.use('Agg')  # Set the backend to Agg before importing pyplot
import matplotlib.pyplot as plt
import io
import base64
from typing import List, Tuple, Dict, Any
import logging
import statistics
from datetime import datetime
import gc
import psutil
import os
import json

app = Flask(__name__)
app.logger.setLevel(logging.INFO)

# Store previous results with a maximum limit to prevent memory issues
MAX_HISTORY = 10
previous_results = []

def get_memory_usage() -> Dict[str, float]:
    """
    Get current memory usage statistics.
    
    Returns:
        Dictionary containing memory usage information
    """
    process = psutil.Process(os.getpid())
    memory_info = process.memory_info()
    return {
        'rss': memory_info.rss / 1024 / 1024,  # Resident Set Size in MB
        'vms': memory_info.vms / 1024 / 1024,  # Virtual Memory Size in MB
        'percent': process.memory_percent()
    }

def cleanup_memory():
    """
    Perform memory cleanup operations.
    """
    # Force garbage collection
    gc.collect()
    
    # Clear matplotlib figures
    plt.close('all')
    
    # Clear any cached data
    if hasattr(app, 'cache'):
        app.cache.clear()
    
    # Log memory usage after cleanup
    memory_usage = get_memory_usage()
    app.logger.info(f"Memory usage after cleanup: {memory_usage}")

def optimize_memory_states(memory_states: List[List[int]]) -> List[List[int]]:
    """
    Optimize memory states to reduce memory usage.
    
    Args:
        memory_states: List of memory states
        
    Returns:
        Optimized list of memory states
    """
    if not memory_states:
        return []
        
    # Remove duplicate consecutive states
    optimized = []
    prev_state = None
    
    for state in memory_states:
        if state != prev_state:
            optimized.append(state)
            prev_state = state
    
    return optimized

def validate_input(page_frames: int, reference_string: List[int]) -> Tuple[bool, str]:
    """
    Validate input parameters for page replacement simulation.
    
    Args:
        page_frames: Number of page frames
        reference_string: List of page references
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if page_frames <= 0:
        return False, "Number of page frames must be positive"
    
    if not reference_string:
        return False, "Reference string cannot be empty"
    
    if any(x < 0 for x in reference_string):
        return False, "Page numbers cannot be negative"
    
    if len(reference_string) > 1000:
        return False, "Reference string is too long (max 1000 pages)"
    
    return True, ""

def calculate_statistics(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calculate performance statistics for all algorithms.
    
    Args:
        results: List of previous simulation results
        
    Returns:
        Dictionary containing performance statistics
    """
    if not results:
        return {}
        
    stats = {}
    algorithms = ['fifo', 'lru', 'optimal', 'lfu', 'clock', 'flru', 'lruf']
    
    for algo in algorithms:
        faults = [r[f'{algo}_faults'] for r in results]
        stats[f'{algo}_stats'] = {
            'min': min(faults),
            'max': max(faults),
            'mean': statistics.mean(faults),
            'median': statistics.median(faults),
            'std_dev': statistics.stdev(faults) if len(faults) > 1 else 0
        }
    
    return stats

def get_performance_comparison(results: List[Dict[str, Any]]) -> Dict[str, float]:
    """
    Compare performance of different algorithms.
    
    Args:
        results: List of previous simulation results
        
    Returns:
        Dictionary containing performance comparison metrics
    """
    if not results:
        return {}
        
    comparison = {}
    algorithms = ['fifo', 'lru', 'optimal', 'lfu', 'clock', 'flru', 'lruf']
    
    # Calculate average page faults for each algorithm
    for algo in algorithms:
        faults = [r[f'{algo}_faults'] for r in results]
        comparison[algo] = statistics.mean(faults)
    
    # Find the best performing algorithm
    best_algo = min(comparison.items(), key=lambda x: x[1])
    comparison['best_algorithm'] = best_algo[0]
    comparison['best_performance'] = best_algo[1]
    
    return comparison

# Page Replacement Algorithms
def fifo(page_frames: int, reference_string: List[int]) -> int:
    memory = deque(maxlen=page_frames)
    page_faults = 0

    for page in reference_string:
        if page not in memory:
            page_faults += 1
            memory.append(page)
    return page_faults

def lru(page_frames: int, reference_string: List[int]) -> int:
    memory = OrderedDict()
    page_faults = 0

    for page in reference_string:
        if page not in memory:
            page_faults += 1
            if len(memory) == page_frames:
                memory.popitem(last=False)  # Remove least recently used page
            memory[page] = True
        else:
            memory.move_to_end(page)  # Mark as recently used
    return page_faults

def optimal(page_frames: int, reference_string: List[int]) -> int:
    memory = []
    page_faults = 0

    for i, page in enumerate(reference_string):
        if page not in memory:
            page_faults += 1
            if len(memory) == page_frames:
                farthest = -1
                replace_page = -1
                for p in memory:
                    if p not in reference_string[i:]:
                        replace_page = p
                        break
                    else:
                        idx = reference_string[i:].index(p)
                        if idx > farthest:
                            farthest = idx
                            replace_page = p
                memory.remove(replace_page)
            memory.append(page)
    return page_faults

def lfu(page_frames: int, reference_string: List[int]) -> int:
    memory = []
    frequency = Counter()
    page_faults = 0

    for page in reference_string:
        frequency[page] += 1
        if page not in memory:
            page_faults += 1
            if len(memory) == page_frames:
                # Remove least frequently used page
                least_frequent = min(memory, key=lambda p: frequency[p])
                memory.remove(least_frequent)
            memory.append(page)
    return page_faults

def clock(page_frames: int, reference_string: List[int]) -> int:
    memory = [-1] * page_frames
    reference_bit = [0] * page_frames
    pointer = 0
    page_faults = 0

    for page in reference_string:
        if page in memory:
            reference_bit[memory.index(page)] = 1  # Give second chance
        else:
            page_faults += 1
            while reference_bit[pointer] == 1:
                reference_bit[pointer] = 0
                pointer = (pointer + 1) % page_frames
            memory[pointer] = page
            reference_bit[pointer] = 1
            pointer = (pointer + 1) % page_frames
    return page_faults

def flru(page_frames: int, reference_string: List[int]) -> Tuple[int, List[List[int]]]:
    """
    Frequency Least Recently Used (FLRU) page replacement algorithm.
    Combines frequency counting with LRU for better page replacement decisions.
    """
    memory = []
    page_faults = 0
    frequency = Counter()
    memory_states = []

    for page in reference_string:
        frequency[page] += 1
        if page not in memory:
            page_faults += 1
            if len(memory) == page_frames:
                # Find page with lowest frequency, break ties with LRU
                least_used = min(memory, key=lambda p: (frequency[p], reference_string.index(p)))
                memory.remove(least_used)
            memory.append(page)
        memory_states.append(list(memory))
    
    # Optimize memory states before returning
    memory_states = optimize_memory_states(memory_states)
    return page_faults, memory_states

def lruf(page_frames: int, reference_string: List[int]) -> Tuple[int, List[List[int]]]:
    """
    Least Recently Used with Frequency (LRUF) page replacement algorithm.
    Combines LRU with frequency counting to make replacement decisions.
    """
    memory = []
    page_faults = 0
    frequency = Counter()
    memory_states = []

    for page in reference_string:
        frequency[page] += 1
        if page not in memory:
            page_faults += 1
            if len(memory) == page_frames:
                least_used = min(memory, key=lambda p: (frequency[p], reference_string.index(p)))
                memory.remove(least_used)
            memory.append(page)
        memory_states.append(list(memory))
    
    # Optimize memory states before returning
    memory_states = optimize_memory_states(memory_states)
    return page_faults, memory_states

def generate_visualization(memory_states: List[List[int]], algorithm_name: str) -> str:
    """
    Generate a visualization of the page replacement process.
    """
    plt.switch_backend('Agg')  # Ensure we're using Agg backend
    
    try:
        fig, ax = plt.subplots(figsize=(12, 6))
        
        # Create scatter plot for each memory state
        for i, state in enumerate(memory_states):
            if state:  # Only plot if there are pages in memory
                ax.scatter([i] * len(state), state, 
                          label=f"Step {i+1}" if i == 0 else "", 
                          color='b', 
                          alpha=0.6)
        
        # Customize the plot
        ax.set_xlabel("Time Step", fontsize=10)
        ax.set_ylabel("Pages in Memory", fontsize=10)
        ax.set_title(f"{algorithm_name} Page Replacement Visualization", fontsize=12, pad=20)
        ax.grid(True, linestyle='--', alpha=0.7)
        
        # Add legend only for the first few steps to avoid cluttering
        handles, labels = ax.get_legend_handles_labels()
        if len(handles) > 5:
            ax.legend(handles[:5], labels[:5], loc='upper right')
        
        # Save plot to base64 string
        img = io.BytesIO()
        plt.savefig(img, format='png', bbox_inches='tight', dpi=300)
        img.seek(0)
        plot_url = base64.b64encode(img.getvalue()).decode()
        
        # Clean up
        plt.close('all')
        return plot_url
        
    except Exception as e:
        app.logger.error(f"Error generating visualization: {str(e)}")
        return ""
    finally:
        # Ensure all plots are closed
        plt.close('all')

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/simulate", methods=["POST"])
def simulate():
    try:
        # Get initial memory usage
        initial_memory = get_memory_usage()
        app.logger.info(f"Initial memory usage: {initial_memory}")

        # Get and validate user input
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        if "page_frames" not in data or "reference_string" not in data:
            return jsonify({"error": "Missing required parameters"}), 400
            
        try:
            page_frames = int(data["page_frames"])
        except ValueError:
            return jsonify({"error": "Invalid page frames value"}), 400
            
        try:
            # The reference string is already a list of integers from the frontend
            reference_string = data["reference_string"]
            if not isinstance(reference_string, list):
                return jsonify({"error": "Reference string must be a list of integers"}), 400
        except Exception as e:
            app.logger.error(f"Error parsing reference string: {str(e)}")
            return jsonify({"error": "Invalid reference string format"}), 400

        # Validate input parameters
        is_valid, error_message = validate_input(page_frames, reference_string)
        if not is_valid:
            return jsonify({"error": error_message}), 400

        app.logger.info(f"Starting simulation with {page_frames} frames and {len(reference_string)} references")

        # Run algorithms
        try:
            fifo_faults = fifo(page_frames, reference_string)
            lru_faults = lru(page_frames, reference_string)
            optimal_faults = optimal(page_frames, reference_string)
            lfu_faults = lfu(page_frames, reference_string)
            clock_faults = clock(page_frames, reference_string)
            flru_faults, _ = flru(page_frames, reference_string)
            lruf_faults, _ = lruf(page_frames, reference_string)
        except Exception as e:
            app.logger.error(f"Error running algorithms: {str(e)}")
            return jsonify({"error": "Error running page replacement algorithms"}), 500

        # Store results with timestamp
        result = {
            "timestamp": datetime.now().isoformat(),
            "page_frames": page_frames,
            "reference_string": reference_string,
            "fifo_faults": fifo_faults,
            "lru_faults": lru_faults,
            "optimal_faults": optimal_faults,
            "lfu_faults": lfu_faults,
            "clock_faults": clock_faults,
            "flru_faults": flru_faults,
            "lruf_faults": lruf_faults
        }
        
        # Add to previous results and maintain history limit
        previous_results.append(result)
        if len(previous_results) > MAX_HISTORY:
            previous_results.pop(0)

        # Calculate statistics
        all_faults = [
            fifo_faults, lru_faults, optimal_faults, 
            lfu_faults, clock_faults, flru_faults, lruf_faults
        ]
        
        # Find best algorithm
        algorithms = ['FIFO', 'LRU', 'Optimal', 'LFU', 'Clock', 'FLRU', 'LRUF']
        best_algorithm = algorithms[all_faults.index(min(all_faults))]
        
        # Calculate performance metrics
        avg_faults = statistics.mean(all_faults)
        std_dev = statistics.stdev(all_faults) if len(all_faults) > 1 else 0
        min_faults = min(all_faults)
        max_faults = max(all_faults)
        median_faults = statistics.median(all_faults)

        # Prepare visualization data for Plotly
        visualization_data = {
            'data': [{
                'x': algorithms,
                'y': all_faults,
                'type': 'bar',
                'text': [str(x) for x in all_faults],
                'textposition': 'auto',
                'marker': {
                    'color': ['#0d6efd', '#198754', '#dc3545', '#ffc107', '#0dcaf0', '#6f42c1', '#fd7e14']
                }
            }],
            'layout': {
                'title': 'Page Faults Comparison',
                'xaxis': {'title': 'Algorithms'},
                'yaxis': {'title': 'Number of Page Faults'},
                'showlegend': False,
                'height': 400,
                'margin': {'l': 50, 'r': 50, 't': 50, 'b': 50}
            }
        }

        # Perform memory cleanup
        cleanup_memory()
        
        # Get final memory usage
        final_memory = get_memory_usage()
        app.logger.info(f"Final memory usage: {final_memory}")

        app.logger.info("Simulation completed successfully")
        return jsonify({
            "fifo_faults": fifo_faults,
            "lru_faults": lru_faults,
            "optimal_faults": optimal_faults,
            "lfu_faults": lfu_faults,
            "clock_faults": clock_faults,
            "flru_faults": flru_faults,
            "lruf_faults": lruf_faults,
            "best_algorithm": best_algorithm,
            "avg_faults": avg_faults,
            "std_dev": std_dev,
            "min_faults": min_faults,
            "max_faults": max_faults,
            "median_faults": median_faults,
            "visualization": visualization_data,
            "memory_stats": {
                "rss": final_memory['rss'],
                "vms": final_memory['vms'],
                "usage": final_memory['percent']
            }
        })

    except Exception as e:
        app.logger.error(f"Error in simulation: {str(e)}")
        return jsonify({"error": f"An error occurred while running the simulation: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(debug=True)