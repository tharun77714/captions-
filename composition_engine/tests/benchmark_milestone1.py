import time
from composition_engine.models.payload import RenderPayload
from composition_engine.models.scene_graph import compile_scene_graph
from composition_engine.tests.test_milestone1 import BASE_PAYLOAD

def run_benchmark():
    # 1. Measure validation time
    start = time.perf_counter()
    iterations = 5000
    for _ in range(iterations):
        payload = RenderPayload(**BASE_PAYLOAD)
    end = time.perf_counter()
    validation_latency = (end - start) / iterations * 1000.0 # ms

    # 2. Measure SceneGraph compilation time
    payload = RenderPayload(**BASE_PAYLOAD)
    start = time.perf_counter()
    for _ in range(iterations):
        comp = compile_scene_graph(payload)
    end = time.perf_counter()
    compilation_latency = (end - start) / iterations * 1000.0 # ms

    print(f"--- MILESTONE 1 BENCHMARKS ({iterations} iterations) ---")
    print(f"RenderPayload validation latency: {validation_latency:.4f} ms per payload")
    print(f"SceneGraph compilation latency:   {compilation_latency:.4f} ms per graph")
    print(f"Total processing latency:          {validation_latency + compilation_latency:.4f} ms")

if __name__ == "__main__":
    run_benchmark()
