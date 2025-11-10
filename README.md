 tippecanoe -zg -o ne_10m_admin_1_states_provinces.mbtiles --coalesce-densest-as-needed --extend-zooms-if-still-dropping North_American_Rail_Network_Lines.json

pgrouting

(gdal_latest) root@DESKTOP-KSA5DCI:/mnt/d/Downloads# ogr2ogr -f "PostgreSQL"   "PG:host=aws-0-us-west-1.pooler.supabase.com port=6543 dbname=postgres user=postgres.nrkllcbkmrrkypqcsgwm password=PgcyQeFrjmt38o8t"   railway_chunk_002.json   -nln railway_network   -append


CREATE EXTENSION IF NOT EXISTS pgrouting;
SELECT pgr_version();

SELECT pgr_createTopology(
  'public.railway_network',     -- your table name
  0.0001,                       -- tolerance (adjust if needed)
  'wkb_geometry',              -- geometry column
  'ogc_fid'                    -- unique ID column
);


 CREATE OR REPLACE FUNCTION get_route_geojson(
  start_lon DOUBLE PRECISION,
  start_lat DOUBLE PRECISION,
  end_lon DOUBLE PRECISION,
  end_lat DOUBLE PRECISION,
  snap_tolerance DOUBLE PRECISION  -- renamed from "precision"
)
RETURNS JSON AS $$
DECLARE
  start_node_id INTEGER;
  end_node_id INTEGER;
BEGIN
  -- Find nearest node to the start point within tolerance
  SELECT source INTO start_node_id
  FROM railway_network
  WHERE ST_DWithin(
    wkb_geometry,
    ST_SetSRID(ST_MakePoint(start_lon, start_lat), 4326),
    snap_tolerance
  )
  ORDER BY wkb_geometry <-> ST_SetSRID(ST_MakePoint(start_lon, start_lat), 4326)
  LIMIT 1;

  -- Find nearest node to the end point within tolerance
  SELECT target INTO end_node_id
  FROM railway_network
  WHERE ST_DWithin(
    wkb_geometry,
    ST_SetSRID(ST_MakePoint(end_lon, end_lat), 4326),
    snap_tolerance
  )
  ORDER BY wkb_geometry <-> ST_SetSRID(ST_MakePoint(end_lon, end_lat), 4326)
  LIMIT 1;

  -- If no nearby nodes found, return NULL
  IF start_node_id IS NULL OR end_node_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Return route as GeoJSON FeatureCollection
  RETURN (
    SELECT json_build_object(
      'type', 'FeatureCollection',
      'features', json_agg(
        json_build_object(
          'type', 'Feature',
          'geometry', ST_AsGeoJSON(rn.wkb_geometry)::json,
          'properties', json_build_object(
            'seq', r.seq,
            'node', r.node,
            'edge', r.edge,
            'cost', r.cost
          )
        )
      )
    )
    FROM (
      SELECT * FROM pgr_dijkstra(
        'SELECT ogc_fid AS id, source, target, miles AS cost FROM railway_network',
        start_node_id, end_node_id,
        directed := false
      )
    ) r
    JOIN railway_network rn ON r.edge = rn.ogc_fid
  );
END;
$$ LANGUAGE plpgsql;




🧪 Example usage:
SELECT get_route_geojson(
  -123.2424, 46.8450,
  -123.7494, 46.9800,
  0.01  -- snap_tolerance in degrees (~1km)
);




https://docs.google.com/spreadsheets/d/1QgSdCLt3NpA2U9naBFoZ8NO55o80B52Ry_upXHymPjg/edit?gid=1392841200#gid=1392841200

https://docs.google.com/spreadsheets/d/16mgAtEk_rdJfQyKgWbIZ-7EmmNh7yK7opnt5uGsAvGs/edit?gid=225856772#gid=225856772