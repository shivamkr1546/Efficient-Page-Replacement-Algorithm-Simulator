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
from functools import lru_cache
import numpy as np
from concurrent.futures import ThreadPoolExecutor

app = Flask(__name__)
app.logger.setLevel(logging.INFO)

# Initialize previous results storage
previous_results = []
MAX_HISTORY = 100

# Cache for algorithm results
@lru_cache(maxsize=1000)
def cached_algorithm(algorithm: str, page_frames: int, ref_str: str) -> Tuple[int, List[List[int]]]:
    """
    Cache results of algorithm runs to improve performance.
    
    Args:
        algorithm: The page replacement algorithm to use
        page_frames: Number of page frames
        ref_str: Comma-separated string of page references
        
    Returns:
        Tuple of (page_faults, memory_states)
    """
    reference_string = [int(x) for x in ref_str.split(',')]
    algorithms = {
        'fifo': fifo,
        'lru': lru,
        'optimal': optimal,
        'lfu': lfu,
        'clock': clock,
        'flru': flru,
        'lruf': lruf
    }
    return algorithms[algorithm](page_frames, reference_string)

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
        'percent': process.memory_percent(),
        'cpu_percent': process.cpu_percent()
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
def fifo(page_frames: int, reference_string: List[int]) -> Tuple[int, List[List[int]]]:
    """
    First In First Out (FIFO) page replacement algorithm.
    """
    memory = []
    page_faults = 0
    memory_states = []

    for page in reference_string:
        memory_states.append(list(memory))  # Store current state
        if page not in memory:
            page_faults += 1
            if len(memory) >= page_frames:
                memory.pop(0)  # Remove the first (oldest) page
            memory.append(page)
    
    memory_states.append(list(memory))  # Store final state
    return page_faults, optimize_memory_states(memory_states)

def lru(page_frames: int, reference_string: List[int]) -> Tuple[int, List[List[int]]]:
    """
    Least Recently Used (LRU) page replacement algorithm.
    """
    memory = []
    page_faults = 0
    memory_states = []

    for page in reference_string:
        memory_states.append(list(memory))  # Store current state
        if page not in memory:
            page_faults += 1
            if len(memory) >= page_frames:
                memory.pop(0)  # Remove least recently used page
            memory.append(page)
        else:
            # Move the accessed page to the end (most recently used)
            memory.remove(page)
            memory.append(page)
    
    memory_states.append(list(memory))  # Store final state
    return page_faults, optimize_memory_states(memory_states)

def optimal(page_frames: int, reference_string: List[int]) -> Tuple[int, List[List[int]]]:
    """
    Optimal (MIN) page replacement algorithm.
    """
    memory = []
    page_faults = 0
    memory_states = []

    for i, page in enumerate(reference_string):
        memory_states.append(list(memory))  # Store current state
        if page not in memory:
            page_faults += 1
            if len(memory) >= page_frames:
                # Find the page that won't be used for the longest time
                future_pages = reference_string[i+1:]
                if not future_pages:
                    memory.pop(0)
                else:
                    # Find which page in memory will be used furthest in the future
                    furthest_use = -1
                    replace_page = memory[0]
                    for current_page in memory:
                        if current_page not in future_pages:
                            replace_page = current_page
                            break
                        else:
                            use_index = future_pages.index(current_page)
                            if use_index > furthest_use:
                                furthest_use = use_index
                                replace_page = current_page
                    memory.remove(replace_page)
            memory.append(page)
    
    memory_states.append(list(memory))  # Store final state
    return page_faults, optimize_memory_states(memory_states)

def lfu(page_frames: int, reference_string: List[int]) -> Tuple[int, List[List[int]]]:
    """
    Least Frequently Used (LFU) page replacement algorithm.
    """
    memory = []
    page_faults = 0
    frequency = Counter()
    memory_states = []

    for page in reference_string:
        memory_states.append(list(memory))  # Store current state
        frequency[page] += 1
        if page not in memory:
            page_faults += 1
            if len(memory) >= page_frames:
                # Find least frequently used page
                lfu_page = min(memory, key=lambda x: frequency[x])
                memory.remove(lfu_page)
            memory.append(page)
    
    memory_states.append(list(memory))  # Store final state
    return page_faults, optimize_memory_states(memory_states)

def clock(page_frames: int, reference_string: List[int]) -> Tuple[int, List[List[int]]]:
    """
    Clock page replacement algorithm.
    """
    memory = [-1] * page_frames
    reference_bit = [0] * page_frames
    pointer = 0
    page_faults = 0
    memory_states = []

    for page in reference_string:
        # Store current state (excluding -1 values)
        current_state = [p for p in memory if p != -1]
        memory_states.append(list(current_state))

        if page in memory:
            reference_bit[memory.index(page)] = 1
        else:
            page_faults += 1
            while True:
                if memory[pointer] == -1:
                    memory[pointer] = page
                    reference_bit[pointer] = 1
                    pointer = (pointer + 1) % page_frames
                    break
                if reference_bit[pointer] == 0:
                    memory[pointer] = page
                    reference_bit[pointer] = 1
                    pointer = (pointer + 1) % page_frames
                    break
                reference_bit[pointer] = 0
                pointer = (pointer + 1) % page_frames

    # Store final state (excluding -1 values)
    final_state = [p for p in memory if p != -1]
    memory_states.append(list(final_state))
    return page_faults, optimize_memory_states(memory_states)

