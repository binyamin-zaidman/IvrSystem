-- -- STOPS
-- COPY stops (stop_id, stop_code, stop_name, stop_desc, stop_lat, stop_lon, location_type, parent_station, zone_id)
-- FROM '/tmp/gtfs_data/stops.txt'
-- DELIMITER ','
-- CSV HEADER;

-- -- TRIPS
-- COPY trips (route_id, service_id, trip_id, trip_headsign, direction_id, shape_id, wheelchair_accessible)
-- FROM '/tmp/gtfs_data/trips.txt'
-- DELIMITER ','
-- CSV HEADER;

-- -- TRANSLATIONS
-- COPY translations (trans_id, lang, translation)
-- FROM '/tmp/gtfs_data/translations.txt'
-- DELIMITER ','
-- CSV HEADER;

-- -- STOP_TIMES
-- COPY stop_times (trip_id, arrival_time, departure_time, stop_id, stop_sequence, pickup_type, drop_off_type, shape_dist_traveled)
-- FROM '/tmp/gtfs_data/stop_times.txt'
-- DELIMITER ','
-- CSV HEADER;

-- -- SHAPES
-- COPY shapes (shape_id, shape_pt_lat, shape_pt_lon, shape_pt_sequence)
-- FROM '/tmp/gtfs_data/shapes.txt'
-- DELIMITER ','
-- CSV HEADER;

-- -- ROUTES
-- COPY routes (route_id, agency_id, route_short_name, route_long_name, route_desc, route_type, route_color)
-- FROM '/tmp/gtfs_data/routes.txt'
-- DELIMITER ','
-- CSV HEADER;

-- -- FARE_RULES
-- COPY fare_rules (fare_id, route_id, origin_id, destination_id, contains_id)
-- FROM '/tmp/gtfs_data/fare_rules.txt'
-- DELIMITER ','
-- CSV HEADER;

-- -- FARE_ATTRIBUTES
-- COPY fare_attributes (fare_id, price, currency_type, payment_method, transfers, agency_id, transfer_duration)
-- FROM '/tmp/gtfs_data/fare_attributes.txt'
-- DELIMITER ','
-- CSV HEADER;

-- -- CALENDAR
-- COPY calendar (service_id, sunday, monday, tuesday, wednesday, thursday, friday, saturday, start_date, end_date)
-- FROM '/tmp/gtfs_data/calendar.txt'
-- DELIMITER ','
-- CSV HEADER;

-- -- AGENCY
-- COPY agency (agency_id, agency_name, agency_url, agency_timezone, agency_lang, agency_phone, agency_fare_url)
-- FROM '/tmp/gtfs_data/agency.txt'
-- DELIMITER ','
-- CSV HEADER;


-- stops
COPY stops (stop_id, stop_code, stop_name, stop_desc, stop_lat, stop_lon, location_type, parent_station, zone_id)
FROM 'C:/Users/bl884/documents/MyGtfsFiles/stops.txt'
DELIMITER ','
CSV HEADER
QUOTE '"'
ESCAPE '"';

-- trips
COPY trips (route_id, service_id, trip_id, trip_headsign, direction_id, shape_id, wheelchair_accessible)
FROM 'C:/Users/bl884/documents/MyGtfsFiles/trips.txt'
DELIMITER ','
CSV HEADER
QUOTE '"'
ESCAPE '"';

-- translations
COPY translations (trans_id, lang, translation)
FROM 'C:/Users/bl884/documents/MyGtfsFiles/translations.txt'
DELIMITER ','
CSV HEADER
QUOTE '"'
ESCAPE '"';

-- stop_times
COPY stop_times (trip_id, arrival_time, departure_time, stop_id, stop_sequence, pickup_type, drop_off_type, shape_dist_traveled)
FROM 'C:/Users/bl884/documents/MyGtfsFiles/stop_times.txt'
DELIMITER ','
CSV HEADER
QUOTE '"'
ESCAPE '"';

-- shapes
COPY shapes (shape_id, shape_pt_lat, shape_pt_lon, shape_pt_sequence)
FROM 'C:/Users/bl884/documents/MyGtfsFiles/shapes.txt'
DELIMITER ','
CSV HEADER
QUOTE '"'
ESCAPE '"';

-- routes
COPY routes (route_id, agency_id, route_short_name, route_long_name, route_desc, route_type, route_color)
FROM 'C:/Users/bl884/documents/MyGtfsFiles/routes.txt'
DELIMITER ','
CSV HEADER
QUOTE '"'
ESCAPE '"';

-- fare_rules
COPY fare_rules (fare_id, route_id, origin_id, destination_id, contains_id)
FROM 'C:/Users/bl884/documents/MyGtfsFiles/fare_rules.txt'
DELIMITER ','
CSV HEADER
QUOTE '"'
ESCAPE '"';

-- fare_attributes
COPY fare_attributes (fare_id, price, currency_type, payment_method, transfers, agency_id, transfer_duration)
FROM 'C:/Users/bl884/documents/MyGtfsFiles/fare_attributes.txt'
DELIMITER ','
CSV HEADER
QUOTE '"'
ESCAPE '"';

-- calendar
COPY calendar (service_id, sunday, monday, tuesday, wednesday, thursday, friday, saturday, start_date, end_date)
FROM 'C:/Users/bl884/documents/MyGtfsFiles/calendar.txt'
DELIMITER ','
CSV HEADER
QUOTE '"'
ESCAPE '"';

-- agency
COPY agency (agency_id, agency_name, agency_url, agency_timezone, agency_lang, agency_phone, agency_fare_url)
FROM 'C:/Users/bl884/documents/MyGtfsFiles/agency.txt'
DELIMITER ','
CSV HEADER
QUOTE '"'
ESCAPE '"';
