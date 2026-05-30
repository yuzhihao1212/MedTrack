USE medtrack;

DROP TRIGGER IF EXISTS trg_update_device_risk_after_failure_insert;

DELIMITER //

CREATE TRIGGER trg_update_device_risk_after_failure_insert
AFTER INSERT ON failure_reports
FOR EACH ROW
BEGIN
    IF NEW.severity = 'Critical' OR NEW.failure_event_count >= 5 THEN
        UPDATE devices
        SET risk_status = 'Critical'
        WHERE device_id = NEW.device_id;
    ELSEIF NEW.severity = 'High' OR NEW.failure_event_count >= 3 THEN
        UPDATE devices
        SET risk_status = 'High'
        WHERE device_id = NEW.device_id;
    ELSEIF NEW.severity = 'Medium' OR NEW.failure_event_count >= 2 THEN
        UPDATE devices
        SET risk_status = 'Medium'
        WHERE device_id = NEW.device_id;
    ELSE
        UPDATE devices
        SET risk_status = 'Low'
        WHERE device_id = NEW.device_id;
    END IF;
END//

DELIMITER ;