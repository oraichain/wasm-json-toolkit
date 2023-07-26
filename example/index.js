const fs = require('fs');
const json2wasm = require('../json2wasm');
const wasm2json = require('../wasm2json');
const { meterJSON } = require('../metering');

const wasm = fs.readFileSync('./test.wasm');
let start = performance.now();
let json = wasm2json(wasm);
console.log('wasm2json', performance.now() - start);
start = performance.now();
json = meterJSON(json, {});
console.log('meterJSON', performance.now() - start);
start = performance.now();
const newWasm = json2wasm(json);
console.log('json2wasm', performance.now() - start);
console.log('wasm length', wasm.length, 'wasm modifed length', newWasm.length);
