class ReadStream {
  /**
   * @param {Buffer} buf
   */
  constructor(buf) {
    this.buffer = buf;
    this._bytesRead = 0;
  }

  /**
   * read `num` number of bytes from the pipe
   * @param {Number} num
   * @return {Buffer}
   */
  read(num) {
    const data = this.buffer.subarray(0, num);
    this._bytesRead += num;
    this.buffer = this.buffer.subarray(num);
    return data;
  }

  /**
   * Whether or not there is more data to read from the buffer
   * returns {Boolean}
   */
  get end() {
    return !this.buffer.length;
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
   * @param {Buffer | string} buf
   */
  write(buf) {
    (Buffer.isBuffer(buf) ? buf : Buffer.from(buf)).copy(this._buffer, this._bytesWrote);
    this._bytesWrote += buf.length;
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
