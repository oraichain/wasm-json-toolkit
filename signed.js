const Bn = require('bn.js');
const { ReadStream, WriteStream } = require('./stream');

module.exports = {
  encode,
  decode,
  write,
  read,
  readBn
};

/**
 * @param {ReadStream} stream
 * @return {string}
 */
function read(stream) {
  return readBn(stream).toString();
}

/**
 * @param {ReadStream} stream
 * @return {BigInt}
 */
function readBn(stream) {
  let num = 0n;
  let shift = 0n;
  let byt;
  while (true) {
    byt = stream.readByte();
    num |= BigInt(byt & 0x7f) << shift;
    shift += 7n;
    if (byt >> 7 === 0) {
      break;
    }
  }

  const mask = 1n << (shift - 1n);
  if ((num & mask) !== 0n) {
    num = -((~num & (mask - 1n)) + 1n);
  }

  return num;
}

/**
 * LEB128 encodeds an interger
 * @param {Number} number
 * @param {WriteStream} stream
 */
function write(number, stream) {
  let num = new Bn(number);
  const isNeg = num.isNeg();
  if (isNeg) {
    // add 8 bits for padding
    num = num.toTwos(num.bitLength() + 8);
  }
  while (true) {
    const i = num.maskn(7).toNumber();
    num.ishrn(7);
    if ((isNeg && num.toString(2).indexOf('0') < 0 && (i & 0x40) !== 0) || (num.isZero() && (i & 0x40) === 0)) {
      stream.writeByte(i);
      break;
    }
    stream.writeByte(i | 0x80);
  }
}

/**
 * LEB128 encodeds an interger
 * @param {String|Number} num
 * @return {Buffer}
 */
function encode(num) {
  const stream = new WriteStream();
  write(num, stream);
  return stream.buffer;
}

/**
 * decodes a LEB128 encoded interger
 * @param {Buffer} buffer
 * @return {String}
 */
function decode(buffer) {
  const stream = new ReadStream(buffer);
  return read(stream);
}
