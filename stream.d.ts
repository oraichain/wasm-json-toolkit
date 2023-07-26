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
     * @param {number} size - an optional buffer to start with, default is 1000kb = 2 * maximum contract size
     */
    constructor(size?: number);
    _buffer: any;
    _bytesWrote: number;
    /**
     * Wites a buffer to the pipe
     * @param {Buffer} buf
     */
    write(buf: Buffer): void;
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
