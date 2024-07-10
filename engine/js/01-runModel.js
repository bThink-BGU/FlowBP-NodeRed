/* global bp */

const RED = {};

function cloneToken(token) {
  // return JSON.parse(JSON.stringify(token))
  return token
}

var nodes = new Map();
var starts = [];
var disabledTabs = [];
var groups = new Map();

// init tabs
for (let n of model.config.flows) {
  if (n.type === 'tab' && n.disabled) {
    disabledTabs.push(n.id);
  }
}

// init nodes
for (let n of model.config.flows) {
  if (!disabledTabs.includes(n.z) && !n.d) {
    n.inNodes = new Set();
    nodes.set(n.id, n)
    if (n.type == "start") {
      let token = n.payload || "{}";
      n.token = token;
      starts.push(n);
    }
  }
}

// init nodes inNodes
for (let n of nodes.values()) {
  if (n.wires) {
    for (let port of n.wires) {
      for (let o of port) {
        nodes.get(o).inNodes.add(n.id);
      }
    }
  }
}

// init groups
for (let n of model.config.flows) {
  if (!disabledTabs.includes(n.z) && n.type === 'group') {
    groups.set(n.id, n);
  }
}

// init nodes inGroups
for (let g of groups.values()) {
  g.rwbi = { request: [], waitFor: [], block: [], interrupt: [] }
  for (let id of g.nodes) {
    let n = nodes.get(id);
    if (n.inNodes.size === 0) {
      if (n.type === 'bsync') {
        throw new Error("bsync is still not supported inside a group")
      } else if (n.eventType === 'request') {
        g.rwbi.request.push(n.id)
      } else if (n.eventType === 'waitFor') {
        g.rwbi.waitFor.push(n.id)
      } else if (n.eventType === 'block') {
        g.rwbi.block.push(n.id)
      } else if (n.eventType === 'interrupt') {
        g.rwbi.interrupt.push(n.id)
      } else {
        throw new Error(`node cannot be inside a group: ${n}`)
      }
    }
  }
}

//-------------------------------------------------------------------------------
// Initial spawn
//-------------------------------------------------------------------------------
bthread("initial", function () {
  for (let n of starts) {
    if (RED.nodeRedAdapter) {
      RED.nodeRedAdapter.updateToken(n, JSON.parse(n.token), true);
    }
    spawn_bthread(n, JSON.parse(n.token));
  }
})

//-------------------------------------------------------------------------------
// Each b-thread follows a path and spawns new b-threads when the path splits.
//-------------------------------------------------------------------------------
function spawn_bthread(node, token) {
  bthread("flow", function () {
    do {
      let tokens = execute(node, token) //[{sdfsdf},undefined]  [undefined,{sdfsdf}]
      if (RED.nodeRedAdapter) {
        RED.nodeRedAdapter.updateToken(node, token, false);
      }
      token = undefined

      for (let i in node.wires) {
        if (node.wires[i]) {
          if (tokens[i]) {
            for (let follower of node.wires[i]) {
              let followerNode = nodes.get(follower)
              let followerToken = JSON.parse(JSON.stringify(tokens[i]))
              if (RED.nodeRedAdapter) {
                RED.nodeRedAdapter.updateToken(followerNode, followerToken, true);
              }
              if (!token) {
                // The first token will be executed in this b-thread
                node = followerNode
                token = followerToken
              } else {
                // The other tokens will be executed in new b-threads
                spawn_bthread(followerNode, followerToken)
              }
            }
          }
        }
      }
    } while (token)
  })
}


//-------------------------------------------------------------------------------
// Here we define the semantics of the nodes.