def flru(page_frames: int, reference_string: List[int]) -> Tuple[int, List[List[int]]]:
    """
    Frequency Least Recently Used (FLRU) page replacement algorithm.
    Prioritizes frequency over recency for replacement decisions.
    """
    memory = []
    memory_states = []
    frequency = Counter()
    last_used = {}
    page_faults = 0

    for i, page in enumerate(reference_string):
        memory_states.append(list(memory))  # Store current state
        
        frequency[page] += 1
        last_used[page] = i
        
        if page not in memory:
            page_faults += 1
            if len(memory) >= page_frames:
                # First prioritize by frequency, then by recency
                victim = min(memory, key=lambda p: (frequency[p], last_used[p]))
                memory.remove(victim)
            memory.append(page)
    
    memory_states.append(list(memory))  # Store final state
    return page_faults, optimize_memory_states(memory_states)

def lruf(page_frames: int, reference_string: List[int]) -> Tuple[int, List[List[int]]]:
    """
    Least Recently Used with Frequency (LRUF) page replacement algorithm.
    Prioritizes recency over frequency for replacement decisions.
    """
    memory = []
    memory_states = []
    frequency = Counter()
    last_used = {}
    page_faults = 0

    for i, page in enumerate(reference_string):
        memory_states.append(list(memory))  # Store current state
        
        frequency[page] += 1
        last_used[page] = i
        
        if page not in memory:
            page_faults += 1
            if len(memory) >= page_frames:
                # First prioritize by recency, then by frequency
                victim = min(memory, key=lambda p: (last_used[p], frequency[p]))
                memory.remove(victim)
            memory.append(page)
    
    memory_states.append(list(memory))  # Store final state
    return page_faults, optimize_memory_states(memory_states)

def generate_visualization(memory_states: List[List[int]], algorithm_name: str) -> str:
    """
    Generate a visualization combining Gantt Chart and Step Chart for page replacement process.
    Returns a base64 encoded PNG image.
    """
    plt.switch_backend('Agg')
    
    try:
        if not memory_states:
            return ""

        # Get all unique pages
        all_pages = set()
        for state in memory_states:
            all_pages.update(state)
        all_pages = sorted(list(all_pages))
        
        # Create figure with two subplots with more height for the Gantt chart
        fig = plt.figure(figsize=(12, 8))
        gs = fig.add_gridspec(2, 1, height_ratios=[2, 1], hspace=0.4)
        ax1 = fig.add_subplot(gs[0])
        ax2 = fig.add_subplot(gs[1])
        
        fig.suptitle(f'{algorithm_name} Page Replacement Process', fontsize=14, y=0.98)
        
        # Gantt Chart (Top)
        time_points = range(len(memory_states))
        colors = plt.cm.Set3(np.linspace(0, 1, len(all_pages)))
        color_map = dict(zip(all_pages, colors))
        
        for page in all_pages:
            current_start = None
            
            for t in time_points:
                is_present = page in memory_states[t]
                
                if is_present and current_start is None:
                    current_start = t
                elif not is_present and current_start is not None:
                    ax1.barh(y=page, width=t-current_start, left=current_start,
                            color=color_map[page], alpha=0.7, edgecolor='black',
                            label=f'Page {page}' if current_start == 0 else "")
                    current_start = None
                    
            if current_start is not None:
                ax1.barh(y=page, width=len(memory_states)-current_start, left=current_start,
                        color=color_map[page], alpha=0.7, edgecolor='black',
                        label=f'Page {page}' if current_start == 0 else "")
        
        # Customize Gantt Chart
        ax1.set_xlabel('Time Step', fontsize=10, labelpad=10)
        ax1.set_ylabel('Page Number', fontsize=10, labelpad=10)
        ax1.set_yticks(all_pages)
        ax1.set_yticklabels([f'Page {p}' for p in all_pages])
        ax1.grid(True, alpha=0.3, linestyle='--')
        ax1.set_title('Page Presence Timeline (Gantt Chart)', pad=20, fontsize=12)
        
        # Add legend with multiple columns if many pages
        if len(all_pages) > 6:
            ax1.legend(ncol=3, bbox_to_anchor=(0.5, -0.1), loc='upper center', 
                      fontsize=8, title='Page Numbers')
        else:
            ax1.legend(ncol=len(all_pages), bbox_to_anchor=(0.5, -0.1), 
                      loc='upper center', fontsize=9, title='Page Numbers')
        
        # Step Chart (Bottom)
        memory_sizes = [len(state) for state in memory_states]
        ax2.step(time_points, memory_sizes, where='post', color='blue', 
                 alpha=0.7, linewidth=2, label='Pages in Memory')
        ax2.fill_between(time_points, memory_sizes, step='post', alpha=0.3)
        
        # Customize Step Chart
        ax2.set_xlabel('Time Step', fontsize=10, labelpad=10)
        ax2.set_ylabel('Pages in Memory', fontsize=10, labelpad=10)
        ax2.grid(True, alpha=0.3, linestyle='--')
        ax2.set_title('Memory Utilization (Step Chart)', pad=20, fontsize=12)
        
        # Set y-axis limits for step chart
        ax2.set_ylim(0, max(memory_sizes) + 1)
        
        # Add value labels on the step chart
        for i, size in enumerate(memory_sizes):
            ax2.text(i, size + 0.1, str(size), ha='center', va='bottom')
        
        # Adjust layout to prevent overlapping
        plt.tight_layout()
        
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

