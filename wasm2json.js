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
const EXTERNAL_KIND = {
  0: 'function',
  1: 'table',
  2: 'memory',
  3: 'global'
};

const parsePreramble = (stream) => {
  const obj = {};
  obj.name = 'preramble';
  obj.magic = [...stream.read(4)];
  obj.version = [...stream.read(4)];
  return obj;
};

const parseSectionHeader = (stream) => {
  const id = stream.readByte();
  const size = unsigned.read(stream);
  return {
    id,
    name: SECTION_IDS[id],
    size
  };
};

const OPCODES = {
  // flow control
  0x0: 'unreachable',
  0x1: 'nop',
  0x2: 'block',
  0x3: 'loop',
  0x4: 'if',
  0x5: 'else',
  0xb: 'end',
  0xc: 'br',
  0xd: 'br_if',
  0xe: 'br_table',
  0xf: 'return',

  // calls
  0x10: 'call',
  0x11: 'call_indirect',

  // Parametric operators
  0x1a: 'drop',
  0x1b: 'select',

  // Varibale access
  0x20: 'get_local',
  0x21: 'set_local',
  0x22: 'tee_local',
  0x23: 'get_global',
  0x24: 'set_global',

  // Memory-related operators
  0x28: 'i32.load',
  0x29: 'i64.load',
  0x2a: 'f32.load',
  0x2b: 'f64.load',
  0x2c: 'i32.load8_s',
  0x2d: 'i32.load8_u',
  0x2e: 'i32.load16_s',
  0x2f: 'i32.load16_u',
  0x30: 'i64.load8_s',
  0x31: 'i64.load8_u',
  0x32: 'i64.load16_s',
  0x33: 'i64.load16_u',
  0x34: 'i64.load32_s',
  0x35: 'i64.load32_u',
  0x36: 'i32.store',
  0x37: 'i64.store',
  0x38: 'f32.store',
  0x39: 'f64.store',
  0x3a: 'i32.store8',
  0x3b: 'i32.store16',
  0x3c: 'i64.store8',
  0x3d: 'i64.store16',
  0x3e: 'i64.store32',
  0x3f: 'current_memory',
  0x40: 'grow_memory',

  // Constants
  0x41: 'i32.const',
  0x42: 'i64.const',
  0x43: 'f32.const',
  0x44: 'f64.const',

  // Comparison operators
  0x45: 'i32.eqz',
  0x46: 'i32.eq',
  0x47: 'i32.ne',
  0x48: 'i32.lt_s',
  0x49: 'i32.lt_u',
  0x4a: 'i32.gt_s',
  0x4b: 'i32.gt_u',
  0x4c: 'i32.le_s',
  0x4d: 'i32.le_u',
  0x4e: 'i32.ge_s',
  0x4f: 'i32.ge_u',
  0x50: 'i64.eqz',
  0x51: 'i64.eq',
  0x52: 'i64.ne',
  0x53: 'i64.lt_s',
  0x54: 'i64.lt_u',
  0x55: 'i64.gt_s',
  0x56: 'i64.gt_u',
  0x57: 'i64.le_s',
  0x58: 'i64.le_u',
  0x59: 'i64.ge_s',
  0x5a: 'i64.ge_u',
  0x5b: 'f32.eq',
  0x5c: 'f32.ne',
  0x5d: 'f32.lt',
  0x5e: 'f32.gt',
  0x5f: 'f32.le',
  0x60: 'f32.ge',
  0x61: 'f64.eq',
  0x62: 'f64.ne',
  0x63: 'f64.lt',
  0x64: 'f64.gt',
  0x65: 'f64.le',
  0x66: 'f64.ge',

  // Numeric operators
  0x67: 'i32.clz',
  0x68: 'i32.ctz',
  0x69: 'i32.popcnt',
  0x6a: 'i32.add',
  0x6b: 'i32.sub',
  0x6c: 'i32.mul',
  0x6d: 'i32.div_s',
  0x6e: 'i32.div_u',
  0x6f: 'i32.rem_s',
  0x70: 'i32.rem_u',
  0x71: 'i32.and',
  0x72: 'i32.or',
  0x73: 'i32.xor',
  0x74: 'i32.shl',
  0x75: 'i32.shr_s',
  0x76: 'i32.shr_u',
  0x77: 'i32.rotl',
  0x78: 'i32.rotr',
  0x79: 'i64.clz',
  0x7a: 'i64.ctz',
  0x7b: 'i64.popcnt',
  0x7c: 'i64.add',
  0x7d: 'i64.sub',
  0x7e: 'i64.mul',
  0x7f: 'i64.div_s',
  0x80: 'i64.div_u',
  0x81: 'i64.rem_s',
  0x82: 'i64.rem_u',
  0x83: 'i64.and',
  0x84: 'i64.or',
  0x85: 'i64.xor',
  0x86: 'i64.shl',
  0x87: 'i64.shr_s',
  0x88: 'i64.shr_u',
  0x89: 'i64.rotl',
  0x8a: 'i64.rotr',
  0x8b: 'f32.abs',
  0x8c: 'f32.neg',
  0x8d: 'f32.ceil',
  0x8e: 'f32.floor',
  0x8f: 'f32.trunc',
  0x90: 'f32.nearest',
  0x91: 'f32.sqrt',
  0x92: 'f32.add',
  0x93: 'f32.sub',
  0x94: 'f32.mul',
  0x95: 'f32.div',
  0x96: 'f32.min',
  0x97: 'f32.max',
  0x98: 'f32.copysign',
  0x99: 'f64.abs',
  0x9a: 'f64.neg',
  0x9b: 'f64.ceil',
  0x9c: 'f64.floor',
  0x9d: 'f64.trunc',
  0x9e: 'f64.nearest',
  0x9f: 'f64.sqrt',
  0xa0: 'f64.add',
  0xa1: 'f64.sub',
  0xa2: 'f64.mul',
  0xa3: 'f64.div',
  0xa4: 'f64.min',
  0xa5: 'f64.max',
  0xa6: 'f64.copysign',

  // Conversions
  0xa7: 'i32.wrap/i64',
  0xa8: 'i32.trunc_s/f32',
  0xa9: 'i32.trunc_u/f32',
  0xaa: 'i32.trunc_s/f64',
  0xab: 'i32.trunc_u/f64',
  0xac: 'i64.extend_s/i32',
  0xad: 'i64.extend_u/i32',
  0xae: 'i64.trunc_s/f32',
  0xaf: 'i64.trunc_u/f32',
  0xb0: 'i64.trunc_s/f64',
  0xb1: 'i64.trunc_u/f64',
  0xb2: 'f32.convert_s/i32',
  0xb3: 'f32.convert_u/i32',
  0xb4: 'f32.convert_s/i64',
  0xb5: 'f32.convert_u/i64',
  0xb6: 'f32.demote/f64',
  0xb7: 'f64.convert_s/i32',
  0xb8: 'f64.convert_u/i32',
  0xb9: 'f64.convert_s/i64',
  0xba: 'f64.convert_u/i64',
  0xbb: 'f64.promote/f32',

  // Reinterpretations
  0xbc: 'i32.reinterpret/f32',
  0xbd: 'i64.reinterpret/f64',
  0xbe: 'f32.reinterpret/i32',
  0xbf: 'f64.reinterpret/i64',

  // Narrow-Width Integer Sign Extension
  0xc0: 'i32.extend8_s',
  0xc1: 'i32.extend16_s',
  0xc2: 'i64.extend8_s',
  0xc3: 'i64.extend16_s',
  0xc4: 'i64.extend32_s'
};

