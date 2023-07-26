const wasm2json = require('./wasm2json');
const json2wasm = require('./json2wasm');
const text2json = require('./text2json');

const defaultCostTable = {
  start: 0,
  type: {
    params: {
      DEFAULT: 0
    },
    return_type: {
      DEFAULT: 0
    }
  },
  import: 0,
  code: {
    locals: {
      DEFAULT: 1
    },
    code: {
      get_local: 120,
      set_local: 120,
      tee_local: 120,
      get_global: 120,
      set_global: 120,

      load8_s: 120,
      load8_u: 120,
      load16_s: 120,
      load16_u: 120,
      load32_s: 120,
      load32_u: 120,
      load: 120,

      store8: 120,
      store16: 120,
      store32: 120,
      store: 120,

      grow_memory: 10000,
      current_memory: 100,

      nop: 1,
      block: 1,
      loop: 1,
      if: 1,
      then: 90,
      else: 90,
      br: 90,
      br_if: 90,
      br_table: 120,
      return: 90,

      call: 90,
      call_indirect: 10000,

      const: 1,

      add: 45,
      sub: 45,
      mul: 45,
      div_s: 36000,
      div_u: 36000,
      rem_s: 36000,
      rem_u: 36000,
      and: 45,
      or: 45,
      xor: 45,
      shl: 67,
      shr_u: 67,
      shr_s: 67,
      rotl: 90,
      rotr: 90,
      eq: 45,
      eqz: 45,
      ne: 45,
      lt_s: 45,
      lt_u: 45,
      le_s: 45,
      le_u: 45,
      gt_s: 45,
      gt_u: 45,
      ge_s: 45,
      ge_u: 45,
      clz: 45,
      ctz: 45,
      popcnt: 45,

      drop: 120,
      select: 120,

      unreachable: 1
    }
  },
  data: 0
};

// gets the cost of an operation for entry in a section from the cost table
function getCost(json, costTable = {}, defaultCost = 0) {
  let cost = 0;
  // finds the default cost
  defaultCost = costTable['DEFAULT'] !== undefined ? costTable['DEFAULT'] : 0;

  if (Array.isArray(json)) {
    json.forEach((el) => {
      cost += getCost(el, costTable);
    });
  } else if (typeof json === 'object') {
    for (const propName in json) {
      const propCost = costTable[propName];
      if (propCost) {
        cost += getCost(json[propName], propCost, defaultCost);
      }
    }
  } else if (costTable[json] === undefined) {
    cost = defaultCost;
  } else {
    cost = costTable[json];
  }
  return cost;
}

// meters a single code entrie
function meterCodeEntry(entry, costTable, meterFuncIndex, meterType, cost) {
  function meteringStatement(cost, meteringImportIndex) {
    return text2json(`${meterType}.const ${cost} call ${meteringImportIndex}`);
  }
  function remapOp(op, funcIndex) {
    if (op.name === 'call' && op.immediates >= funcIndex) {
      op.immediates = (++op.immediates).toString();
    }
  }
  function meterTheMeteringStatement() {
    const code = meteringStatement(0, 0);
    // sum the operations cost
    return code.reduce((sum, op) => sum + getCost(op.name, costTable.code), 0);
  }

  // operations that can possible cause a branch
  const branchingOps = new Set(['grow_memory', 'end', 'br', 'br_table', 'br_if', 'if', 'else', 'return', 'loop']);
  const meteringOverHead = meterTheMeteringStatement();
  let code = entry.code.slice();
  let meteredCode = [];

  cost += getCost(entry.locals, costTable.local);

  while (code.length) {
    let i = 0;

    // meters a segment of wasm code
    while (true) {
      const op = code[i++];
      remapOp(op, meterFuncIndex);

      cost += getCost(op.name, costTable.code);
      if (branchingOps.has(op.name)) {
        break;
      }
    }

    // add the metering statement
    if (cost !== 0) {
      // add the cost of metering
      cost += meteringOverHead;
      meteredCode = meteredCode.concat(meteringStatement(cost, meterFuncIndex));
    }

    // start a new segment
    meteredCode = meteredCode.concat(code.slice(0, i));
    code = code.slice(i);
    cost = 0;
  }

  entry.code = meteredCode;
  return entry;
}