def run_algorithms_parallel(page_frames: int, reference_string: List[int]) -> Dict[str, Any]:
    """
    Run all algorithms in parallel using ThreadPoolExecutor for better performance.
    """
    algorithms = {
        'fifo': fifo,
        'lru': lru,
        'optimal': optimal,
        'lfu': lfu,
        'clock': clock,
        'flru': flru,
        'lruf': lruf
    }
    
    results = {}
    memory_states = {}
    
    with ThreadPoolExecutor(max_workers=len(algorithms)) as executor:
        futures = {
            name: executor.submit(func, page_frames, reference_string)
            for name, func in algorithms.items()
        }
        
        for name, future in futures.items():
            faults, states = future.result()
            results[name] = faults
            memory_states[name] = states
    
    # Generate visualizations for each algorithm
    visualizations = {}
    for name, states in memory_states.items():
        visualizations[name] = generate_visualization(states, name.upper())
    
    return {
        'results': results,
        'memory_states': memory_states,
        'visualizations': visualizations
    }

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

        # Run algorithms in parallel
        parallel_results = run_algorithms_parallel(page_frames, reference_string)
        results = parallel_results['results']
        visualizations = parallel_results['visualizations']
        
        # Store results with timestamp
        result = {
            "timestamp": datetime.now().isoformat(),
            "page_frames": page_frames,
            "reference_string": reference_string,
            **{f"{algo}_faults": faults for algo, faults in results.items()}
        }
        
        # Add to previous results and maintain history limit
        previous_results.append(result)
        if len(previous_results) > MAX_HISTORY:
            previous_results.pop(0)

        # Calculate statistics
        all_faults = list(results.values())
        algorithms = ['FIFO', 'LRU', 'Optimal', 'LFU', 'Clock', 'FLRU', 'LRUF']
        best_algorithm = algorithms[all_faults.index(min(all_faults))]
        
        # Calculate performance metrics
        avg_faults = statistics.mean(all_faults)
        std_dev = statistics.stdev(all_faults) if len(all_faults) > 1 else 0
        min_faults = min(all_faults)
        max_faults = max(all_faults)
        median_faults = statistics.median(all_faults)

        # Calculate hit rates and miss ratios
        hit_rates = {}
        miss_ratios = {}
        total_references = len(reference_string)
        
        for algo, faults in results.items():
            hits = total_references - faults
            hit_rates[algo] = hits / total_references
            miss_ratios[algo] = faults / total_references

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

        # Prepare miss ratio visualization
        miss_ratio_data = {
            'data': [{
                'x': algorithms,
                'y': [miss_ratios[algo.lower()] * 100 for algo in algorithms],
                'type': 'bar',
                'text': [f"{(miss_ratios[algo.lower()] * 100):.1f}%" for algo in algorithms],
                'textposition': 'auto',
                'marker': {
                    'color': ['#dc3545', '#198754', '#0d6efd', '#ffc107', '#0dcaf0', '#6f42c1', '#fd7e14']
                },
                'name': 'Miss Ratio'
            }],
            'layout': {
                'title': 'Page Miss Ratio Comparison',
                'xaxis': {'title': 'Algorithms'},
                'yaxis': {'title': 'Miss Ratio (%)'},
                'showlegend': True,
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
            **{f"{algo.lower()}_faults": results[algo.lower()] for algo in algorithms},
            "best_algorithm": best_algorithm,
            "avg_faults": avg_faults,
            "std_dev": std_dev,
            "min_faults": min_faults,
            "max_faults": max_faults,
            "median_faults": median_faults,
            "hit_rates": hit_rates,
            "miss_ratios": miss_ratios,
            "visualization": visualization_data,
            "miss_ratio_visualization": miss_ratio_data,
            "algorithm_visualizations": visualizations,
            "memory_stats": {
                "rss": final_memory['rss'],
                "vms": final_memory['vms'],
                "usage": final_memory['percent'],
                "cpu_usage": final_memory['cpu_percent']
            }
        })

    except Exception as e:
        app.logger.error(f"Error in simulation: {str(e)}")
        return jsonify({"error": f"An error occurred while running the simulation: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(debug=True)