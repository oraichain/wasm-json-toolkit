import { WriteStream, ReadStream } from './stream';
import BN from 'bn.js';

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
export function read(stream: ReadStream): Buffer;
export function readBn(stream: ReadStream): BN;
export function write(data: any, stream: WriteStream): void;
export function writeByte(num: number, stream: WriteStream): void;
