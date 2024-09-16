#!/bin/bash
docker exec some-mysql sh -c "mysql --defaults-extra-file=/sql-config.cnf < /init.sql"