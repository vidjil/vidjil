-- MySQL dump 10.13  Distrib 5.7.29, for Linux (x86_64)
--
-- Host: localhost    Database: vidjil
-- ------------------------------------------------------
-- Server version	5.7.29

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Dumping data for table `analysis_file`
--

LOCK TABLES `analysis_file` WRITE;
/*!40000 ALTER TABLE `analysis_file` DISABLE KEYS */;
/*!40000 ALTER TABLE `analysis_file` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `auth_cas`
--

LOCK TABLES `auth_cas` WRITE;
/*!40000 ALTER TABLE `auth_cas` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_cas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `auth_event`
--

LOCK TABLES `auth_event` WRITE;
/*!40000 ALTER TABLE `auth_event` DISABLE KEYS */;
INSERT INTO `auth_event` (`id`, `time_stamp`, `client_ip`, `user_id`, `origin`, `description`) VALUES (1,'2020-03-31 13:37:45','10.134.4.94',1,'auth','User 1 Logged-in'),(2,'2020-04-02 11:28:15','109.190.80.52',1,'auth','User 1 Logged-in');
/*!40000 ALTER TABLE `auth_event` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `auth_group`
--

LOCK TABLES `auth_group` WRITE;
/*!40000 ALTER TABLE `auth_group` DISABLE KEYS */;
INSERT INTO `auth_group` (`id`, `role`, `description`) VALUES (1,'admin',NULL),(2,'user_1',NULL),(3,'public',NULL);
/*!40000 ALTER TABLE `auth_group` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `auth_membership`
--

LOCK TABLES `auth_membership` WRITE;
/*!40000 ALTER TABLE `auth_membership` DISABLE KEYS */;
INSERT INTO `auth_membership` (`id`, `user_id`, `group_id`) VALUES (1,1,1),(2,1,2),(3,1,3);
/*!40000 ALTER TABLE `auth_membership` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `auth_permission`
--

LOCK TABLES `auth_permission` WRITE;
/*!40000 ALTER TABLE `auth_permission` DISABLE KEYS */;
INSERT INTO `auth_permission` (`id`, `group_id`, `name`, `table_name`, `record_id`) VALUES (1,1,'access','sample_set',0),(2,1,'access','patient',0),(3,1,'access','run',0),(4,1,'access','generic',0),(5,1,'access','config',0),(6,1,'access','pre_process',0),(7,1,'access','auth_group',0),(8,1,'admin','sample_set',0),(9,1,'admin','patient',0),(10,1,'admin','generic',0),(11,1,'admin','run',0),(12,1,'admin','auth_group',0),(13,1,'admin','config',0),(14,1,'admin','pre_process',0),(15,1,'read','sample_set',0),(16,1,'read','patient',0),(17,1,'read','run',0),(18,1,'read','generic',0),(19,1,'read','auth_group',0),(20,1,'read','config',0),(21,1,'read','pre_process',0),(22,1,'create','sample_set',0),(23,1,'create','auth_group',0),(24,1,'create_config','config',0),(25,1,'create','pre_process',0),(26,1,'impersonate','auth_user',0),(27,3,'read','config',0),(28,3,'access','config',1),(29,3,'access','config',2),(30,3,'access','config',3),(31,3,'access','config',4),(32,3,'access','config',5),(33,3,'access','config',6),(34,3,'read','pre_process',0),(35,3,'access','sample_set',1),(36,3,'access','sample_set',2),(37,3,'access','sample_set',3),(38,3,'access','sample_set',4),(39,3,'access','sample_set',5),(40,3,'access','sample_set',6),(41,3,'access','sample_set',7),(42,3,'access','sample_set',8),(43,3,'access','sample_set',9),(44,3,'access','sample_set',10),(45,3,'access','sample_set',11),(46,3,'access','sample_set',12),(47,3,'access','sample_set',13),(48,3,'access','sample_set',14),(49,3,'access','sample_set',15),(50,3,'access','sample_set',16),(51,3,'access','sample_set',17),(52,3,'access','sample_set',18),(53,3,'access','sample_set',19);
/*!40000 ALTER TABLE `auth_permission` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `auth_user`
--

LOCK TABLES `auth_user` WRITE;
/*!40000 ALTER TABLE `auth_user` DISABLE KEYS */;
INSERT INTO `auth_user` (`id`, `first_name`, `last_name`, `email`, `password`, `registration_key`, `reset_password_key`, `registration_id`) VALUES (1,'System','Administrator','test@vidjil.org','pbkdf2(1000,20,sha512)$b2ac6c047bcce393$f11d60dace1907d294d21036cc394fdec43ff4ba','','','');
/*!40000 ALTER TABLE `auth_user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `config`
--

LOCK TABLES `config` WRITE;
/*!40000 ALTER TABLE `config` DISABLE KEYS */;
INSERT INTO `config` (`id`, `name`, `program`, `command`, `fuse_command`, `info`) VALUES (1,'default + extract reads','vidjil','-c clones -3 -z 100 -r 1 -g germline/homo-sapiens.g -e 1 -2 -d -w 50 -U ','-t 100','Same as the default \"multi+inc+xxx\" (multi-locus, with some incomplete/unusual/unexpected recombinations), and extract analyzed reads in the \"out\" temporary directory.'),(2,'multi+inc+xxx','vidjil','-c clones -3 -z 100 -r 1 -g germline/homo-sapiens.g -e 1 -2 -d -w 50 ','-t 100','multi-locus, with some incomplete/unusual/unexpected recombinations'),(3,'multi+inc','vidjil','-c clones -3 -z 100 -r 1 -g germline/homo-sapiens.g -e 1 -w 50 ','-t 100','multi-locus, with some incomplete/unusual recombinations'),(4,'multi','vidjil','-c clones -3 -z 100 -r 1 -g germline/homo-sapiens.g:IGH,IGK,IGL,TRA,TRB,TRG,TRD -e 1 -d -w 50 ','-t 100','multi-locus, only complete recombinations'),(5,'TRG','vidjil','-c clones -3 -z 100 -r 1 -g germline/homo-sapiens.g:TRG ','-t 100','TRG, VgJg'),(6,'IGH','vidjil','-c clones -w 60 -d -3 -z 100 -r 1 -g germline/homo-sapiens.g:IGH ','-t 100','IGH, Vh(Dh)Jh');
/*!40000 ALTER TABLE `config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `fused_file`
--

LOCK TABLES `fused_file` WRITE;
/*!40000 ALTER TABLE `fused_file` DISABLE KEYS */;
INSERT INTO `fused_file` (`id`, `patient_id`, `config_id`, `sample_set_id`, `fuse_date`, `status`, `sequence_file_list`, `fused_file`) VALUES (1,NULL,2,19,'2020-04-02 18:01:23',NULL,'2_','fused_file.fused_file.9847c4057e54221d.3030303030312d31392e6675736564.fused'),(2,NULL,2,18,'2020-04-02 18:01:24',NULL,'2_','fused_file.fused_file.84ac5fad20e80a84.3030303030312d31382e6675736564.fused');
/*!40000 ALTER TABLE `fused_file` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `generic`
--

LOCK TABLES `generic` WRITE;
/*!40000 ALTER TABLE `generic` DISABLE KEYS */;
/*!40000 ALTER TABLE `generic` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `group_assoc`
--

LOCK TABLES `group_assoc` WRITE;
/*!40000 ALTER TABLE `group_assoc` DISABLE KEYS */;
/*!40000 ALTER TABLE `group_assoc` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `group_tag`
--

LOCK TABLES `group_tag` WRITE;
/*!40000 ALTER TABLE `group_tag` DISABLE KEYS */;
INSERT INTO `group_tag` (`id`, `group_id`, `tag_id`) VALUES (1,3,1),(2,3,2),(3,3,3),(4,3,4),(5,3,5),(6,3,6),(7,3,7),(8,3,8),(9,3,9),(10,3,10),(11,3,11),(12,3,12),(13,3,13),(14,3,14),(15,3,15),(16,3,16),(17,3,17),(18,3,18),(19,3,19),(20,3,20),(21,3,21),(22,3,22),(23,3,23),(24,3,24),(25,3,25),(26,3,26),(27,3,27),(28,3,28),(29,3,29),(30,3,30),(31,3,31),(32,3,32),(33,3,33),(34,3,34),(35,3,35),(36,3,36),(37,3,37),(38,3,38),(39,3,39),(40,3,40),(41,3,41),(42,3,42),(43,3,43),(44,3,44),(45,3,45),(46,3,46),(47,3,47),(48,3,48),(49,3,49),(50,3,50),(51,3,51),(52,3,52),(53,3,53),(54,3,54),(55,3,55),(56,3,56),(57,3,57);
/*!40000 ALTER TABLE `group_tag` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `notification`
--

LOCK TABLES `notification` WRITE;
/*!40000 ALTER TABLE `notification` DISABLE KEYS */;
/*!40000 ALTER TABLE `notification` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `patient`
--

LOCK TABLES `patient` WRITE;
/*!40000 ALTER TABLE `patient` DISABLE KEYS */;
INSERT INTO `patient` (`id`, `first_name`, `last_name`, `birth`, `info`, `id_label`, `creator`, `sample_set_id`) VALUES (1,'Florbela','Espanca','1894-12-08','#T-ALL 70% blasts','',1,1),(2,'Paulina','Wilkońska','1815-01-01','#CLL ','',1,2),(3,'Camilla','Collett','1813-01-23','','',1,3),(4,'Διονύσιος','Σολωμός','1798-04-08','#T-ALL #diagnosis #pre-SCT ','',1,4),(5,'Vasile','Alecsandri','1801-07-21','#B-ALL #IKAROS ','',1,5),(6,'Sophia Elisabet','Brenner','1659-04-29','#diagnosis #B-ALL #BCR-ABL ','',1,6),(7,'Marin','Držić','1508-01-01','#CLL 98.4%','',1,7),(8,' ','老子',NULL,'','',1,8),(9,'Emil','Aarestrup','1800-12-04','','',1,9),(10,'Božena','Němcová','1820-02-04','#T-ALL ','',1,10),(11,'ابن','خلدون','1332-05-27','#T-ALL #diagnosis 60% blasts','',1,11),(12,'Willem','Bilderdijk','1756-09-07','','',1,12),(13,'Johann Wolfgang','Goethe','1749-08-28','#T-ALL ','',1,13),(14,'George','Sand','1804-02-01','#WM ','',1,14),(15,'Dante','Alighieri','1265-01-01','#B-ALL #diagnosis #relapse #KDE ','',1,15),(16,'Friedrich','von Schiller','1759-01-01','#B-ALL #FR1 blood sample, 10µM primer','',1,16),(17,'Miguel','de Cervantes','1547-09-29','#relapse #pre-SCT #post-SCT ','',1,17),(18,'Jane','Austeen','1775-12-16','#T-ALL #diagnosis #CR Winchester hospital','',1,18);
/*!40000 ALTER TABLE `patient` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `pre_process`
--

LOCK TABLES `pre_process` WRITE;
/*!40000 ALTER TABLE `pre_process` DISABLE KEYS */;
/*!40000 ALTER TABLE `pre_process` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `results_file`
--

LOCK TABLES `results_file` WRITE;
/*!40000 ALTER TABLE `results_file` DISABLE KEYS */;
INSERT INTO `results_file` (`id`, `sequence_file_id`, `config_id`, `run_date`, `scheduler_task_id`, `hidden`, `data_file`) VALUES (1,2,2,'2020-04-02 18:01:21',1,'F','results_file.data_file.ba2b37c7245410bc.3030303030312e7669646a696c.txt');
/*!40000 ALTER TABLE `results_file` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `run`
--

LOCK TABLES `run` WRITE;
/*!40000 ALTER TABLE `run` DISABLE KEYS */;
INSERT INTO `run` (`id`, `name`, `run_date`, `info`, `id_label`, `creator`, `sequencer`, `pcr`, `sample_set_id`) VALUES (1,'run',NULL,'#diagnosis ','',1,'','',19);
/*!40000 ALTER TABLE `run` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `sample_set`
--

LOCK TABLES `sample_set` WRITE;
/*!40000 ALTER TABLE `sample_set` DISABLE KEYS */;
INSERT INTO `sample_set` (`id`, `creator`, `sample_type`) VALUES (1,NULL,'patient'),(2,NULL,'patient'),(3,NULL,'patient'),(4,NULL,'patient'),(5,NULL,'patient'),(6,NULL,'patient'),(7,NULL,'patient'),(8,NULL,'patient'),(9,NULL,'patient'),(10,NULL,'patient'),(11,NULL,'patient'),(12,NULL,'patient'),(13,NULL,'patient'),(14,NULL,'patient'),(15,NULL,'patient'),(16,NULL,'patient'),(17,NULL,'patient'),(18,NULL,'patient'),(19,NULL,'run');
/*!40000 ALTER TABLE `sample_set` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `sample_set_membership`
--

LOCK TABLES `sample_set_membership` WRITE;
/*!40000 ALTER TABLE `sample_set_membership` DISABLE KEYS */;
INSERT INTO `sample_set_membership` (`id`, `sample_set_id`, `sequence_file_id`) VALUES (1,19,2),(2,18,2);
/*!40000 ALTER TABLE `sample_set_membership` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `scheduler_run`
--

LOCK TABLES `scheduler_run` WRITE;
/*!40000 ALTER TABLE `scheduler_run` DISABLE KEYS */;
INSERT INTO `scheduler_run` (`id`, `task_id`, `status`, `start_time`, `stop_time`, `run_output`, `run_result`, `traceback`, `worker_name`) VALUES (1,1,'COMPLETED','2020-04-02 18:01:15','2020-04-02 18:01:24','=== Launching Vidjil ===\n/usr/share/vidjil//vidjil-algo  -o  /mnt/result/tmp/out-000001/ -b 000001 -c clones -3 -z 100 -r 1 -g/usr/share/vidjil/germline/homo-sapiens.g -e 1 -2 -d -w 50  /mnt/upload/uploads/sequence_file.data_file.9b47359b198fca49.44656d6f2d5835.fa\n========================\nOutput log in /mnt/result/tmp/out-000001//000001.vidjil.log\n===> /mnt/result/tmp/out-000001//000001.vidjil\n19\n=== fuse.py ===\npython ../../tools/fuse.py -o /mnt/result/tmp/out-000001//000001-19.fused -t 100 /mnt/result/results/results_file.data_file.ba2b37c7245410bc.3030303030312e7669646a696c.txt \n===============\nOutput log in /mnt/result/tmp/out-000001//000001-19.fuse.log\n18\n=== fuse.py ===\npython ../../tools/fuse.py -o /mnt/result/tmp/out-000001//000001-18.fused -t 100 /mnt/result/results/results_file.data_file.ba2b37c7245410bc.3030303030312e7669646a696c.txt \n===============\nOutput log in /mnt/result/tmp/out-000001//000001-18.fuse.log\n','\"SUCCESS\"',NULL,'c0bff30a9612#14');
/*!40000 ALTER TABLE `scheduler_run` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `scheduler_task`
--

LOCK TABLES `scheduler_task` WRITE;
/*!40000 ALTER TABLE `scheduler_task` DISABLE KEYS */;
INSERT INTO `scheduler_task` (`id`, `application_name`, `task_name`, `group_name`, `status`, `broadcast`, `function_name`, `uuid`, `args`, `vars`, `enabled`, `start_time`, `next_run_time`, `stop_time`, `repeats`, `retry_failed`, `period`, `prevent_drift`, `cronline`, `timeout`, `sync_output`, `times_run`, `times_failed`, `last_run_time`, `assigned_worker_name`) VALUES (1,'vidjil/default','vidjil','main','COMPLETED','F','vidjil','6d2a4664-3f82-4d51-8cca-df0279785459','[\"2\", \"2\", 1, null]','{}','T','2020-04-02 18:00:07','2020-04-02 18:02:15',NULL,1,0,60,'F',NULL,7200,0,1,0,'2020-04-02 18:01:15','c0bff30a9612#14');
/*!40000 ALTER TABLE `scheduler_task` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `scheduler_task_deps`
--

LOCK TABLES `scheduler_task_deps` WRITE;
/*!40000 ALTER TABLE `scheduler_task_deps` DISABLE KEYS */;
/*!40000 ALTER TABLE `scheduler_task_deps` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `scheduler_worker`
--

LOCK TABLES `scheduler_worker` WRITE;
/*!40000 ALTER TABLE `scheduler_worker` DISABLE KEYS */;
INSERT INTO `scheduler_worker` (`id`, `worker_name`, `first_heartbeat`, `last_heartbeat`, `status`, `is_ticker`, `group_names`, `worker_stats`) VALUES (4,'c0bff30a9612#14','2020-04-02 18:00:40','2020-04-02 18:06:38','ACTIVE','T','|main|','{\"status\": \"ACTIVE\", \"errors\": 0, \"workers\": 3, \"queue\": 0, \"empty_runs\": 63, \"sleep\": 5, \"distribution\": {\"main\": {\"workers\": [{\"c\": 0, \"name\": \"c0bff30a9612#14\"}, {\"c\": 0, \"name\": \"c0bff30a9612#16\"}, {\"c\": 0, \"name\": \"c0bff30a9612#18\"}]}}, \"total\": 1}'),(5,'c0bff30a9612#16','2020-04-02 18:00:40','2020-04-02 18:06:38','ACTIVE','F','|main|','{\"status\": \"ACTIVE\", \"errors\": 0, \"workers\": 0, \"queue\": 0, \"empty_runs\": 72, \"sleep\": 5, \"distribution\": null, \"total\": 0}'),(6,'c0bff30a9612#18','2020-04-02 18:00:41','2020-04-02 18:06:34','ACTIVE','F','|main|','{\"status\": \"ACTIVE\", \"errors\": 0, \"workers\": 0, \"queue\": 0, \"empty_runs\": 71, \"sleep\": 5, \"distribution\": null, \"total\": 0}');
/*!40000 ALTER TABLE `scheduler_worker` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `sequence_file`
--

LOCK TABLES `sequence_file` WRITE;
/*!40000 ALTER TABLE `sequence_file` DISABLE KEYS */;
INSERT INTO `sequence_file` (`id`, `patient_id`, `sampling_date`, `info`, `filename`, `pcr`, `sequencer`, `producer`, `size_file`, `size_file2`, `network`, `provider`, `pre_process_id`, `pre_process_result`, `pre_process_flag`, `pre_process_scheduler_task_id`, `data_file`, `data_file2`) VALUES (2,NULL,NULL,'#relapse ','Demo-X5.fa',NULL,NULL,NULL,5006,0,'T',1,NULL,NULL,'COMPLETED',NULL,'sequence_file.data_file.9b47359b198fca49.44656d6f2d5835.fa',NULL);
/*!40000 ALTER TABLE `sequence_file` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `tag`
--

LOCK TABLES `tag` WRITE;
/*!40000 ALTER TABLE `tag` DISABLE KEYS */;
INSERT INTO `tag` (`id`, `name`) VALUES (1,'ALL'),(3,'B-ALL'),(56,'BCL2'),(53,'BCR-ABL'),(36,'blood'),(39,'CAR-T'),(11,'CLL'),(7,'CML'),(25,'CR'),(26,'deceased'),(22,'diagnosis'),(31,'dilution'),(18,'DLBCL'),(55,'E2A-PBX'),(34,'EuroMRD'),(17,'FL'),(41,'FR1'),(42,'FR2'),(43,'FR3'),(8,'HCL'),(16,'HL'),(48,'IGH'),(49,'IGK'),(51,'IGL'),(52,'IKAROS'),(50,'KDE'),(12,'LGL'),(13,'lymphoma'),(20,'MAG'),(35,'marrow'),(6,'mature-B-ALL'),(14,'MCL'),(21,'MM'),(23,'MRD'),(9,'MZL'),(15,'NHL'),(57,'PAX5'),(28,'post-BMT'),(30,'post-SCT'),(4,'pre-B-ALL'),(27,'pre-BMT'),(29,'pre-SCT'),(5,'pro-B-ALL'),(33,'QC'),(24,'relapse'),(37,'repertoire'),(40,'scFv'),(32,'standard'),(2,'T-ALL'),(10,'T-PLL'),(54,'TEL-AML1'),(38,'TIL'),(44,'TRA'),(45,'TRB'),(47,'TRD'),(46,'TRG'),(19,'WM');
/*!40000 ALTER TABLE `tag` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `tag_ref`
--

LOCK TABLES `tag_ref` WRITE;
/*!40000 ALTER TABLE `tag_ref` DISABLE KEYS */;
INSERT INTO `tag_ref` (`id`, `tag_id`, `table_name`, `record_id`) VALUES (1,2,'patient',1),(2,11,'patient',2),(3,29,'patient',4),(4,22,'patient',4),(5,2,'patient',4),(6,52,'patient',5),(7,3,'patient',5),(8,53,'patient',6),(9,3,'patient',6),(10,22,'patient',6),(11,11,'patient',7),(12,2,'patient',10),(13,22,'patient',11),(14,2,'patient',11),(15,2,'patient',13),(16,19,'patient',14),(17,50,'patient',15),(18,3,'patient',15),(19,22,'patient',15),(20,24,'patient',15),(21,41,'patient',16),(22,3,'patient',16),(23,29,'patient',17),(24,24,'patient',17),(25,30,'patient',17),(26,25,'patient',18),(27,22,'patient',18),(28,2,'patient',18),(29,22,'run',1),(31,24,'sequence_file',2);
/*!40000 ALTER TABLE `tag_ref` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `user_log`
--

LOCK TABLES `user_log` WRITE;
/*!40000 ALTER TABLE `user_log` DISABLE KEYS */;
INSERT INTO `user_log` (`id`, `user_id`, `created`, `msg`, `table_name`, `record_id`) VALUES (1,1,'2020-03-31 13:37:45','                   10.134.4.94 <System_Administrator> patient list ','sample_set',NULL),(2,1,'2020-03-31 13:37:49','                   10.134.4.94 <System_Administrator> patient list ','sample_set',NULL),(3,1,'2020-04-01 15:43:39','                   10.134.4.88 <System_Administrator> patient list ','sample_set',NULL),(4,1,'2020-04-01 15:43:42','                   10.134.4.88 <System_Administrator> load form add patient','sample_set',NULL),(5,1,'2020-04-01 15:58:05','                   10.134.4.88 <System_Administrator> patient (1) Esp added','sample_set',1),(6,1,'2020-04-01 15:58:05','                   10.134.4.88 <System_Administrator> patient (2) Wil added','sample_set',2),(7,1,'2020-04-01 15:58:05','                   10.134.4.88 <System_Administrator> patient (3) Col added','sample_set',3),(8,1,'2020-04-01 15:58:05','                   10.134.4.88 <System_Administrator> patient (4) Σολ added','sample_set',4),(9,1,'2020-04-01 15:58:05','                   10.134.4.88 <System_Administrator> patient (5) Ale added','sample_set',5),(10,1,'2020-04-01 15:58:06','                   10.134.4.88 <System_Administrator> patient (6) Bre added','sample_set',6),(11,1,'2020-04-01 15:58:06','                   10.134.4.88 <System_Administrator> patient (7) Drž added','sample_set',7),(12,1,'2020-04-01 15:58:06','                   10.134.4.88 <System_Administrator> patient (8) 老子 added','sample_set',8),(13,1,'2020-04-01 15:58:06','                   10.134.4.88 <System_Administrator> patient (9) Aar added','sample_set',9),(14,1,'2020-04-01 15:58:06','                   10.134.4.88 <System_Administrator> patient (10) Něm added','sample_set',10),(15,1,'2020-04-01 15:58:06','                   10.134.4.88 <System_Administrator> patient (11) خلد added','sample_set',11),(16,1,'2020-04-01 15:58:06','                   10.134.4.88 <System_Administrator> patient (12) Bil added','sample_set',12),(17,1,'2020-04-01 15:58:06','                   10.134.4.88 <System_Administrator> patient (13) Goe added','sample_set',13),(18,1,'2020-04-01 15:58:06','                   10.134.4.88 <System_Administrator> patient (14) San added','sample_set',14),(19,1,'2020-04-01 15:58:06','                   10.134.4.88 <System_Administrator> patient (15) Ali added','sample_set',15),(20,1,'2020-04-01 15:58:06','                   10.134.4.88 <System_Administrator> patient (16) von added','sample_set',16),(21,1,'2020-04-01 15:58:06','                   10.134.4.88 <System_Administrator> patient (17) de  added','sample_set',17),(22,1,'2020-04-01 15:58:06','                   10.134.4.88 <System_Administrator> patient (18) Aus added','sample_set',18),(23,1,'2020-04-01 15:58:07','                   10.134.4.88 <System_Administrator> patient list ','sample_set',NULL),(24,1,'2020-04-01 16:22:46','                   10.134.4.88 <System_Administrator> sample_set (18)','sample_set',18),(25,1,'2020-04-01 16:22:48','                   10.134.4.88 <System_Administrator> patient list ','sample_set',NULL),(26,1,'2020-04-01 16:25:29','                   10.134.4.88 <System_Administrator> sample_set (18)','sample_set',18),(27,1,'2020-04-02 11:28:15','                 109.190.80.52 <System_Administrator> patient list ','sample_set',NULL),(28,1,'2020-04-02 11:28:16','                 109.190.80.52 <System_Administrator> patient list ','sample_set',NULL),(29,1,'2020-04-02 11:29:31','                 109.190.80.52 <System_Administrator> run list ','sample_set',NULL),(30,1,'2020-04-02 11:29:34','                 109.190.80.52 <System_Administrator> patient list ','sample_set',NULL),(31,1,'2020-04-02 11:29:35','                 109.190.80.52 <System_Administrator> run list ','sample_set',NULL),(32,1,'2020-04-02 17:55:28','                   10.134.4.16 <System_Administrator> load form add run','sample_set',NULL),(33,1,'2020-04-02 17:55:35','                   10.134.4.16 <System_Administrator> run (19) run added','sample_set',19),(34,1,'2020-04-02 17:55:35','                   10.134.4.16 <System_Administrator> sample_set (19)','sample_set',19),(35,1,'2020-04-02 17:55:40','                   10.134.4.16 <System_Administrator> patient list ','sample_set',NULL),(36,1,'2020-04-02 17:55:42','                   10.134.4.16 <System_Administrator> sample_set (18)','sample_set',18),(37,1,'2020-04-02 17:55:44','                   10.134.4.16 <System_Administrator> load add form','sample_set',18),(38,1,'2020-04-02 17:56:03','                   10.134.4.16 <System_Administrator> file (2) //Demo-X5.fa added','sequence_file',2),(39,1,'2020-04-02 17:56:04','                   10.134.4.16 <System_Administrator> sample_set (18)','sample_set',18),(40,1,'2020-04-02 18:00:04','                   10.134.4.16 <System_Administrator> sample_set (18)','sample_set',18),(41,1,'2020-04-02 18:00:07','                   10.134.4.16 <System_Administrator> run requested with config multi+inc+xxx','sequence_file',2),(42,1,'2020-04-02 18:00:07','                   10.134.4.16 <System_Administrator> sample_set (18)','sample_set',18),(43,1,'2020-04-02 18:02:17','                   10.134.4.16 <System_Administrator> sample_set (18)','sample_set',18),(44,1,'2020-04-02 18:02:19','                   10.134.4.16 <System_Administrator> load sample','sample_set',18),(45,1,'2020-04-02 18:02:20','                   10.134.4.16 <System_Administrator> load analysis','sample_set',18);
/*!40000 ALTER TABLE `user_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `user_preference`
--

LOCK TABLES `user_preference` WRITE;
/*!40000 ALTER TABLE `user_preference` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_preference` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2020-04-02 18:06:39