//-------------------------------------------------------------------------------
function execute(node, token) {
  let cloneToken = JSON.parse(JSON.stringify(token))
  let event;
  let block = 0, waitFor = 0, request = 0, interrupt = 0;
  try {
    if (node.g) {
      let group = groups.get(node.g)

      group.rwbi.block.map(id => nodes.get(id)).forEach(n => {
        bp.thread.data.block.push(defaultEventDefinition(n, cloneToken))
        block++
      });
      group.rwbi.waitFor.map(id => nodes.get(id)).forEach(n => {
        bp.thread.data.waitFor.push(defaultEventDefinition(n, cloneToken))
        waitFor++
      });
      group.rwbi.request.map(id => nodes.get(id)).forEach(n => {
        bp.thread.data.request.push(defaultEventDefinition(n, cloneToken))
        request++
      });
      group.rwbi.interrupt.map(id => nodes.get(id)).forEach(n => {
        bp.thread.data.interrupt.push(defaultEventDefinition(n, cloneToken))
        interrupt++
      });
    }
    switch (node.type) {
      //-----------------------------------------------------------------------
      // Start
      //-----------------------------------------------------------------------
      case "start":
        return [cloneToken]

      case "switch":
        return switchNode(node, cloneToken)
      case "log":
        if (node.level === 'info')
          bp.log.info(cloneToken)
        else if (node.level === 'warn')
          bp.log.warn(cloneToken)
        if (node.level === 'fine')
          bp.log.fine(cloneToken)
        return []
      case "loop":
        if ("count" in cloneToken) {
          if (cloneToken.count + 1 < node.to) {
            cloneToken.count += parseInt(node.skip)
            return [cloneToken, undefined]
          } else {
            delete cloneToken.count
            return [undefined, cloneToken]
          }
        } else {
          cloneToken.count = parseInt(node.from)
          return [cloneToken, undefined]
        }

      case "if-then-else":
        if (node.condition) {
          let condition = node.condition.replace(/tkn\./g, 'cloneToken.')
          if (eval(condition)) {  // "3333+1" -> 3334
            return [cloneToken, undefined]
          } else {
            return [undefined, cloneToken]
          }
        }


      //-----------------------------------------------------------------------
      // bsync
      //-----------------------------------------------------------------------
      case "bsync":
        let stmt = {}
        if (cloneToken.request) {
          stmt.request = bp.Event(String(cloneToken.request))
          // delete cloneToken.request
        } else if (node.request != "") {
          stmt.request = bp.Event(String(node.request))
        }

        if (cloneToken.waitFor) {
          stmt.waitFor = bp.Event(String(cloneToken.waitFor))
          // delete cloneToken.waitFor
        } else if (node.waitFor != "") {
          stmt.waitFor = bp.Event(String(node.waitFor))
        }

        if (cloneToken.block) {
          stmt.block = bp.Event(String(cloneToken.block))
          // delete cloneToken.block
        } else if (node.block != "") {
          stmt.block = bp.Event(String(node.block))
        }

        event = sync(stmt)
        copyEventDataToToken(cloneToken, event)
        return [cloneToken]
      default:
        if (this[node.type]) {
          this[node.type](node, cloneToken)
        } else {
          if (node.eventType == 'request') {
            event = sync({ request: defaultEventDefinition(node, cloneToken) })
            copyEventDataToToken(cloneToken, event)
          } else if (node.eventType == 'waitFor') {
            event = sync({ waitFor: defaultEventSetDefinition(node, cloneToken)})
            copyEventDataToToken(cloneToken, event)
          }
        }
        return [cloneToken]
    }
  } finally {
    for (let i = 0; i < block; i++) {
      bp.thread.data.block.pop()
    }
    for (let i = 0; i < waitFor; i++) {
      bp.thread.data.waitFor.pop()
    }
    for (let i = 0; i < request; i++) {
      bp.thread.data.request.pop()
    }
    for (let i = 0; i < interrupt; i++) {
      bp.thread.data.interrupt.pop()
    }
  }
}

function defaultEventSetDefinition(node, msg) {
  function conditionForField(msg, node, field) {
    let target = '';
    // bp.log.info("res node={0};msg={1}; field={2}", node,msg, field);
    if (msg[node.type] && msg[node.type][field.name]) {
      target = msg[node.type][field.name];
    } else if (node[field.name]) {
      target = node[field.name];
    }

    if (target !== '') {
      if (!Array.isArray(target) && (field.type !== 'select' || field.defaultValue != target)) {
        target = ' && e.data.' + field.name + ' == "' + target + '"';
      } else {
        target = ''
      }
    }

    return target;
  }

  let condition = 'bp.EventSet("", function(e) { return e.name.equals("' + node.type + '")';
  if (node.internalFields) {
    let fields = JSON.parse(node.internalFields);
    for (let i = 0; i < fields.length; i++) {
      condition += conditionForField(msg, node, fields[i]);
    }
  }
  condition += ' })'
  // bp.log.info("condition="+condition)
  return eval(condition)
}

function defaultEventDefinition(node, msg) {
  function setField(msg, node, field, target) {
    // bp.log.info("res node={0};msg={1}; field={2}", node,msg, field);
    if (msg[node.type] && msg[node.type][field.name]) {
      target[field.name] = msg[node.type][field.name];
    } else if (node[field.name]) {
      target[field.name] = node[field.name];
    }

    if (field.type === 'select' && (!target[field.name] || target[field.name] === field.defaultValue)) {
      target[field.name] = Object.keys(field.options).filter(key => key !== 'select');
    }

    if (Array.isArray(target[field.name])) {
      target[field.name] = choose(target[field.name]);
    }
  }

  // bp.log.info(node)
  let event;
  if (node.internalFields) {
    let data = {}
    let fields = JSON.parse(node.internalFields);
    for (let i = 0; i < fields.length; i++) {
      setField(msg, node, fields[i], data);
    }
    event = bp.Event(String(node.type), data)
  } else {
    event = bp.Event(String(node.type))
  }
  return event;
}

function copyEventDataToToken(token, event) {
  token.selectedEvent = { name: String(event.name) }
  if (event.data != null) {
    if (typeof event.data === 'object') {
      if (!token[event.name]) {
        token[event.name] = {}
      }
      Object.assign(token[event.name], event.data)
    } else {
      token[event.name] = event.data
    }
  }
  token.selectedEvent.data = event.data
}