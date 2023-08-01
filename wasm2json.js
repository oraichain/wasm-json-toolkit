const unsigned = require('./unsigned');
const signed = require('./signed');
const { ReadStream } = require('./stream');
const OP_IMMEDIATES = require('./immediates.json');

// https://github.com/WebAssembly/design/blob/master/BinaryEncoding.md#language-types
// All types are distinguished by a negative varint7 values that is the first
// byte of their encoding (representing a type constructor)
const LANGUAGE_TYPES = {
  0x7f: 'i32',
  0x7e: 'i64',
  0x7d: 'f32',
  0x7c: 'f64',
  0x70: 'anyFunc',
  0x60: 'func',
  0x40: 'block_type'
};

// https://github.com/WebAssembly/design/blob/master/BinaryEncoding.md#external_kind
// A single-byte unsigned integer indicating the kind of definition being imported or defined:
const EXTERNAL_KIND = ['function', 'table', 'memory', 'global'];

/**
 * @param {ReadStream} stream
 * @return {Object}
 */
const parsePreramble = (stream) => {
  const json = { name: 'preramble' };
  json.magic = stream.readArray(4);
  json.version = stream.readArray(4);
  return json;
};

const parseSectionHeader = (stream) => {
  const json = {};
  json.id = stream.readByte();
  json.name = SECTION_IDS[json.id];
  json.size = unsigned.read(stream);
  return json;
};

const OPCODES = [
  'unreachable',
  'nop',
  'block',
  'loop',
  'if',
  'else',
  '',
  '',
  '',
  '',
  '',
  'end',
  'br',
  'br_if',
  'br_table',
  'return',
  'call',
  'call_indirect',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  'drop',
  'select',
  '',
  '',
  '',
  '',
  'get_local',
  'set_local',
  'tee_local',
  'get_global',
  'set_global',
  '',
  '',
  '',
  'i32.load',
  'i64.load',
  'f32.load',
  'f64.load',
  'i32.load8_s',
  'i32.load8_u',
  'i32.load16_s',
  'i32.load16_u',
  'i64.load8_s',
  'i64.load8_u',
  'i64.load16_s',
  'i64.load16_u',
  'i64.load32_s',
  'i64.load32_u',
  'i32.store',
  'i64.store',
  'f32.store',
  'f64.store',
  'i32.store8',
  'i32.store16',
  'i64.store8',
  'i64.store16',
  'i64.store32',
  'current_memory',
  'grow_memory',
  'i32.const',
  'i64.const',
  'f32.const',
  'f64.const',
  'i32.eqz',
  'i32.eq',
  'i32.ne',
  'i32.lt_s',
  'i32.lt_u',
  'i32.gt_s',
  'i32.gt_u',
  'i32.le_s',
  'i32.le_u',
  'i32.ge_s',
  'i32.ge_u',
  'i64.eqz',
  'i64.eq',
  'i64.ne',
  'i64.lt_s',
  'i64.lt_u',
  'i64.gt_s',
  'i64.gt_u',
  'i64.le_s',
  'i64.le_u',
  'i64.ge_s',
  'i64.ge_u',
  'f32.eq',
  'f32.ne',
  'f32.lt',
  'f32.gt',
  'f32.le',
  'f32.ge',
  'f64.eq',
  'f64.ne',
  'f64.lt',
  'f64.gt',
  'f64.le',
  'f64.ge',
  'i32.clz',
  'i32.ctz',
  'i32.popcnt',
  'i32.add',
  'i32.sub',
  'i32.mul',
  'i32.div_s',
  'i32.div_u',
  'i32.rem_s',
  'i32.rem_u',
  'i32.and',
  'i32.or',
  'i32.xor',
  'i32.shl',
  'i32.shr_s',
  'i32.shr_u',
  'i32.rotl',
  'i32.rotr',
  'i64.clz',
  'i64.ctz',
  'i64.popcnt',
  'i64.add',
  'i64.sub',
  'i64.mul',
  'i64.div_s',
  'i64.div_u',
  'i64.rem_s',
  'i64.rem_u',
  'i64.and',
  'i64.or',
  'i64.xor',
  'i64.shl',
  'i64.shr_s',
  'i64.shr_u',
  'i64.rotl',
  'i64.rotr',
  'f32.abs',
  'f32.neg',
  'f32.ceil',
  'f32.floor',
  'f32.trunc',
  'f32.nearest',
  'f32.sqrt',
  'f32.add',
  'f32.sub',
  'f32.mul',
  'f32.div',
  'f32.min',
  'f32.max',
  'f32.copysign',
  'f64.abs',
  'f64.neg',
  'f64.ceil',
  'f64.floor',
  'f64.trunc',
  'f64.nearest',
  'f64.sqrt',
  'f64.add',
  'f64.sub',
  'f64.mul',
  'f64.div',
  'f64.min',
  'f64.max',
  'f64.copysign',
  'i32.wrap/i64',
  'i32.trunc_s/f32',
  'i32.trunc_u/f32',
  'i32.trunc_s/f64',
  'i32.trunc_u/f64',
  'i64.extend_s/i32',
  'i64.extend_u/i32',
  'i64.trunc_s/f32',
  'i64.trunc_u/f32',
  'i64.trunc_s/f64',
  'i64.trunc_u/f64',
  'f32.convert_s/i32',
  'f32.convert_u/i32',
  'f32.convert_s/i64',
  'f32.convert_u/i64',
  'f32.demote/f64',
  'f64.convert_s/i32',
  'f64.convert_u/i32',
  'f64.convert_s/i64',
  'f64.convert_u/i64',
  'f64.promote/f32',
  'i32.reinterpret/f32',
  'i64.reinterpret/f64',
  'f32.reinterpret/i32',
  'f64.reinterpret/i64',
  'i32.extend8_s',
  'i32.extend16_s',
  'i64.extend8_s',
  'i64.extend16_s',
  'i64.extend32_s'
];

