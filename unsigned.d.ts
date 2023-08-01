import { WriteStream, ReadStream } from './stream';

/**
 * LEB128 encodeds an interger
 * @param {Number} num
 * @return {Buffer}
 */
export function encode(num: number): Buffer;
/**
 * decodes a LEB128 encoded interger
 * @param {Buffer} buffer
 * @return {String}
 */
export function decode(buffer: Buffer): string;
export function read(stream: ReadStream): number;
export function write(num: number, stream: WriteStream): void;
