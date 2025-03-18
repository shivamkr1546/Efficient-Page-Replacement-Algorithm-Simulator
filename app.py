from flask import Flask, render_template, request, jsonify
from collections import deque, Counter, OrderedDict
import matplotlib.pyplot as plt
import io
import base64
from typing import List, Tuple, Dict, Any

app = Flask(__name__)

# Store previous results with a maximum limit to prevent memory issues
MAX_HISTORY = 10
previous_results = []

# Page Replacement Algorithms
def fifo(page_frames, reference_string):
    memory = deque(maxlen=page_frames)
    page_faults = 0

    for page in reference_string:
        if page not in memory:
            page_faults += 1
            memory.append(page)
    return page_faults


def lru(page_frames: int, reference_string: List[int]) -> int:
    """
    Least Recently Used page replacement algorithm using OrderedDict for O(1) operations.
    
    Args:
        page_frames: Number of available page frames
        reference_string: List of page references
        
    Returns:
        Number of page faults
    """
    memory = OrderedDict()
    page_faults = 0

    for page in reference_string:
        if page not in memory:
            page_faults += 1
            if len(memory) == page_frames:
                # Remove the least recently used page (first item)
                memory.popitem(last=False)
            memory[page] = True
        else:
            # Move the accessed page to the end (most recently used)
            memory.move_to_end(page)
    return page_faults


def optimal(page_frames, reference_string):
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


def flru(page_frames, reference_string):
    memory = []
    page_faults = 0
    frequency = Counter()
    memory_states = []

    for page in reference_string:
        frequency[page] += 1
        if page not in memory:
            page_faults += 1
            if len(memory) == page_frames:
                min_freq = min(frequency[p] for p in memory)
                candidates = [p for p in memory if frequency[p] == min_freq]
                memory.remove(candidates[0])
            memory.append(page)
        memory_states.append(list(memory))
    return page_faults, memory_states


def generate_visualization(memory_states: List[List[int]], algorithm_name: str) -> str:
    """
    Generate a visualization of the page replacement process.
    
    Args:
        memory_states: List of memory states at each step
        algorithm_name: Name of the algorithm for the plot title
        
    Returns:
        Base64 encoded PNG image
    """
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
    plt.close()
    return plot_url


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/simulate", methods=["POST"])
def simulate():
    """
    Handle simulation requests and return results for all algorithms.
    
    Returns:
        JSON response with algorithm results and visualizations
    """
    try:
        # Get and validate user input
        data = request.json
        if not data or "page_frames" not in data or "reference_string" not in data:
            return jsonify({"error": "Missing required parameters"}), 400
            
        page_frames = int(data["page_frames"])
        if page_frames <= 0:
            return jsonify({"error": "Number of page frames must be positive"}), 400
            
        try:
            reference_string = list(map(int, data["reference_string"].split(',')))
            if not reference_string:
                return jsonify({"error": "Reference string cannot be empty"}), 400
        except ValueError:
            return jsonify({"error": "Invalid reference string format. Please use comma-separated numbers"}), 400

        # Run algorithms
        fifo_faults = fifo(page_frames, reference_string)
        lru_faults = lru(page_frames, reference_string)
        optimal_faults = optimal(page_frames, reference_string)
        flru_faults, flru_memory_states = flru(page_frames, reference_string)

        flru_visualization = generate_visualization(flru_memory_states, "FLRU")

        # Store results with limit
        result = {
            "page_frames": page_frames,
            "reference_string": reference_string,
            "fifo_faults": fifo_faults,
            "lru_faults": lru_faults,
            "optimal_faults": optimal_faults,
            "flru_faults": flru_faults
        }
        previous_results.append(result)
        if len(previous_results) > MAX_HISTORY:
            previous_results.pop(0)

        # Calculate overall performance
        total_fifo = sum(result['fifo_faults'] for result in previous_results)
        total_lru = sum(result['lru_faults'] for result in previous_results)
        total_optimal = sum(result['optimal_faults'] for result in previous_results)
        total_flru = sum(result['flru_faults'] for result in previous_results)

        return jsonify({
            "fifo_faults": fifo_faults,
            "lru_faults": lru_faults,
            "optimal_faults": optimal_faults,
            "flru_faults": flru_faults,
            "flru_visualization": flru_visualization,
            "previous_results": previous_results,
            "total_fifo": total_fifo,
            "total_lru": total_lru,
            "total_optimal": total_optimal,
            "total_flru": total_flru
        })

    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(debug=True)