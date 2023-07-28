const fs = require('fs');
const json2wasm = require('../json2wasm');
const wasm2json = require('../wasm2json');
const { meterJSON } = require('../metering');

const wasm = fs.readFileSync(process.argv[2] ?? './test.wasm');
console.time('wasm2json');
let json = wasm2json(wasm);
console.timeLog('wasm2json');
console.time('meterJSON');
json = meterJSON(json, {});
console.timeLog('meterJSON');
console.time('json2wasm');
const newWasm = json2wasm(json);
console.timeLog('json2wasm', 'wasm length', wasm.length, 'wasm modifed length', newWasm.length);
