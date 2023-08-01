import { WriteStream, ReadStream } from './stream';

/**
 * LEB128 encodeds an interger
 * @param {String|Number} num
 * @return {Buffer}
 */
export function encode(num: string | number): Buffer;
/**
 * decodes a LEB128 encoded interger
 * @param {Buffer} buffer
 * @return {String}
 */
export function decode(buffer: Buffer): string;
export function write(num: number | string, stream: WriteStream): void;
export function read(stream: ReadStream): string;
export function readBn(stream: ReadStream): BigInt;
