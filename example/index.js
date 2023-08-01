const fs = require('fs');
const json2wasm = require('../json2wasm');
const wasm2json = require('../wasm2json');
const { meterJSON } = require('../metering');

const wasm = fs.readFileSync(process.argv[2] ?? './test.wasm');
console.time('wasmprocess');
console.time('wasm2json');
let json = wasm2json(wasm);
console.timeEnd('wasm2json');
console.time('meterJSON');
json = meterJSON(json, {});
console.timeEnd('meterJSON');
console.time('json2wasm');
const newWasm = json2wasm(json);
console.timeEnd('json2wasm');
console.timeLog('wasmprocess', 'wasm modifed length', newWasm.length, 'memory usage', process.memoryUsage().rss / 1000000, 'MB');
