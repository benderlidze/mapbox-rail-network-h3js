# Create split_file.py (uses only built-in Python)
import json
import math

print("Reading GeoJSON file...")
with open('North_American_Rail_Network_Lines.json', 'r') as f:
    data = json.load(f)

features = data['features']
total_features = len(features)
print(f"Total features: {total_features:,}")

chunk_size = 50000  # Small chunks for ogr2ogr
num_chunks = math.ceil(total_features / chunk_size)

print(f"Splitting into {num_chunks} chunks...")

for i in range(0, total_features, chunk_size):
    chunk_num = i // chunk_size + 1
    chunk_features = features[i:i+chunk_size]
    
    chunk_data = {
        "type": "FeatureCollection",
        "features": chunk_features
    }
    
    filename = f'railway_chunk_{chunk_num:03d}.json'
    with open(filename, 'w') as f:
        json.dump(chunk_data, f)
    
    print(f"Created {filename} ({len(chunk_features):,} features)")

print("Now upload each chunk with ogr2ogr:")
for i in range(1, num_chunks + 1):
    filename = f'railway_chunk_{i:03d}.json'
    if i == 1:
        print(f'ogr2ogr -f "PostgreSQL" "PG:host=aws-0-us-west-1.pooler.supabase.com port=6543 dbname=postgres user=postgres.nrkllcbkmrrkypqcsgwm password=PgcyQeFrjmt38o8" {filename} -nln railway_network -overwrite')
    else:
        print(f'ogr2ogr -f "PostgreSQL" "PG:host=aws-0-us-west-1.pooler.supabase.com port=6543 dbname=postgres user=postgres.nrkllcbkmrrkypqcsgwm password=PgcyQeFrjmt38o8" {filename} -nln railway_network -append')
        
        
#Now upload each chunk with ogr2ogr:
# ogr2ogr -f "PostgreSQL" "PG:host=aws-0-us-west-1.pooler.supabase.com port=6543 dbname=postgres user=postgres.nrkllcbkmrrkypqcsgwm password=PgcyQeFrjmt38o8" railway_chunk_001.json -nln railway_network -overwrite
# ogr2ogr -f "PostgreSQL" "PG:host=aws-0-us-west-1.pooler.supabase.com port=6543 dbname=postgres user=postgres.nrkllcbkmrrkypqcsgwm password=PgcyQeFrjmt38o8" railway_chunk_002.json -nln railway_network -append
# ogr2ogr -f "PostgreSQL" "PG:host=aws-0-us-west-1.pooler.supabase.com port=6543 dbname=postgres user=postgres.nrkllcbkmrrkypqcsgwm password=PgcyQeFrjmt38o8" railway_chunk_003.json -nln railway_network -append
# ogr2ogr -f "PostgreSQL" "PG:host=aws-0-us-west-1.pooler.supabase.com port=6543 dbname=postgres user=postgres.nrkllcbkmrrkypqcsgwm password=PgcyQeFrjmt38o8" railway_chunk_004.json -nln railway_network -append
# ogr2ogr -f "PostgreSQL" "PG:host=aws-0-us-west-1.pooler.supabase.com port=6543 dbname=postgres user=postgres.nrkllcbkmrrkypqcsgwm password=PgcyQeFrjmt38o8" railway_chunk_005.json -nln railway_network -append
# ogr2ogr -f "PostgreSQL" "PG:host=aws-0-us-west-1.pooler.supabase.com port=6543 dbname=postgres user=postgres.nrkllcbkmrrkypqcsgwm password=PgcyQeFrjmt38o8" railway_chunk_006.json -nln railway_network -append
# ogr2ogr -f "PostgreSQL" "PG:host=aws-0-us-west-1.pooler.supabase.com port=6543 dbname=postgres user=postgres.nrkllcbkmrrkypqcsgwm password=PgcyQeFrjmt38o8" railway_chunk_007.json -nln railway_network -append