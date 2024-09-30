@REM SET jar=%~dp0%BPFlow-0.6-DEV.uber.jar
@REM java -jar %jar% %*
mvn -f engine\build-bpjs exec:java -Dexec.mainClass="il.ac.bgu.cs.bp.bpflow.CliRunner" -Dexec.args="%* -use_sync_priority_ess"
