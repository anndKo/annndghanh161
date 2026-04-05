DELETE FROM login_attempts WHERE fingerprint_hash LIKE 'test_%';
DELETE FROM device_blocks WHERE fingerprint_hash LIKE 'test_%';
DELETE FROM security_audit_log WHERE fingerprint_hash LIKE 'test_%';