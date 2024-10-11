-- To get list of all available tables:
-- SELECT Concat('TRUNCATE TABLE ', TABLE_NAME)
-- FROM INFORMATION_SCHEMA.TABLES
-- WHERE table_schema = 'vidjil';

-- Truncate all tables
TRUNCATE TABLE analysis_file;
TRUNCATE TABLE auth_cas;
TRUNCATE TABLE auth_event;
TRUNCATE TABLE auth_group;
TRUNCATE TABLE auth_membership;
TRUNCATE TABLE auth_permission;
TRUNCATE TABLE auth_user;
TRUNCATE TABLE auth_user_tag_groups;
TRUNCATE TABLE classification;
TRUNCATE TABLE config;
TRUNCATE TABLE fused_file;
TRUNCATE TABLE generic;
TRUNCATE TABLE group_assoc;
TRUNCATE TABLE group_tag;
TRUNCATE TABLE notification;
TRUNCATE TABLE patient;
TRUNCATE TABLE pre_process;
TRUNCATE TABLE results_file;
TRUNCATE TABLE run;
TRUNCATE TABLE sample_set;
TRUNCATE TABLE sample_set_membership;
TRUNCATE TABLE scheduler_run;
TRUNCATE TABLE scheduler_task;
TRUNCATE TABLE scheduler_task_deps;
TRUNCATE TABLE scheduler_worker;
TRUNCATE TABLE sequence_file;
TRUNCATE TABLE tag;
TRUNCATE TABLE tag_ref;
TRUNCATE TABLE user_log;
TRUNCATE TABLE user_preference;