const SECTION_IDS = ['custom', 'type', 'import', 'function', 'table', 'memory', 'global', 'export', 'start', 'element', 'code', 'data'];

const immediataryParsers = {
  /**
   * @param {ReadStream} stream
   * @return {Object}
   */
  varuint1: (stream) => {
    return stream.readByte();
  },
  /**
   * @param {ReadStream} stream
   * @return {Object}
   */
  varuint32: (stream) => {
    return unsigned.read(stream);
  },
  /**
   * @param {ReadStream} stream
   * @return {Object}
   */
  varint32: (stream) => {
    return Number(signed.readBn(stream));
  },
  /**
   * @param {ReadStream} stream
   * @return {Object}
   */
  varint64: (stream) => {
    return signed.read(stream);
  },
  /**
   * @param {ReadStream} stream
   * @return {Object}
   */
  uint32: (stream) => {
    return stream.readArray(4);
  },
  /**
   * @param {ReadStream} stream
   * @return {Object}
   */
  uint64: (stream) => {
    return stream.readArray(8);
  },

  /**
   * @param {ReadStream} stream
   * @return {Object}
   */
  block_type: (stream) => {
    const type = stream.readByte();
    return LANGUAGE_TYPES[type];
  },

  /**
   * @param {ReadStream} stream
   * @return {Object}
   */
  br_table: (stream) => {
    const json = {};
    const num = unsigned.read(stream);
    json.targets = new Array(num);

    for (let i = 0; i < num; i++) {
      json.targets[i] = unsigned.read(stream);
    }
    json.defaultTarget = unsigned.read(stream);
    return json;
  },

  /**
   * @param {ReadStream} stream
   * @return {Object}
   */
  call_indirect: (stream) => {
    const json = {};
    json.index = unsigned.read(stream);
    json.reserved = stream.readByte();
    return json;
  },

  /**
   * @param {ReadStream} stream
   * @return {Object}
   */
  memory_immediate: (stream) => {
    const json = {};
    json.flags = unsigned.read(stream);
    json.offset = unsigned.read(stream);
    return json;
  }
};