const SECTION_IDS = {
  0: 'custom',
  1: 'type',
  2: 'import',
  3: 'function',
  4: 'table',
  5: 'memory',
  6: 'global',
  7: 'export',
  8: 'start',
  9: 'element',
  10: 'code',
  11: 'data'
};

const immediataryParsers = {
  varuint1: (stream) => {
    return stream.readByte();
  },
  varuint32: (stream) => {
    const int32 = unsigned.read(stream);
    return int32;
  },
  varint32: (stream) => {
    const int32 = signed.read(stream);
    return int32;
  },
  varint64: (stream) => {
    const int64 = signed.read(stream);
    return int64;
  },
  uint32: (stream) => {
    return [...stream.read(4)];
  },
  uint64: (stream) => {
    return [...stream.read(8)];
  },
  block_type: (stream) => {
    const type = stream.readByte();
    return LANGUAGE_TYPES[type];
  },
  br_table: (stream) => {
    const json = {
      targets: []
    };
    const num = unsigned.read(stream);
    for (let i = 0; i < num; i++) {
      const target = unsigned.read(stream);
      json.targets.push(target);
    }
    json.defaultTarget = unsigned.read(stream);
    return json;
  },
  call_indirect: (stream) => {
    const json = {};
    json.index = unsigned.read(stream);
    json.reserved = stream.readByte();
    return json;
  },
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
    const nameLen = unsigned.readBn(section).toNumber();
    const name = section.read(nameLen);
    json.sectionName = name.toString();
    json.payload = [...section.buffer];
    return json;
  },
  type: (stream) => {
    const numberOfEntries = unsigned.read(stream);
    const json = {
      name: 'type',
      entries: []
    };

    for (let i = 0; i < numberOfEntries; i++) {
      let type = stream.readByte();
      const entry = {
        form: LANGUAGE_TYPES[type],
        params: []
      };

      const paramCount = unsigned.read(stream);

      // parse the entries
      for (let q = 0; q < paramCount; q++) {
        const type = stream.readByte();
        entry.params.push(LANGUAGE_TYPES[type]);
      }
      const numOfReturns = unsigned.read(stream);
      if (numOfReturns) {
        type = stream.readByte();
        entry.return_type = LANGUAGE_TYPES[type];
      }

      json.entries.push(entry);
    }
    return json;
  },
  import: (stream) => {
    const numberOfEntries = unsigned.read(stream);
    const json = {
      name: 'import',
      entries: []
    };

    for (let i = 0; i < numberOfEntries; i++) {
      const entry = {};
      const moduleLen = unsigned.read(stream);
      entry.moduleStr = stream.read(moduleLen).toString();

      const fieldLen = unsigned.read(stream);
      entry.fieldStr = stream.read(fieldLen).toString();
      const kind = stream.readByte(); // read single byte
      entry.kind = EXTERNAL_KIND[kind];
      entry.type = typeParsers[entry.kind](stream);

      json.entries.push(entry);
    }
    return json;
  },
  function: (stream) => {
    const numberOfEntries = unsigned.read(stream);
    const json = {
      name: 'function',
      entries: []
    };

    for (let i = 0; i < numberOfEntries; i++) {
      const entry = unsigned.read(stream);
      json.entries.push(entry);
    }
    return json;
  },
  table: (stream) => {
    const numberOfEntries = unsigned.read(stream);
    const json = {
      name: 'table',
      entries: []
    };

    // parse table_type
    for (let i = 0; i < numberOfEntries; i++) {
      const entry = typeParsers.table(stream);
      json.entries.push(entry);
    }
    return json;
  },
  memory: (stream) => {
    const numberOfEntries = unsigned.read(stream);
    const json = {
      name: 'memory',
      entries: []
    };

    for (let i = 0; i < numberOfEntries; i++) {
      const entry = typeParsers.memory(stream);
      json.entries.push(entry);
    }
    return json;
  },
  global: (stream) => {
    const numberOfEntries = unsigned.read(stream);
    const json = {
      name: 'global',
      entries: []
    };

    for (let i = 0; i < numberOfEntries; i++) {
      const entry = {};
      entry.type = typeParsers.global(stream);
      entry.init = typeParsers.initExpr(stream);

      json.entries.push(entry);
    }
    return json;
  },
  export: (stream) => {
    const numberOfEntries = unsigned.read(stream);
    const json = {
      name: 'export',
      entries: []
    };

    for (let i = 0; i < numberOfEntries; i++) {
      const strLength = unsigned.read(stream);
      const entry = {};
      entry.field_str = stream.read(strLength).toString();
      const kind = stream.readByte();
      entry.kind = EXTERNAL_KIND[kind];
      entry.index = unsigned.read(stream);
      json.entries.push(entry);
    }
    return json;
  },
  start: (stream) => {
    const json = {
      name: 'start'
    };

    json.index = unsigned.read(stream);
    return json;
  },
  element: (stream) => {
    const numberOfEntries = unsigned.read(stream);
    const json = {
      name: 'element',
      entries: []
    };

    for (let i = 0; i < numberOfEntries; i++) {
      const entry = {
        elements: []
      };

      entry.index = unsigned.read(stream);
      entry.offset = typeParsers.initExpr(stream);
      const numElem = unsigned.read(stream);
      for (let i = 0; i < numElem; i++) {
        const elem = unsigned.read(stream);
        entry.elements.push(elem);
      }

      json.entries.push(entry);
    }
    return json;
  },
  code: (stream) => {
    const numberOfEntries = unsigned.read(stream);
    const json = {
      name: 'code',
      entries: []
    };

    for (let i = 0; i < numberOfEntries; i++) {
      const codeBody = {
        locals: [],
        code: []
      };

      let bodySize = unsigned.read(stream);
      const endBytes = stream.bytesRead + bodySize;
      // parse locals
      const localCount = unsigned.read(stream);

      for (let q = 0; q < localCount; q++) {
        const local = {};
        local.count = unsigned.read(stream);
        const type = stream.readByte();
        local.type = LANGUAGE_TYPES[type];
        codeBody.locals.push(local);
      }

      // parse code
      while (stream.bytesRead < endBytes) {
        const op = parseOp(stream);
        codeBody.code.push(op);
      }

      json.entries.push(codeBody);
    }
    return json;
  },
  data: (stream) => {
    const numberOfEntries = unsigned.read(stream);
    const json = {
      name: 'data',
      entries: []
    };

    for (let i = 0; i < numberOfEntries; i++) {
      const entry = {};
      entry.index = unsigned.read(stream);
      entry.offset = typeParsers.initExpr(stream);
      const segmentSize = unsigned.read(stream);
      entry.data = [...stream.read(segmentSize)];

      json.entries.push(entry);
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
