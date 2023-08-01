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
 * @param {Number|string} number
 * @param {WriteStream} stream
 */
function write(number, stream) {
  let num = BigInt(number);
  const isNeg = number < 0n;
  if (isNeg) {
    // add 8 bits for padding
    num = -num;
    // this will force using bigint for log2
    const mask = 1n << BigInt(Math.ceil(Math.log2(Number(num))) + 8);
    // inverse bit then plus 1
    num = (~num & (mask - 1n)) + 1n;
  }

  while (true) {
    const i = Number(num & 0x7fn);
    num >>= 7n;
    if ((i & 0x40) === 0 ? num === 0n : isNeg && (num & (num + 1n)) === 0n) {
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