const typeParsers = {
  function: (stream) => {
    return unsigned.read(stream);
  },
  table: (stream) => {
    const entry = {};
    const type = stream.readByte(); // read single byte
    entry.elementType = LANGUAGE_TYPES[type];
    entry.limits = typeParsers.memory(stream);
    return entry;
  },
  /**
   * parses a [`global_type`](https://github.com/WebAssembly/design/blob/master/BinaryEncoding.md#global_type)
   * @param {Stream} stream
   * @return {Object}
   */
  global: (stream) => {
    const global = {};
    let type = stream.readByte();
    global.contentType = LANGUAGE_TYPES[type];
    global.mutability = stream.readByte();
    return global;
  },
  /**
   * Parses a [resizable_limits](https://github.com/WebAssembly/design/blob/master/BinaryEncoding.md#resizable_limits)
   * @param {Stream} stream
   * return {Object}
   */
  memory: (stream) => {
    const limits = {};
    limits.flags = unsigned.read(stream);
    limits.intial = unsigned.read(stream);
    if (limits.flags === 1) {
      limits.maximum = unsigned.read(stream);
    }
    return limits;
  },
  /**
   * Parses a [init_expr](https://github.com/WebAssembly/design/blob/master/BinaryEncoding.md#resizable_limits)
   * The encoding of an initializer expression is the normal encoding of the
   * expression followed by the end opcode as a delimiter.
   */
  initExpr: (stream) => {
    const op = parseOp(stream);
    stream.read(1); // skip the `end`
    return op;
  }
};

