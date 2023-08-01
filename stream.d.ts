export class ReadStream {
  /**
   * @param {Buffer} buf
   */
  constructor(buf: Buffer);
  buffer: Buffer;
  _bytesRead: number;
  /**
   * read `num` number of bytes from the pipe
   * @param {Number} num
   * @return {Buffer}
   */
  read(num: number): Buffer;

  /**
   * readByte return byte
   * @return {number}
   */
  readByte(): number;

  /**
   * read `num` number of bytes from the pipe
   * @param {Number} num
   * @return {Array}
   */
  readArray(num: number): Array;

  /**
   * read `num` number of bytes from the pipe
   * @param {Number} num
   * @param {BufferEncoding} encoding
   * @return {string}
   */
  readString(num: number, encoding: BufferEncoding): string;

  peek(ind: number): number;

  /**
   * Whether or not there is more data to read from the buffer
   * returns {Boolean}
   */
  get end(): boolean;
  /**
   * returns the number of bytes read from the stream
   * @return {Integer}
   */
  get bytesRead(): Integer;
}
export class WriteStream {
  /**
   * Creates a new instance of a pipe
   * @param {number | Buffer} sizeOfBuffer - an optional buffer to start with, default is 1000kb = 2 * maximum contract size
   */
  constructor(sizeOfBuffer: number | Buffer);
  _buffer: any;
  _bytesWrote: number;
  /**
   * Wites a buffer to the pipe
   * @param {Buffer} buf
   */
  write(buf: Buffer): void;

  writeByte(byte: number): void;
  writeString(str: string): void;

  /**
   * return the internal buffer
   * @return {Buffer}
   */
  get buffer(): Buffer;
  /**
   * returns the number of bytes wrote to the stream
   * @return {Integer}
   */
  get bytesWrote(): Integer;
}

export class ReadArray {
  /**
   * @param {Array} arr
   */
  constructor(arr: Array);
  _ind: number;
  _arr: Array;

  peek(): any;
  get end(): boolean;
  shift(): any;
}

export class WriteArray {
  /**
   * @param {number} size
   */
  constructor(size: number);
  _length: number;

  reset(): void;

  /**
   * Wites an item to the pipe
   * @param {any} item
   */
  push(item: any): void;

  /**
   * Wites an array to the pipe
   * @param {any[]} arr
   */
  concat(arr: any[]): void;

  /**
   * return the internal buffer
   * @return {Buffer}
   */
  get buffer(): Buffer;
  /**
   * returns the number of bytes wrote to the stream
   * @return {Integer}
   */
  get length(): Integer;
}
