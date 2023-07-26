const Bn = require('bn.js');
const { ReadStream, WriteStream } = require('./stream');

module.exports = {
  encode,
  decode,
  read,
  readBn,
  write
};

function read(stream) {
  return readBn(stream).toString();
}

function readBn(stream) {
  const num = new Bn(0);
  let shift = 0;
  let byt;
  while (true) {
    byt = stream.read(1)[0];
    num.ior(new Bn(byt & 0x7f).shln(shift));
    if (byt >> 7 === 0) {
      break;
    } else {
      shift += 7;
    }
  }
  return num;
}

/**
 * LEB128 encodeds an interger
 * @param {Number} number
 * @param {WriteStream} stream
 */
function write(number, stream) {
  let a = number;
  do {
    let byte = a & 0b01111111;
    // we only care about lower 7 bits
    a >>= 8 - 1;
    // shift
    if (a) byte = byte | 0b10000000; /* if remaining is truthy (!= 0), set highest bit */
    stream.writeByte(byte);
  } while (a);
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
