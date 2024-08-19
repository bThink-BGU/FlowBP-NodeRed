/* global bp */

const RED = {};

RED.RedBPUtils = new Packages.il.ac.bgu.cs.bp.bpflow.RedBPUtils();

function cloneToken(token) {
  // return JSON.parse(JSON.stringify(token))
  return token
}

function deepCloneToken(token) {
  return JSON.parse(JSON.stringify(token))
  // return token
}

var nodes = new Map();
var starts = [];
var contextStarts = [];
var contextInit = null;
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
      n.token = n.payload || "{}";
      starts.push(n);
    } else if (n.type == "context-start") {
      if (!n.context || n.context === "") {
        throw new Error("The context property must be defined for context-start nodes")
      }
      contextStarts.push(n);
    } else if (n.type == "context-init") {
      if (contextInit) {
        throw new Error("There can only be one context-init node")
      }
      contextInit = n.template;
      eval(contextInit)
    }
  }
}

// init inNodes
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

// init inGroups
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
    let tokens = JSON.parse(n.token)
    if (!Array.isArray(tokens)) {
      tokens = [tokens]
    }
    for (let t of tokens) {
      if (RED.nodeRedAdapter) {
        RED.nodeRedAdapter.updateToken(n, t, true);
      }
      spawn_bthread(n, t);
    }
  }

  for (let n of contextStarts) {
    spawn_cbt(n);
  }

  // Hack to prevent infinite runs
  for (var i = 0; i < 20; i++)
    sync({ waitFor: bp.all })

  sync({ block: bp.all })
})

function spawn_helper(node, token) {
  return function () {
    do {
      let tokens;
      try {
        tokens = execute(node, token) //[{sdfsdf},undefined]  [undefined,{sdfsdf}]
      } finally {
        if (RED.nodeRedAdapter) {
          RED.nodeRedAdapter.updateToken(node, token, false);
        }
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
  }
}

function spawn_cbt(node) {
  ctx.bthread("ctx-flow", node.context, function (entity) {
    let token = { context: { name: node.context, entity: entity } }
    if (RED.nodeRedAdapter) {
      RED.nodeRedAdapter.updateToken(node, token, true);
    }
    spawn_helper(node, token)()
  })
}

//-------------------------------------------------------------------------------
// Each b-thread follows a path and spawns new b-threads when the path splits.
//-------------------------------------------------------------------------------
function spawn_bthread(node, token) {
  bthread("flow", deepCloneToken(bp.thread.data), spawn_helper(node, token))
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
        bp.thread.data.block.push(defaultEventSetDefinition(n, cloneToken))
        block++
      });
      group.rwbi.waitFor.map(id => nodes.get(id)).forEach(n => {
        bp.thread.data.waitFor.push(defaultEventSetDefinition(n, cloneToken))
        waitFor++
      });
      group.rwbi.request.map(id => nodes.get(id)).forEach(n => {
        bp.thread.data.request.push(defaultEventDefinition(n, cloneToken))
        request++
      });
      group.rwbi.interrupt.map(id => nodes.get(id)).forEach(n => {
        bp.thread.data.interrupt.push(defaultEventSetDefinition(n, cloneToken))
        interrupt++
      });
    }
    switch (node.type) {
      //-----------------------------------------------------------------------
      // Start
      //-----------------------------------------------------------------------
      case "start":
      case "context-start":
        return [cloneToken]
      case "switch":
        return [switchNode(node, cloneToken)]
      case "change":
        return [RED.nodesHandlers.change(node, cloneToken)]
      case "log":
        if (node.level === 'info')
          bp.log.info(node.name + "/" + cloneToken)
        else if (node.name + "/" + node.level === 'warn')
          bp.log.warn(node.name + "/" + cloneToken)
        if (node.level === 'fine')
          bp.log.fine(node.name + "/" + cloneToken)

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
        return [cloneToken]
      default:
        if (this[node.type]) {
          this[node.type](node, cloneToken)
        } else {
          if (node.eventType == 'request') {
            event = sync({ request: defaultEventDefinition(node, cloneToken) })
          } else if (node.eventType == 'waitFor') {
            event = sync({ waitFor: defaultEventSetDefinition(node, cloneToken) })
          } else if (node.eventType == 'block') {
            event = sync({ block: defaultEventSetDefinition(node, cloneToken) })
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
    if (node[field] !== undefined && node[field] !== "") {
      let fieldVal = getField(node, msg, field);
      if (typeof fieldVal === 'string') {
        target = ` && e.data.${field} == "${fieldVal}"`;
      } else {
        target = ` && e.data.${field} == ${fieldVal}`;
      }
    }
    return target;
  }

  if (allEventFieldsAreSet(node)) {
    // bp.log.info("Switching to defaultEventDefinition")
    return defaultEventDefinition(node, msg, false);
  }

  // bp.log.info("WAITFOR: node: {0}\nWAITFOR: msg: {1}", node, msg)
  let condition = 'bp.EventSet("", function(e) { return e.name.equals("' + node.type + '")';
  if (node.internalFields !== "[]") {
    let fields = JSON.parse(node.internalFields);
    for (let i = 0; i < fields.length; i++) {
      condition += conditionForField(msg, node, fields[i]);
    }
  }
  condition += ' })'
  bp.log.info(condition)
  return eval(condition)
}

function allEventFieldsAreSet(node, takeRFields) {
  let fields = JSON.parse(node.internalFields);
  if (takeRFields) {
    fields = fields.map(f => f + "R");
  }
  for (let i = 0; i < fields.length; i++) {
    if (node[fields[i]] === undefined || node[fields[i]] === "") {
      return false;
    }
  }
  return true;
}

function getField(node, msg, field) {
  // bp.log.info("msg={0};node={1};field={2};target={3}", msg, node, field, target);
  switch (node[field + "Type"]) {
    case 'str':
      return node[field];
    case 'num':
      return Number(node[field]);
    case 'bool':
      return /^true$/i.test(node[field]);
    case 'date':
      return new Date(node[field]);
    case 'json':
      return JSON.parse(node[field]);
    case 'jsonata':
      try {
        let expr = RED.util.prepareJSONataExpression(node[field], node);
        return RED.util.evaluateJSONataExpression(expr, msg)
      } catch (err) {
        throw RED.util.createError(`Node ${node.type}.${field}.invalid-expr ${node[field]}`, `Node ${node.type}.${field}.invalid-expr ${node[field]}. Message: ${err.message}`)
      }
    case 'msg':
      return RED.util.getMessageProperty(msg, node[field]);
    case 'select':
    case 'multiSelect':
      return node[field];
  }
}

function defaultEventDefinition(node, msg, takeRFields) {
  if (takeRFields === undefined || takeRFields === null) {
    takeRFields = true;
  }
  let event;
  if (node.internalFields !== "[]") {
    let data = {}
    let fields = JSON.parse(node.internalFields);
    let fieldsValues = fields;
    if (takeRFields) {
      fieldsValues = fields.map(f => f + "R");
    }
    for (let i = 0; i < fields.length; i++) {
      data[fields[i]] = getField(node, msg, fieldsValues[i]);
    }
    event = bp.Event(String(node.type), data)
  } else {
    event = bp.Event(String(node.type))
  }
  bp.log.info("event:" + event)

  return event;
}