class ReadStream {
  /**
   * @param {Buffer} buf
   */
  constructor(buf) {
    this._buffer = buf;
    this._bytesRead = 0;
  }

  /**
   * read `num` number of bytes from the pipe
   * @param {Number} num
   * @return {Buffer}
   */
  read(num) {
    return this._buffer.subarray(this._bytesRead, (this._bytesRead += num));
  }

  readByte() {
    return this._buffer[this._bytesRead++];
  }

  get buffer() {
    return this._buffer.subarray(this._bytesRead);
  }

  /**
   * Whether or not there is more data to read from the buffer
   * returns {Boolean}
   */
  get end() {
    return this._bytesRead >= this._buffer.length;
  }

  /**
   * returns the number of bytes read from the stream
   * @return {Integer}
   */
  get bytesRead() {
    return this._bytesRead;
  }
}

class WriteStream {
  /**
   * Creates a new instance of a pipe
   * @param {number | Buffer} sizeOfBuffer - an optional buffer to start with, default is 1000kb = 2 * maximum contract size
   */
  constructor(sizeOfBuffer = 1024000) {
    this._buffer = typeof sizeOfBuffer === 'number' ? Buffer.allocUnsafe(sizeOfBuffer) : sizeOfBuffer;
    this._bytesWrote = 0;
  }

  /**
   * Wites a buffer to the pipe
   * @param {Buffer} buf
   */
  write(buf) {
    buf.copy(this._buffer, this._bytesWrote);
    this._bytesWrote += buf.length;
  }

  writeArray(arr) {
    this._buffer.set(arr, this._bytesWrote);
    this._bytesWrote += arr.length;
  }

  writeString(str) {
    this._buffer.write(str, this._bytesWrote);
    this._bytesWrote += str.length;
  }

  writeByte(byte) {
    this._buffer[this._bytesWrote++] = byte;
  }

  /**
   * return the internal buffer
   * @param {number} index
   * @return {WriteStream}
   */
  substream(index) {
    return new WriteStream(this._buffer.subarray(this._bytesWrote + index));
  }

  /**
   * return the internal buffer
   * @return {Buffer}
   */
  get buffer() {
    return this._buffer.subarray(0, this._bytesWrote);
  }

  /**
   * returns the number of bytes wrote to the stream
   * @return {Integer}
   */
  get bytesWrote() {
    return this._bytesWrote;
  }
}

module.exports = { ReadStream, WriteStream };
