// js/config.js - Public Supabase Configuration and Feature Flags
// Only public anon key, project URL, and client feature flags belong here.
// NEVER put Google client secrets or the service role key in repository code.

window.SUPABASE_URL = window.SUPABASE_URL || 'https://jbwwlyebmpamangwlgog.supabase.co';
window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'sb_publishable_kX0xur9mOPSfjhFQlvuvyA_9t2GJv7t';

// Feature Flag: Enable/disable demo student client simulation
// When set to false, all demo buttons and demo code paths are completely hidden/disabled.
window.ENABLE_DEMO = true;

// MQTT over WebSockets Configuration (HiveMQ Public Broker)
window.MQTT_BROKER_WSS = window.MQTT_BROKER_WSS || 'wss://broker.hivemq.com:8884/mqtt';
window.MQTT_RENT_TOPIC = window.MQTT_RENT_TOPIC || 'lumengrove/stations/station_01/rent';
window.DEFAULT_STATION_ID = window.DEFAULT_STATION_ID || 'station_01';
