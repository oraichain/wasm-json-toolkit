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
export function read(stream: ReadStream): any;
export function readBn(stream: ReadStream): any;
export function write(data: any, stream: WriteStream): void;
export function writeByte(num: number, stream: WriteStream): void;
