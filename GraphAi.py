import torch
import torch.nn.functional as F
from torch_geometric.nn import SAGEConv
from torch_geometric.data import Data
import numpy as np
import json
import os

# 1. Generate Synthetic Fraud Graph 

def generate_smurfing_fraud_graph(num_normal=1000, num_fraud=50, num_features=15):
    total_nodes = num_normal + num_fraud
    
    # Features (Simulating account age, velocity, IP risk, etc.)
    x_normal = np.random.normal(loc=0.0, scale=1.0, size=(num_normal, num_features))
    x_fraud = np.random.normal(loc=1.5, scale=1.5, size=(num_fraud, num_features)) 
    x = torch.tensor(np.concatenate([x_normal, x_fraud], axis=0), dtype=torch.float)
    y = torch.tensor(np.concatenate([np.zeros(num_normal), np.ones(num_fraud)]), dtype=torch.long)
    
    edges = []
    
    # 1. Normal transactions (Loose background noise)
    for i in range(num_normal):
        # Normal users send money to 3 random other normal users
        for n in np.random.choice(num_normal, 3, replace=True):
            edges.append([i, n])

    # We have 50 fraud nodes. Let's make 5 distinct crime syndicates of 10 nodes each.
    fraud_start_idx = num_normal
    for syndicate in range(5):
        start_idx = fraud_start_idx + (syndicate * 10)
        source_node = start_idx
        destination_node = start_idx + 9
        mule_nodes = range(start_idx + 1, start_idx + 9) # 8 mules in the middle

        # Fan-out: The Source sends dirty money to all 8 mules
        for mule in mule_nodes:
            edges.append([source_node, mule])

        # Fan-in: All 8 mules clean the money and send it to the Destination
        for mule in mule_nodes:
            edges.append([mule, destination_node])

        # Camouflage: The Source and Destination interact with normal nodes to blend in
        edges.append([source_node, np.random.choice(num_normal)])
        edges.append([destination_node, np.random.choice(num_normal)])

    edge_index = torch.tensor(np.array(edges).T, dtype=torch.long)
    return Data(x=x, edge_index=edge_index, y=y)

print("Initializing AI Environment and generating SMURFING graph...")
data = generate_smurfing_fraud_graph()
print(f"Graph Generated: {data.num_nodes} nodes, {data.num_edges} edges")


# 2. Advanced GraphSAGE Embedding Model

class GraphSAGE_Embedder(torch.nn.Module):
    def __init__(self, in_channels, hidden_channels, out_channels):
        super().__init__()
        self.conv1 = SAGEConv(in_channels, hidden_channels)
        self.conv2 = SAGEConv(hidden_channels, out_channels)

    def forward(self, x, edge_index):
        x = self.conv1(x, edge_index)
        x = F.relu(x)
        x = F.dropout(x, p=0.3, training=self.training)
        x = self.conv2(x, edge_index)
        return x # Returns raw embeddings (the "State" for our RL agent)

embedder = GraphSAGE_Embedder(15, 32, 16) 
embedder_optimizer = torch.optim.Adam(embedder.parameters(), lr=0.01)

# 3. The Reinforcement Learning Agent

class RLAgent(torch.nn.Module):
    def __init__(self, state_dim, action_dim):
        super().__init__()
        self.fc1 = torch.nn.Linear(state_dim, 16)
        self.fc2 = torch.nn.Linear(16, action_dim) 

    def forward(self, state):
        x = F.relu(self.fc1(state))
        return F.softmax(self.fc2(x), dim=-1) 

# Actions: 0 = Allow, 1 = Review, 2 = Block
rl_agent = RLAgent(state_dim=16, action_dim=3)
rl_optimizer = torch.optim.Adam(rl_agent.parameters(), lr=0.005)

# 4. Web Exporter (Bridge to React)

