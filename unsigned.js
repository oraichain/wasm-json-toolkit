const { ReadStream, WriteStream } = require('./stream');

const LOWER_7 = 0b01111111;
const UPPER_1 = 0b10000000;

module.exports = {
  encode,
  decode,
  read,
  write
};

/**
 * @param {ReadStream} stream
 * @return {number}
 */
function read(stream) {
  let count = 0;
  // find null byte to read reversed
  while (stream.peek(count++) & UPPER_1);

  let result = 0,
    shift = 0;
  while (count--) {
    const a = stream.readByte() & LOWER_7; /* masking, we only care about lower 7 bits */
    result |= a << shift; /* shift this value left and add it */
    shift += 7;
  }
  return result;
}

/**
 * LEB128 encodeds an interger
 * @param {Number} number
 * @param {WriteStream} stream
 */
function write(number, stream) {
  let a = number;
  do {
    let byte = a & LOWER_7;
    // we only care about lower 7 bits
    a >>= 7;
    // shift
    if (a) byte = byte | UPPER_1; /* if remaining is truthy (!= 0), set highest bit */
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
