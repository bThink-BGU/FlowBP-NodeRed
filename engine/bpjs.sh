#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
UBERJAR=$SCRIPT_DIR/BPFlow-0.6-DEV.uber.jar
if [ ! -f $UBERJAR ]; then
    echo Missing jar file $UBERJAR in the target directory
    exit -2
fi

java -jar $UBERJAR $*

