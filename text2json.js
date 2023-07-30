const OP_IMMEDIATES = require('./immediates.json');
const { ReadArray } = require('./stream');

const cache = new Map();

module.exports = (text) => {
  if (!cache.has(text)) {
    const json = [];
    const textArray = new ReadArray(text.split(/\s|\n/));
    while (!textArray.end) {
      const textOp = textArray.shift();
      const jsonOp = {};

      let [type, name] = textOp.split('.');

      if (name === undefined) {
        name = type;
      } else {
        jsonOp.return_type = type;
      }

      jsonOp.name = name;

      const immediate = OP_IMMEDIATES[jsonOp.name === 'const' ? jsonOp.return_type : jsonOp.name];

      if (immediate) {
        jsonOp.immediates = immediataryParser(immediate, textArray);
      }

      json.push(jsonOp);
    }
    cache.set(text, json);
    return json;
  }

  return cache.get(text);
};

/**
 * @param {string} type
 * @param {ReadArray} arr
 */
function immediataryParser(type, arr) {
  const json = {};
  switch (type) {
    case 'br_table':
      const dests = [];

      while (1) {
        let dest = arr.peek();
        if (isNaN(dest)) break;
        arr.shift();
        dests.push(dest);
      }

      return dests;
    case 'call_indirect':
      json.index = arr.shift();
      json.reserved = 0;
      return json;
    case 'memory_immediate':
      json.flags = arr.shift();
      json.offset = arr.shift();
      return json;
    default:
      return arr.shift();
  }
}
