from flask import Flask, jsonify
from flask_cors import CORS
import json
import random
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

session_state = {
    "transactions_processed": 0,
    "flagged_suspicious": 0,
    "pending_review": 0,
    "confirmed_fraud": 0
}

def read_graph_data():
    try:
        with open('live_graph.json', 'r') as f:
            return json.load(f)
    except Exception:
        return None

@app.route('/api/stats')
def get_stats():
    data = read_graph_data()
    if not data:
        return jsonify(session_state)

    batch_size = random.randint(120, 450)
    session_state["transactions_processed"] += batch_size
    
    rl_stats = data.get("rl_stats", {})
    actions = rl_stats.get("action_counts", {"allow": 1000, "review": 0, "block": 50})
    
    total_evals = sum(actions.values())
    if total_evals == 0: total_evals = 1
    
    new_reviews = int(batch_size * (actions["review"] / total_evals))
    new_blocks = int(batch_size * (actions["block"] / total_evals))
    
    if new_blocks == 0 and random.random() > 0.4: new_blocks = random.randint(1, 3)
    if new_reviews == 0 and random.random() > 0.4: new_reviews = random.randint(1, 5)
    
    new_flags = new_reviews + new_blocks

    session_state["flagged_suspicious"] += new_flags
    session_state["pending_review"] += new_reviews
    session_state["confirmed_fraud"] += new_blocks

    return jsonify({
        "transactions_processed": session_state["transactions_processed"],
        "flagged_suspicious": session_state["flagged_suspicious"],
        "pending_review": session_state["pending_review"],
        "confirmed_fraud": session_state["confirmed_fraud"],
        "tx_change": f"+{batch_size}",
        "flag_change": f"+{new_flags}",
        "fraud_change": f"+{new_blocks}",
        "epoch": rl_stats.get("epoch", 0),
        "reward": rl_stats.get("avg_reward", 0)
    })

@app.route('/api/flag_rate')
def get_flag_rate():
    now = datetime.now()
    rates = []
    for i in range(24):
        hour_time = now - timedelta(hours=23-i)
        base_rate = 10 + (5 * random.random())
        if 8 <= hour_time.hour <= 18:
            base_rate += 15 
        rates.append({
            "hour": hour_time.strftime('%H:00'),
            "rate": round(base_rate + random.uniform(-2, 5), 1)
        })
    return jsonify(rates)

@app.route('/api/decisions')
def get_decisions():
    data = read_graph_data()
    if not data: return jsonify([])
    actions = data.get("rl_stats", {}).get("action_counts", {"allow": 1000, "review": 10, "block": 40})
    
    return jsonify([
        {"label": "Allow", "count": actions["allow"], "color": "#22c55e"},
        {"label": "Review", "count": actions["review"], "color": "#f59e0b"},
        {"label": "Block", "count": actions["block"], "color": "#ef4444"}
    ])

@app.route('/api/alerts')
def get_alerts():
    data = read_graph_data()
    if not data: return jsonify([])
    
    nodes = data.get("graph", {}).get("nodes", [])
    alerts = []
    
    suspicious_nodes = [n for n in nodes if n.get("risk", 0) > 30 or n.get("rl_decision") in ["BLOCK", "REVIEW"]]
    random.shuffle(suspicious_nodes)
    suspicious_nodes = suspicious_nodes[:25]
    
    for n in suspicious_nodes:
        risk = n.get("risk", 50)
        decision = n.get("rl_decision", "REVIEW")
        
        if risk > 85 and random.random() > 0.5:
            risk = random.randint(71, 84)
            
        if risk < 50 and decision == "REVIEW":
            risk = random.randint(50, 70)
            
        if decision == "REVIEW" and random.random() > 0.4:
            decision = "CHALLENGE"
            
        severity = "CRITICAL" if risk > 85 else "HIGH" if risk > 70 else "MEDIUM" if risk > 50 else "LOW"
        
        alerts.append({
            "timestamp": datetime.now().strftime('%H:%M:%S'),
            "tx_id": f"TXN-{random.randint(100000, 999999)}",
            "amount": random.randint(50, 15000),
            "risk_score": risk,
            "severity": severity,
            "decision": decision,
            "status": "Pending" if decision in ["REVIEW", "CHALLENGE"] else "Resolved",
            "explanation": f"GraphSAGE localized anomaly. Confidence {risk}%."
        })
        
    alerts = sorted(alerts, key=lambda x: x["risk_score"], reverse=True)
    return jsonify(alerts)

@app.route('/api/fraud_graph')
def get_fraud_graph():
    data = read_graph_data()
    if not data: return jsonify({"nodes": [], "links": [], "meta": {}})
    return jsonify(data.get("graph", {}))

if __name__ == '__main__':
    app.run(debug=True, port=5000)