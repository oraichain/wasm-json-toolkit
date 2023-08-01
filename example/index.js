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

// const Bn = require('bn.js');

// function readBn1(stream) {
//   let num = new Bn(0);
//   let shift = 0;
//   let byt;
//   let ind = 0;
//   while (true) {
//     byt = stream[ind++];
//     num.ior(new Bn(byt & 0x7f).shln(shift));
//     shift += 7;
//     if (byt >> 7 === 0) {
//       break;
//     }
//   }

//   return num.fromTwos(shift);
// }

// BigInt.prototype.toNumber = function () {
//   return Number(this);
// };

// function readBn(stream) {
//   let num = 0n;
//   let shift = 0n;
//   let byt;
//   let ind = 0;
//   while (true) {
//     byt = stream[ind++];
//     num |= BigInt(byt & 0x7f) << shift;
//     shift += 7n;
//     if (byt >> 7 === 0) {
//       break;
//     }
//   }

//   const mask = 1n << (shift - 1n);
//   if ((num & mask) !== 0n) {
//     num = -((~num & (mask - 1n)) + 1n);
//   }

//   return num.fromTwos(shift);
// }

// const test = [[127], [128, 126], [129, 128, 128, 128, 120]];
// const n = 1000;

// console.time('test');
// for (let i = 0; i < n; ++i)
//   for (const s of test) {
//     readBn(s);
//   }
// console.timeEnd('test');

// console.time('test1');
// for (let i = 0; i < n; ++i)
//   for (const s of test) {
//     readBn1(s);
//   }
// console.timeEnd('test1');
