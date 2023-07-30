const wasm2json = require('./wasm2json');
const json2wasm = require('./json2wasm');
const text2json = require('./text2json');
const { WriteArray } = require('./stream');
const defaultCostTable = require('./defaultCostTable.json');

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

function remapOp(op, funcIndex) {
  if (op.name === 'call' && op.immediates >= funcIndex) {
    op.immediates = (++op.immediates).toString();
  }
}

function meteringStatement(meterType, cost, meteringImportIndex) {
  return text2json(`${meterType}.const ${cost} call ${meteringImportIndex}`);
}

const branchingOps = Object.fromEntries(['grow_memory', 'end', 'br', 'br_table', 'br_if', 'if', 'else', 'return', 'loop'].map((key) => [key, true]));
const meteredCode = new WriteArray(100_000); // limit of wasm

// meters a single code entrie
function meterCodeEntry(entry, costTable, meterFuncIndex, meterType, cost) {
  // operations that can possible cause a branch
  const meteringOverHead = meteringStatement(meterType, 0, 0).reduce((sum, op) => sum + getCost(op.name, costTable.code), 0);

  // using same buffer to avoid re-allocating
  meteredCode.reset();

  cost += getCost(entry.locals, costTable.local);

  let start = 0;
  while (start < entry.code.length) {
    let i = start;

    // meters a segment of wasm code
    while (true) {
      const op = entry.code[i++];
      remapOp(op, meterFuncIndex);

      cost += getCost(op.name, costTable.code);
      if (branchingOps[op.name]) {
        break;
      }
    }

    // add the metering statement
    if (cost !== 0) {
      // add the cost of metering
      cost += meteringOverHead;
      meteredCode.concat(meteringStatement(meterType, cost, meterFuncIndex));
    }

    meteredCode.concat(entry.code.slice(start, i));

    start = i;
    cost = 0;
  }

  // re-assign code
  entry.code = meteredCode.buffer;
  return entry;
}

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
  let funcIndex = 0;
  let functionModule, typeModule;

  const { costTable = defaultCostTable, moduleStr = 'metering', fieldStr = 'usegas', meterType = 'i32' } = opts;

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
 * @param {ArrayBuffer} wasm the json tobe metered
 * @param {Object} opts
 * @param {Object} [opts.costTable=defaultTable] the cost table to meter with. See these notes about the default.
 * @param {String} [opts.moduleStr='metering'] the import string for the metering function
 * @param {String} [opts.fieldStr='usegas'] the field string for the metering function
 * @param {String} [opts.meterType='i64'] the register type that is used to meter. Can be `i64`, `i32`, `f64`, `f32`
 * @return {ArrayBuffer}
 */
const meterWASM = (wasm, opts = {}) => {
  let json = wasm2json(wasm);
  json = meterJSON(json, opts);
  return json2wasm(json);
};

module.exports = { meterWASM, meterJSON };
