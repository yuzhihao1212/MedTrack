USE medtrack;

DROP PROCEDURE IF EXISTS add_medtrack_index;

DELIMITER //

CREATE PROCEDURE add_medtrack_index(
    IN p_table_name VARCHAR(64),
    IN p_index_name VARCHAR(64),
    IN p_create_statement TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = p_table_name
          AND index_name = p_index_name
    ) THEN
        SET @index_sql = p_create_statement;
        PREPARE index_stmt FROM @index_sql;
        EXECUTE index_stmt;
        DEALLOCATE PREPARE index_stmt;
    END IF;
END //

DELIMITER ;

CALL add_medtrack_index(
    'devices',
    'idx_devices_risk_status',
    'CREATE INDEX idx_devices_risk_status ON devices(risk_status)'
);

CALL add_medtrack_index(
    'devices',
    'idx_devices_risk_status_age',
    'CREATE INDEX idx_devices_risk_status_age ON devices(risk_status, age_years)'
);

CALL add_medtrack_index(
    'devices',
    'idx_devices_type_manufacturer',
    'CREATE INDEX idx_devices_type_manufacturer ON devices(device_type_id, manufacturer_id)'
);

CALL add_medtrack_index(
    'devices',
    'idx_devices_created_at',
    'CREATE INDEX idx_devices_created_at ON devices(created_at)'
);

CALL add_medtrack_index(
    'failure_reports',
    'idx_failure_reports_device_id',
    'CREATE INDEX idx_failure_reports_device_id ON failure_reports(device_id)'
);

CALL add_medtrack_index(
    'failure_reports',
    'idx_failure_reports_severity',
    'CREATE INDEX idx_failure_reports_severity ON failure_reports(severity)'
);

CALL add_medtrack_index(
    'failure_reports',
    'idx_failure_reports_status_severity',
    'CREATE INDEX idx_failure_reports_status_severity ON failure_reports(report_status, severity)'
);

CALL add_medtrack_index(
    'failure_reports',
    'idx_failure_reports_event_downtime',
    'CREATE INDEX idx_failure_reports_event_downtime ON failure_reports(failure_event_count, downtime_hours)'
);

CALL add_medtrack_index(
    'maintenance_records',
    'idx_maintenance_records_device_id',
    'CREATE INDEX idx_maintenance_records_device_id ON maintenance_records(device_id)'
);

CALL add_medtrack_index(
    'maintenance_records',
    'idx_maintenance_records_repair_status',
    'CREATE INDEX idx_maintenance_records_repair_status ON maintenance_records(repair_status)'
);

CALL add_medtrack_index(
    'maintenance_records',
    'idx_maintenance_records_priority',
    'CREATE INDEX idx_maintenance_records_priority ON maintenance_records(maintenance_priority)'
);

CALL add_medtrack_index(
    'maintenance_records',
    'idx_maintenance_records_status_priority_cost',
    'CREATE INDEX idx_maintenance_records_status_priority_cost ON maintenance_records(repair_status, maintenance_priority, maintenance_cost)'
);

CALL add_medtrack_index(
    'maintenance_records',
    'idx_maintenance_records_technician_status',
    'CREATE INDEX idx_maintenance_records_technician_status ON maintenance_records(technician_id, repair_status)'
);

CALL add_medtrack_index(
    'maintenance_parts',
    'idx_maintenance_parts_part_id',
    'CREATE INDEX idx_maintenance_parts_part_id ON maintenance_parts(part_id)'
);

DROP PROCEDURE IF EXISTS add_medtrack_index;
