export const wasm2json: typeof import("./wasm2json");
export const json2wasm: typeof import("./json2wasm");
export const text2json: (text: any) => {
    name: any;
}[];
export const Iterator: {
    new (wasm: any): import("./iterator");
};
export const metering: typeof import("./metering");