const sectionParsers = {
  custom: (stream, header) => {
    const json = {
      name: 'custom'
    };
    const section = new ReadStream(stream.read(header.size));
    const nameLen = unsigned.read(section);
    json.sectionName = section.readString(nameLen);
    json.payload = [...section.buffer];
    return json;
  },
  type: (stream) => {
    const numberOfEntries = unsigned.read(stream);
    const json = {
      name: 'type',
      entries: new Array(numberOfEntries)
    };

    for (let i = 0; i < numberOfEntries; i++) {
      let type = stream.readByte();

      const paramCount = unsigned.read(stream);

      const entry = {
        form: LANGUAGE_TYPES[type],
        params: new Array(paramCount)
      };

      // parse the entries
      for (let q = 0; q < paramCount; q++) {
        entry.params[q] = LANGUAGE_TYPES[stream.readByte()];
      }

      const numOfReturns = unsigned.read(stream);
      if (numOfReturns) {
        type = stream.readByte();
        entry.return_type = LANGUAGE_TYPES[type];
      }

      json.entries[i] = entry;
    }
    return json;
  },

  /**
   * @param {ReadStream} stream
   * @return {Object}
   */
  import: (stream) => {
    const numberOfEntries = unsigned.read(stream);
    const json = {
      name: 'import',
      entries: new Array(numberOfEntries)
    };

    for (let i = 0; i < numberOfEntries; i++) {
      const entry = {};
      const moduleLen = unsigned.read(stream);
      entry.moduleStr = stream.readString(moduleLen);

      const fieldLen = unsigned.read(stream);
      entry.fieldStr = stream.readString(fieldLen);
      const kind = stream.readByte(); // read single byte
      entry.kind = EXTERNAL_KIND[kind];
      entry.type = typeParsers[entry.kind](stream);

      json.entries[i] = entry;
    }
    return json;
  },
  function: (stream) => {
    const numberOfEntries = unsigned.read(stream);
    const json = {
      name: 'function',
      entries: new Array(numberOfEntries)
    };

    for (let i = 0; i < numberOfEntries; i++) {
      json.entries[i] = unsigned.read(stream);
    }
    return json;
  },
  table: (stream) => {
    const numberOfEntries = unsigned.read(stream);
    const json = {
      name: 'table',
      entries: new Array(numberOfEntries)
    };

    // parse table_type
    for (let i = 0; i < numberOfEntries; i++) {
      json.entries[i] = typeParsers.table(stream);
    }
    return json;
  },
  memory: (stream) => {
    const numberOfEntries = unsigned.read(stream);
    const json = {
      name: 'memory',
      entries: new Array(numberOfEntries)
    };

    for (let i = 0; i < numberOfEntries; i++) {
      json.entries[i] = typeParsers.memory(stream);
    }
    return json;
  },
  global: (stream) => {
    const numberOfEntries = unsigned.read(stream);
    const json = {
      name: 'global',
      entries: new Array(numberOfEntries)
    };

    for (let i = 0; i < numberOfEntries; i++) {
      const entry = {};
      entry.type = typeParsers.global(stream);
      entry.init = typeParsers.initExpr(stream);

      json.entries[i] = entry;
    }
    return json;
  },

  /**
   * @param {ReadStream} stream
   * @return {Object}
   */
  export: (stream) => {
    const numberOfEntries = unsigned.read(stream);
    const json = {
      name: 'export',
      entries: new Array(numberOfEntries)
    };

    for (let i = 0; i < numberOfEntries; i++) {
      const strLength = unsigned.read(stream);
      const entry = {};
      entry.field_str = stream.readString(strLength);
      const kind = stream.readByte();
      entry.kind = EXTERNAL_KIND[kind];
      entry.index = unsigned.read(stream);
      json.entries[i] = entry;
    }
    return json;
  },
  start: (stream) => {
    const json = { name: 'start' };
    json.index = unsigned.read(stream);
    return json;
  },
  element: (stream) => {
    const numberOfEntries = unsigned.read(stream);
    const json = {
      name: 'element',
      entries: new Array(numberOfEntries)
    };

    for (let i = 0; i < numberOfEntries; i++) {
      const index = unsigned.read(stream);
      const offset = typeParsers.initExpr(stream);
      const numElem = unsigned.read(stream);

      const elements = new Array(numElem);

      for (let j = 0; j < numElem; j++) {
        const elem = unsigned.read(stream);
        elements[j] = elem;
      }

      json.entries[i] = { index, offset, elements };
    }
    return json;
  },
  code: (stream) => {
    const numberOfEntries = unsigned.read(stream);
    const json = {
      name: 'code',
      entries: new Array(numberOfEntries)
    };

    for (let i = 0; i < numberOfEntries; i++) {
      let bodySize = unsigned.read(stream);
      const endBytes = stream.bytesRead + bodySize;
      // parse locals
      const localCount = unsigned.read(stream);

      const codeBody = {
        locals: new Array(localCount),
        code: []
      };

      for (let q = 0; q < localCount; q++) {
        const local = {};
        local.count = unsigned.read(stream);
        const type = stream.readByte();
        local.type = LANGUAGE_TYPES[type];
        codeBody.locals[q] = local;
      }

      // parse code
      while (stream.bytesRead < endBytes) {
        const op = parseOp(stream);
        codeBody.code.push(op);
      }

      json.entries[i] = codeBody;
    }
    return json;
  },
  /**
   * @param {ReadStream} stream
   * @return {Object}
   */
  data: (stream) => {
    const numberOfEntries = unsigned.read(stream);
    const json = {
      name: 'data',
      entries: new Array(numberOfEntries)
    };

    for (let i = 0; i < numberOfEntries; i++) {
      const entry = {};
      entry.index = unsigned.read(stream);
      entry.offset = typeParsers.initExpr(stream);
      const segmentSize = unsigned.read(stream);
      entry.data = stream.readArray(segmentSize);

      json.entries[i] = entry;
    }
    return json;
  }
};

const parseOp = (stream) => {
  const json = {};
  const op = stream.readByte();
  const fullName = OPCODES[op];
  if (!fullName) return;
  let [type, name] = fullName.split('.');

  if (name === undefined) {
    name = type;
  } else {
    json.return_type = type;
  }

  json.name = name;

  const immediates = OP_IMMEDIATES[name === 'const' ? type : name];
  if (immediates) {
    json.immediates = immediataryParsers[immediates](stream);
  }
  return json;
};

module.exports = (buf) => {
  const stream = new ReadStream(buf);
  const preramble = parsePreramble(stream);
  const json = [preramble];

  while (!stream.end) {
    const header = parseSectionHeader(stream);
    json.push(sectionParsers[header.name](stream, header));
  }
  return json;
};
