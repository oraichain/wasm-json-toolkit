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

// function write1(number) {
//   let ret = [];
//   let num = new Bn(number);
//   while (true) {
//     const i = num.maskn(7).toNumber();

//     const check = (i & 0x40) !== 0;
//     num.ishrn(7);

//     if (num.isZero() && !check) {
//       ret.push(i);
//       break;
//     }
//     ret.push(i | 0x80);
//   }
//   return ret;
// }

// function write(number) {
//   let ret = [];
//   let num = number;
//   while (true) {
//     const i = Number(num) & 0b01111111;
//     const check = (i & 0x40) === 0;
//     num >>= 7;

//     if (num === 0 && check) {
//       ret.push(i);
//       break;
//     }
//     ret.push(i | 0x80);
//   }
//   return ret;
// }

// const test = [
//   //   63, 1278, 1606, 571, 1338, 63, 1, 303, 466, 466, 37157, 4294967296, 75448, 4294967295,
//   1048576, 1053912, 1053968, 1057800, 1057824, 1057848, 1057872, 1058688, 1059208, 1060208, 1067136, 1072178, 1072241
// ];
// const n = 1000;

// const ret1 = [];
// console.time('test');
// for (let i = 0; i < n; ++i)
//   for (const s of test) {
//     ret1.push(...write(s));
//   }
// console.timeEnd('test');

// const ret = [];
// console.time('test1');
// for (let i = 0; i < n; ++i)
//   for (const s of test) {
//     ret.push(...write1(s));
//   }
// console.timeEnd('test1');

// console.log(ret.toString() === ret1.toString());
