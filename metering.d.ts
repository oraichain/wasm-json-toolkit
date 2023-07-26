/**
 * Injects metering into a JSON output of [wasm2json](https://github.com/ewasm/wasm-json-toolkit#wasm2json)
 * @param {Object} json the json tobe metered
 * @param {Object} opts
 * @param {Object} [opts.costTable=defaultTable] the cost table to meter with. See these notes about the default.
 * @param {String} [opts.moduleStr='metering'] the import string for the metering function
 * @param {String} [opts.fieldStr='usegas'] the field string for the metering function
 * @param {String} [opts.meterType='i64'] the register type that is used to meter. Can be `i64`, `i32`, `f64`, `f32`
 * @return {Object} the metered json
 */
export declare const meterJSON: (json: any, opts: any) => any;
/**
 * Injects metering into a webassembly binary
 * @param {ArrayBuffer} wasm the json tobe metered
 * @param {Object} opts
 * @param {Object} [opts.costTable=defaultTable] the cost table to meter with. See these notes about the default.
 * @param {String} [opts.moduleStr='metering'] the import string for the metering function
 * @param {String} [opts.fieldStr='usegas'] the field string for the metering function
 * @param {String} [opts.meterType='i64'] the register type that is used to meter. Can be `i64`, `i32`, `f64`, `f32`
 * @return {ArrayBuffer}
 */
export declare const meterWASM: (wasm: ArrayBuffer, opts?: {}) => ArrayBuffer;
