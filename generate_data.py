import csv
import random
import time

def generate_dataset(filename="fraud_stream_data.csv", num_rows=5000):
    print(f"Generating {num_rows} transactions. Please wait...")
    current_time = int(time.time())
    
    with open(filename, mode='w', newline='') as file:
        writer = csv.writer(file)
        # Write the column headers
        writer.writerow(['transaction_id', 'timestamp', 'sender_id', 'receiver_id', 'amount', 'transaction_type', 'device_id', 'ip_address', 'is_fraud'])
        
        for i in range(1, num_rows + 1):
            txn_id = f"TXN{i:06d}"
            current_time += random.randint(1, 5) # Advance time slightly for each transaction
            
            # 5% chance the transaction is part of a fraud ring
            is_fraud = 1 if random.random() < 0.05 else 0
            
            if is_fraud:
                # Fraudsters use the same few accounts, devices, and IPs (The "Ring")
                sender = f"ACC_F{random.randint(100, 105)}"
                receiver = f"ACC_F{random.randint(100, 105)}"
                amount = round(random.uniform(5000, 9999), 2)
                txn_type = "TRANSFER"
                device = "DEV_FRAUD_1"
                ip = "185.10.10.5"
            else:
                # Normal users are highly varied
                sender = f"ACC_N{random.randint(1000, 5000)}"
                receiver = f"ACC_N{random.randint(1000, 5000)}"
                amount = round(random.uniform(5, 500), 2)
                txn_type = random.choice(["PAYMENT", "TRANSFER", "DEPOSIT"])
                device = f"DEV_N{random.randint(1000, 5000)}"
                ip = f"192.168.1.{random.randint(1, 250)}"
                
            writer.writerow([txn_id, current_time, sender, receiver, amount, txn_type, device, ip, is_fraud])
            
    print(f"Success! Created '{filename}' with {num_rows} rows of data.")

if __name__ == "__main__":
    generate_dataset()