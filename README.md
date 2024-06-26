# BPFlow Node Library

- [Node-Red](http://nodered.org)
- [Creating Nodes](https://nodered.org/docs/creating-nodes/)

## Quick Start

### Install

1. Clone repo:
   
        git clone git@github.com:bThink-BGU/FlowBP-NodeRed.git
   
2. Install dependencies:
   
       cd FlowBP-NodeRed
       npm install
3. Fix permissions:
   ```bash
   chmod +x ./engine/bpjs.sh
   ```

## Running

1. Run

        npm start

2. Automatically restarting
   If you are editing the source code you must restart Node-RED to load the changes. A special grunt task is provided to do this automatically.
   
   Run:

   ```bash
   grunt dev
   ``` 
   This command will generate the nodes automatically and run BPFlow and then watch the filesystem for any changes to the source code. If it detects changes made to the editor code, it will rebuild the editor component and you can reload the editor to see the changes. If it detects changes made to the runtime or nodes it will restart BPFlow to load those changes.

## Example flows
The ```example_flows``` directory contains json files of examples to load to your editor, like the hot-cold example. 
