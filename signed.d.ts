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
export function write(number: any, stream: any): void;
export function read(stream: any): any;
export function readBn(stream: any): any;
