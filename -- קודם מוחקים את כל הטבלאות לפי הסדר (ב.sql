-- קודם מוחקים את כל הטבלאות לפי הסדר (בגלל תלותים אפשריים)
DROP TABLE IF EXISTS stop_times CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS shapes CASCADE;
DROP TABLE IF EXISTS routes CASCADE;
DROP TABLE IF EXISTS stops CASCADE;
DROP TABLE IF EXISTS fare_rules CASCADE;
DROP TABLE IF EXISTS fare_attributes CASCADE;
DROP TABLE IF EXISTS calendar CASCADE;
DROP TABLE IF EXISTS agency CASCADE;
DROP TABLE IF EXISTS translations CASCADE;

-- AGENCY
CREATE TABLE agency (
    agency_id TEXT PRIMARY KEY,
    agency_name TEXT NOT NULL,
    agency_url TEXT NOT NULL,
    agency_timezone TEXT NOT NULL,
    agency_lang TEXT,
    agency_phone TEXT,
    agency_fare_url TEXT
);

-- STOPS
CREATE TABLE stops (
    stop_id TEXT PRIMARY KEY,
    stop_code TEXT,
    stop_name TEXT NOT NULL,
    stop_desc TEXT,
    stop_lat NUMERIC,
    stop_lon NUMERIC,
    location_type INTEGER,
    parent_station TEXT,
    zone_id TEXT
);

-- ROUTES
CREATE TABLE routes (
    route_id TEXT PRIMARY KEY,
    agency_id TEXT,
    route_short_name TEXT,
    route_long_name TEXT,
    route_desc TEXT,
    route_type INTEGER,
    route_color TEXT,
    FOREIGN KEY (agency_id) REFERENCES agency(agency_id)
);

-- TRIPS
CREATE TABLE trips (
    trip_id TEXT PRIMARY KEY,
    route_id TEXT NOT NULL,
    service_id TEXT NOT NULL,
    trip_headsign TEXT,
    direction_id INTEGER,
    shape_id TEXT,
    wheelchair_accessible INTEGER,
    FOREIGN KEY (route_id) REFERENCES routes(route_id)
);

-- STOP_TIMES
CREATE TABLE stop_times (
    trip_id TEXT NOT NULL,
    arrival_time TEXT,
    departure_time TEXT,
    stop_id TEXT NOT NULL,
    stop_sequence INTEGER NOT NULL,
    pickup_type INTEGER,
    drop_off_type INTEGER,
    shape_dist_traveled NUMERIC,
    FOREIGN KEY (trip_id) REFERENCES trips(trip_id),
    FOREIGN KEY (stop_id) REFERENCES stops(stop_id)
);

-- SHAPES
CREATE TABLE shapes (
    shape_id TEXT NOT NULL,
    shape_pt_lat NUMERIC NOT NULL,
    shape_pt_lon NUMERIC NOT NULL,
    shape_pt_sequence INTEGER NOT NULL
);

-- FARE_ATTRIBUTES
CREATE TABLE fare_attributes (
    fare_id TEXT PRIMARY KEY,
    price NUMERIC NOT NULL,
    currency_type TEXT NOT NULL,
    payment_method INTEGER,
    transfers INTEGER,
    agency_id TEXT,
    transfer_duration INTEGER
);

-- FARE_RULES
CREATE TABLE fare_rules (
    fare_id TEXT,
    route_id TEXT,
    origin_id TEXT,
    destination_id TEXT,
    contains_id TEXT,
    FOREIGN KEY (fare_id) REFERENCES fare_attributes(fare_id),
    FOREIGN KEY (route_id) REFERENCES routes(route_id)
);

-- CALENDAR
CREATE TABLE calendar (
    service_id TEXT PRIMARY KEY,
    sunday INTEGER,
    monday INTEGER,
    tuesday INTEGER,
    wednesday INTEGER,
    thursday INTEGER,
    friday INTEGER,
    saturday INTEGER,
    start_date TEXT,
    end_date TEXT
);

-- TRANSLATIONS
CREATE TABLE translations (
    trans_id TEXT PRIMARY KEY,
    lang TEXT,
    translation TEXT
);
