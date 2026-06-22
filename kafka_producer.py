import csv
import json
import time
from kafka import KafkaProducer

try:
    producer = KafkaProducer(
        bootstrap_servers=['localhost:9092'],
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )
    print("Successfully connected to Kafka!")
except Exception as e:
    print(f"Waiting for Kafka to start... (Error: {e})")

def stream_transactions_to_kafka(csv_file, topic_name):
    print(f"Starting transaction stream to topic: '{topic_name}'...")
    with open(csv_file, mode='r') as file:
        csv_reader = csv.DictReader(file)
        for row in csv_reader:
            producer.send(topic_name, value=row)
            print(f"Sent: {row['transaction_id']} | Amount: ${row['amount']}")
            time.sleep(0.5) # Sending 2 transactions per second
            
    producer.flush()
    print("Stream complete.")

if __name__ == "__main__":
    stream_transactions_to_kafka('fraud_stream_data.csv', 'financial_transactions')