@echo off
mvn -f engine\build-bpjs exec:java -Dexec.mainClass="il.ac.bgu.cs.bp.bpflow.ConnectionServer" 
