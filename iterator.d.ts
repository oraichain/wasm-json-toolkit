export = ModuleIterator;
declare class ModuleIterator {
    /**
     * param {Buffer} wasm - a webassembly binary
     */
    constructor(wasm: any);
    _wasm: any;
    _sections: any[];
    _modified: boolean;
    /**
     * if the orignal wasm module was modified then this will return the modified
     * wasm module
     */
    get wasm(): any;
    _pipe: ReadStream;
    _update(index: any, data: any): void;
}
import { ReadStream } from "./stream";
