from pyspark.sql import SparkSession
from pyspark.sql.functions import from_json, col
from pyspark.sql.types import StructType, StringType

# Initialize Spark
spark = SparkSession.builder \
    .appName("FraudDetection_GraphAI_Stream") \
    .config("spark.jars.packages", "org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0") \
    .getOrCreate()

spark.sparkContext.setLogLevel("WARN")

# Define the structure of the incoming data
transaction_schema = StructType() \
    .add("transaction_id", StringType()) \
    .add("timestamp", StringType()) \
    .add("sender_id", StringType()) \
    .add("receiver_id", StringType()) \
    .add("amount", StringType()) \
    .add("transaction_type", StringType()) \
    .add("device_id", StringType()) \
    .add("ip_address", StringType())

print("Connecting to Kafka Stream...")

# Read from Kafka
raw_stream = spark.readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", "localhost:9092") \
    .option("subscribe", "financial_transactions") \
    .option("startingOffsets", "latest") \
    .load()

# Parse the JSON
parsed_stream = raw_stream.selectExpr("CAST(value AS STRING)") \
    .select(from_json(col("value"), transaction_schema).alias("data")) \
    .select("data.*")

# Output the processed stream to the console so we can see it working
query = parsed_stream.writeStream \
    .outputMode("append") \
    .format("console") \
    .start()

query.awaitTermination()