/**
 * Injects metering into a JSON output of [wasm2json](https://github.com/ewasm/wasm-json-toolkit#wasm2json)
 * @param {Object} json the json tobe metered
 * @param {Object} opts
 * @param {Object} [opts.costTable=defaultTable] the cost table to meter with. See these notes about the default.
 * @param {String} [opts.moduleStr='metering'] the import string for the metering function
 * @param {String} [opts.fieldStr='usegas'] the field string for the metering function
 * @param {String} [opts.meterType='i64'] the register type that is used to meter. Can be `i64`, `i32`, `f64`, `f32`
 * @return {Object} the metered json
 */
const meterJSON = (json, opts) => {
  function findSection(module, sectionName) {
    return module.find((section) => section.name === sectionName);
  }

  function createSection(module, name) {
    const newSectionId = json2wasm.SECTION_IDS[name];
    for (let index in module) {
      const section = module[index];
      const sectionId = json2wasm.SECTION_IDS[section.name];
      if (sectionId) {
        if (newSectionId < sectionId) {
          // inject a new section
          module.splice(index, 0, {
            name,
            entries: []
          });
          return;
        }
      }
    }
  }

  let funcIndex = 0;
  let functionModule, typeModule;

  let { costTable, moduleStr, fieldStr, meterType } = opts;

  // set defaults
  if (!costTable) costTable = defaultCostTable;
  if (!moduleStr) moduleStr = 'metering';
  if (!fieldStr) fieldStr = 'usegas';
  if (!meterType) meterType = 'i32';

  // add nessicarry sections iff they don't exist
  if (!findSection(json, 'type')) createSection(json, 'type');
  if (!findSection(json, 'import')) createSection(json, 'import');

  const importJson = {
    moduleStr: moduleStr,
    fieldStr: fieldStr,
    kind: 'function'
  };
  const importType = {
    form: 'func',
    params: [meterType]
  };

  json = json.slice(0);

  for (let section of json) {
    section = Object.assign(section);
    switch (section.name) {
      case 'type':
        // mark the import index
        importJson.type = section.entries.push(importType) - 1;
        // save for use for the code section
        typeModule = section;
        break;
      case 'function':
        // save for use for the code section
        functionModule = section;
        break;
      case 'import':
        for (const entry of section.entries) {
          if (entry.moduleStr === moduleStr && entry.fieldStr === fieldStr) {
            throw new Error('importing metering function is not allowed');
          }
          if (entry.kind === 'function') {
            funcIndex++;
          }
        }
        // append the metering import
        section.entries.push(importJson);
        break;
      case 'export':
        for (const entry of section.entries) {
          if (entry.kind === 'function' && entry.index >= funcIndex) {
            entry.index++;
          }
        }
        break;
      case 'element':
        for (const entry of section.entries) {
          // remap elements indices
          entry.elements = entry.elements.map((el) => (el >= funcIndex ? ++el : el));
        }
        break;
      case 'start':
        // remap start index
        if (section.index >= funcIndex) section.index++;
        break;
      case 'code':
        for (const i in section.entries) {
          const entry = section.entries[i];
          const typeIndex = functionModule.entries[i];
          const type = typeModule.entries[typeIndex];
          const cost = getCost(type, costTable.type);

          meterCodeEntry(entry, costTable.code, funcIndex, meterType, cost);
        }
        break;
    }
  }

  return json;
};

/**
 * Injects metering into a webassembly binary
 * @param {Object} json the json tobe metered
 * @param {Object} opts
 * @param {Object} [opts.costTable=defaultTable] the cost table to meter with. See these notes about the default.
 * @param {String} [opts.moduleStr='metering'] the import string for the metering function
 * @param {String} [opts.fieldStr='usegas'] the field string for the metering function
 * @param {String} [opts.meterType='i64'] the register type that is used to meter. Can be `i64`, `i32`, `f64`, `f32`
 * @return {Buffer}
 */
const meterWASM = (wasm, opts = {}) => {
  let json = wasm2json(wasm);
  json = meterJSON(json, opts);
  return json2wasm(json);
};

module.exports = { meterWASM, meterJSON };
