CREATE DATABASE IF NOT EXISTS medtrack;
USE medtrack;

DROP TABLE IF EXISTS maintenance_parts;
DROP TABLE IF EXISTS maintenance_records;
DROP TABLE IF EXISTS failure_reports;
DROP TABLE IF EXISTS parts;
DROP TABLE IF EXISTS technicians;
DROP TABLE IF EXISTS devices;
DROP TABLE IF EXISTS device_types;
DROP TABLE IF EXISTS manufacturers;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('bme_admin', 'bme_engineer', 'bme_analyst') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE manufacturers (
    manufacturer_id INT PRIMARY KEY AUTO_INCREMENT,
    manufacturer_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE device_types (
    device_type_id INT PRIMARY KEY AUTO_INCREMENT,
    type_name VARCHAR(100) NOT NULL UNIQUE,
    risk_category ENUM('Low', 'Medium', 'High') DEFAULT 'Medium'
);

CREATE TABLE devices (
    device_id INT PRIMARY KEY AUTO_INCREMENT,
    device_code VARCHAR(50) NOT NULL UNIQUE,
    device_type_id INT NOT NULL,
    manufacturer_id INT NOT NULL,
    model VARCHAR(100),
    country VARCHAR(100),
    purchase_date DATE,
    age_years INT,
    risk_status ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Low',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_devices_device_type
        FOREIGN KEY (device_type_id)
        REFERENCES device_types(device_type_id),

    CONSTRAINT fk_devices_manufacturer
        FOREIGN KEY (manufacturer_id)
        REFERENCES manufacturers(manufacturer_id)
);

CREATE TABLE technicians (
    technician_id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(150) UNIQUE,
    specialisation VARCHAR(100)
);

CREATE TABLE failure_reports (
    failure_id INT PRIMARY KEY AUTO_INCREMENT,
    device_id INT NOT NULL,
    failure_event_count INT DEFAULT 0,
    downtime_hours DECIMAL(10,2),
    severity ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Low',
    report_status ENUM('Open', 'In Progress', 'Resolved') DEFAULT 'Open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_failure_device
        FOREIGN KEY (device_id)
        REFERENCES devices(device_id)
);

CREATE TABLE maintenance_records (
    maintenance_id INT PRIMARY KEY AUTO_INCREMENT,
    device_id INT NOT NULL,
    technician_id INT,
    maintenance_frequency INT,
    maintenance_class INT,
    maintenance_priority ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
    maintenance_cost DECIMAL(10,2),
    repair_status ENUM('Pending', 'In Progress', 'Completed') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_maintenance_device
        FOREIGN KEY (device_id)
        REFERENCES devices(device_id),

    CONSTRAINT fk_maintenance_technician
        FOREIGN KEY (technician_id)
        REFERENCES technicians(technician_id)
);

CREATE TABLE parts (
    part_id INT PRIMARY KEY AUTO_INCREMENT,
    part_name VARCHAR(120) NOT NULL,
    unit_cost DECIMAL(10,2),
    stock_quantity INT DEFAULT 0
);

CREATE TABLE maintenance_parts (
    maintenance_id INT NOT NULL,
    part_id INT NOT NULL,
    quantity_used INT NOT NULL DEFAULT 1,

    PRIMARY KEY (maintenance_id, part_id),

    CONSTRAINT fk_maintenance_parts_record
        FOREIGN KEY (maintenance_id)
        REFERENCES maintenance_records(maintenance_id),

    CONSTRAINT fk_maintenance_parts_part
        FOREIGN KEY (part_id)
        REFERENCES parts(part_id)
);
