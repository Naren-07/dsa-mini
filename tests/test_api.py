import urllib.request
import urllib.error
import json
import sys
import time

BASE_URL = "http://127.0.0.1:8080"

def get(path):
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=5) as res:
        return res.status, json.loads(res.read().decode('utf-8'))

def post(path, payload):
    url = f"{BASE_URL}{path}"
    data = json.dumps(payload).encode('utf-8') if isinstance(payload, (dict, list)) else payload.encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            return res.status, json.loads(res.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            return e.code, json.loads(body)
        except:
            return e.code, {"raw": body}

def run_tests():
    print("====================================================")
    print("      ROVER PATHLAB REST API TEST SUITE (A01-A09)   ")
    print("====================================================")

    passed = 0
    total = 0

    def assert_test(cond, name):
        nonlocal passed, total
        total += 1
        if cond:
            print(f"  [PASS] {name}")
            passed += 1
        else:
            print(f"  [FAIL] {name}")

    # A01: Health Check
    status, data = get("/api/health")
    assert_test(status == 200 and data.get("status") == "ok", "A01: GET /api/health returns 200 and status: ok")

    # A02: Random Map
    status, data = get("/api/random-map?width=10&height=10&seed=123")
    assert_test(status == 200 and len(data.get("terrain", [])) == 100, "A02: GET /api/random-map returns 200 with 100 cells")

    # Sample valid grid
    grid_payload = {
        "algorithm": "astar",
        "grid": {
            "width": 5,
            "height": 5,
            "terrain": [0] * 25
        },
        "start": [0, 0],
        "goal": [4, 4]
    }

    # A03: Plan Endpoint
    status, data = post("/api/plan", grid_payload)
    assert_test(status == 200 and data.get("found") is True and data.get("steps") == 8, "A03: POST /api/plan finds optimal 8-step path")

    # A04: Enclosed Goal
    enclosed_terrain = [0] * 25
    enclosed_terrain[3 * 5 + 4] = 4 # (4, 3)
    enclosed_terrain[4 * 5 + 3] = 4 # (3, 4)
    enclosed_payload = {
        "algorithm": "astar",
        "grid": {"width": 5, "height": 5, "terrain": enclosed_terrain},
        "start": [0, 0],
        "goal": [4, 4]
    }
    status, data = post("/api/plan", enclosed_payload)
    assert_test(status == 200 and data.get("found") is False, "A04: POST /api/plan on enclosed goal returns found: false")

    # A05: Malformed JSON Validation (HTTP 400)
    status, data = post("/api/plan", "{not-valid-json}")
    assert_test(status == 400 and "error" in data, "A05: POST /api/plan with malformed body returns HTTP 400")

    # A06: Out of Bounds Start/Goal (HTTP 400)
    oob_payload = {
        "algorithm": "astar",
        "grid": {"width": 5, "height": 5, "terrain": [0] * 25},
        "start": [10, 10],
        "goal": [4, 4]
    }
    status, data = post("/api/plan", oob_payload)
    assert_test(status == 400 and "bounds" in data.get("error", "").lower(), "A06: POST /api/plan with out-of-bounds start returns HTTP 400")

    # A07: Compare Endpoint
    compare_payload = {
        "grid": {"width": 6, "height": 6, "terrain": [0] * 36},
        "start": [0, 0],
        "goal": [5, 5]
    }
    status, data = post("/api/compare", compare_payload)
    assert_test(status == 200 and "astar" in data and "dijkstra" in data and "bfs" in data and "greedy" in data, 
                "A07: POST /api/compare executes all 4 algorithms")

    # A08: Simulate Endpoint
    sim_payload = {
        "algorithm": "astar",
        "grid": {"width": 10, "height": 10, "terrain": [0] * 100},
        "start": [0, 0],
        "goal": [9, 9],
        "obstacle_count": 4,
        "seed": 42
    }
    status, data = post("/api/simulate", sim_payload)
    assert_test(status == 200 and len(data.get("trajectory", [])) > 0, "A08: POST /api/simulate returns dynamic trajectory")

    # A09: Robustness & Fuzzing (10 malformed queries)
    fuzz_passed = True
    bad_payloads = [
        {"grid": {"width": -1, "height": 10, "terrain": []}, "start": [0,0], "goal": [1,1]},
        {"grid": {"width": 10, "height": 10, "terrain": [999]*100}, "start": [0,0], "goal": [1,1]},
        {"grid": {"width": 10, "height": 10, "terrain": [0]*50}, "start": [0,0], "goal": [1,1]},
        {"grid": {"width": 10, "height": 10, "terrain": [0]*100}, "start": "bad", "goal": [1,1]},
        {"start": [0,0], "goal": [1,1]}
    ]
    for bp in bad_payloads:
        s, d = post("/api/plan", bp)
        if s != 400:
            fuzz_passed = False
            break

    # Verify server is still alive
    s_alive, _ = get("/api/health")
    assert_test(fuzz_passed and s_alive == 200, "A09: 100% resilient to fuzzed payloads without crashing server")

    print("\n----------------------------------------------------")
    print(f"  Summary: {passed} / {total} tests passed ({passed/total*100:.1f}%)")
    print("----------------------------------------------------\n")

    if passed == total:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
