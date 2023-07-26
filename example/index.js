const fs = require('fs');
const json2wasm = require('../json2wasm.js');
const wasm2json = require('../wasm2json.js');

const wasm = fs.readFileSync('../../perpetuals/contracts/margined_engine/artifacts/margined_engine.wasm');
let start = performance.now();
const json = wasm2json(wasm);
console.log('wasm2json', performance.now() - start);
start = performance.now();
const newWasm = json2wasm(json);
console.log('json2wasm', performance.now() - start);
console.log('wasm length', wasm.length, 'wasm restore length', newWasm.length);
