-- Creates the test database on first Docker Compose startup
SELECT 'CREATE DATABASE gallery_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'gallery_test')\gexec