def export_to_web(epoch, loss, avg_reward, actions):
    nodes = []
    links = []
    fraud_count = 0
    
  
    export_indices = list(range(120)) + list(range(1000, 1030))
    export_set = set(export_indices) 
    
    for i in export_indices:
        is_fraud = data.y[i].item() == 1
        group = "fraud" if is_fraud else "account"
        if is_fraud: fraud_count += 1
        
        # Grab the exact decision the RL agent made for this node
        rl_action_taken = actions[i].item()
        decision_map = {0: "ALLOW", 1: "REVIEW", 2: "BLOCK"}
        
        nodes.append({
            "id": f"ACC_{i}", 
            "group": group, 
            "risk": int(np.random.uniform(85, 99)) if is_fraud else int(np.random.uniform(5, 30)),
            "rl_decision": decision_map[rl_action_taken]
        })

    # Export connected edges
    edge_list = data.edge_index.t().tolist()
    for src, tgt in edge_list:
        if src in export_set and tgt in export_set:
            is_fraud_link = data.y[src].item() == 1 and data.y[tgt].item() == 1
            links.append({
                "source": f"ACC_{src}", 
                "target": f"ACC_{tgt}", 
                "fraud": is_fraud_link
            })
            if len(links) >= 300: break # Keep browser fast

    # Package everything into the exact JSON format the dashboard needs
    live_data = {
        "graph": {
            "nodes": nodes, 
            "links": links,
            "meta": {"total_nodes": len(nodes), "total_links": len(links), "fraud_nodes": fraud_count}
        },
        "rl_stats": {
            "epoch": epoch,
            "loss": round(loss, 4),
            "avg_reward": round(avg_reward, 2),
            "action_counts": {
                "allow": int((actions == 0).sum()),
                "review": int((actions == 1).sum()),
                "block": int((actions == 2).sum())
            }
        }
    }
    
    # Write to file for Flask to read
    with open('live_graph.json', 'w') as f:
        json.dump(live_data, f)


# 5. The Core Training Loop
def train_rl_fraud_system(epochs=5000):
    print("Starting Reinforcement Learning pipeline...")
    embedder.train()
    rl_agent.train()
    
    for epoch in range(epochs):
        embedder_optimizer.zero_grad()
        rl_optimizer.zero_grad()
        
        # 1. GraphSAGE looks at the network and creates the "State"
        states = embedder(data.x, data.edge_index)
        
        # 2. RL Agent decides what to do with every single transaction
        action_probs = rl_agent(states)
        actions = torch.multinomial(action_probs, 1).squeeze() 
        
        # 3. Bank evaluates the RL Agent's decisions (Rewards matched to IEEE paper)
        rewards = torch.zeros(data.num_nodes)
        for i in range(data.num_nodes):
            is_fraud = data.y[i] == 1
            action = actions[i]
            
            if is_fraud:
                if action == 2:   rewards[i] = 15.0   # Blocked Fraud
                elif action == 1: rewards[i] = 5.0    # Investigated Fraud 
                elif action == 0: rewards[i] = -20.0  # Allowed Fraud (Penalty)
            else:
                if action == 2:   rewards[i] = -25.0  # Blocked Normal User (High Penalty)
                elif action == 1: rewards[i] = -2.0   # Investigated Normal User 
                elif action == 0: rewards[i] = 1.0    # Allowed Normal User 

        # 4. The RL Agent updates its policy
        log_probs = torch.log(action_probs[range(data.num_nodes), actions])
        loss = -(log_probs * rewards).mean() 
        loss.backward()
        rl_optimizer.step()
        embedder_optimizer.step()
        
        avg_reward = (rewards.sum().item() / data.num_nodes)
        
        # 5. Export live data to the web dashboard every few epochs
        if epoch % 5 == 0:
            print(f"Epoch {epoch:03d} | Avg Reward: {avg_reward:>6.2f} | Loss: {loss.item():>7.4f} | Output sent to dashboard ➡")
            export_to_web(epoch, loss.item(), avg_reward, actions)

if __name__ == "__main__":
    train_rl_fraud_system()