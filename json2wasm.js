const unsigned = require('./unsigned');
const signed = require('./signed');
const { WriteStream } = require('./stream');
const OP_IMMEDIATES = require('./immediates.json');

// https://github.com/WebAssembly/design/blob/master/BinaryEncoding.md#language-types
// All types are distinguished by a negative varint7 values that is the first
// byte of their encoding (representing a type constructor)
const LANGUAGE_TYPES = {
  i32: 0x7f,
  i64: 0x7e,
  f32: 0x7d,
  f64: 0x7c,
  anyFunc: 0x70,
  func: 0x60,
  block_type: 0x40
};

// https://github.com/WebAssembly/design/blob/master/BinaryEncoding.md#external_kind
// A single-byte unsigned integer indicating the kind of definition being imported or defined:
const EXTERNAL_KIND = {
  function: 0,
  table: 1,
  memory: 2,
  global: 3
};

const SECTION_IDS = {
  custom: 0,
  type: 1,
  import: 2,
  function: 3,
  table: 4,
  memory: 5,
  global: 6,
  export: 7,
  start: 8,
  element: 9,
  code: 10,
  data: 11
};

const OPCODES = {
  unreachable: 0x0,
  nop: 0x1,
  block: 0x2,
  loop: 0x3,
  if: 0x4,
  else: 0x5,
  end: 0xb,
  br: 0xc,
  br_if: 0xd,
  br_table: 0xe,
  return: 0xf,
  call: 0x10,
  call_indirect: 0x11,
  drop: 0x1a,
  select: 0x1b,
  get_local: 0x20,
  set_local: 0x21,
  tee_local: 0x22,
  get_global: 0x23,
  set_global: 0x24,
  'i32.load': 0x28,
  'i64.load': 0x29,
  'f32.load': 0x2a,
  'f64.load': 0x2b,
  'i32.load8_s': 0x2c,
  'i32.load8_u': 0x2d,
  'i32.load16_s': 0x2e,
  'i32.load16_u': 0x2f,
  'i64.load8_s': 0x30,
  'i64.load8_u': 0x31,
  'i64.load16_s': 0x32,
  'i64.load16_u': 0x33,
  'i64.load32_s': 0x34,
  'i64.load32_u': 0x35,
  'i32.store': 0x36,
  'i64.store': 0x37,
  'f32.store': 0x38,
  'f64.store': 0x39,
  'i32.store8': 0x3a,
  'i32.store16': 0x3b,
  'i64.store8': 0x3c,
  'i64.store16': 0x3d,
  'i64.store32': 0x3e,
  current_memory: 0x3f,
  grow_memory: 0x40,
  'i32.const': 0x41,
  'i64.const': 0x42,
  'f32.const': 0x43,
  'f64.const': 0x44,
  'i32.eqz': 0x45,
  'i32.eq': 0x46,
  'i32.ne': 0x47,
  'i32.lt_s': 0x48,
  'i32.lt_u': 0x49,
  'i32.gt_s': 0x4a,
  'i32.gt_u': 0x4b,
  'i32.le_s': 0x4c,
  'i32.le_u': 0x4d,
  'i32.ge_s': 0x4e,
  'i32.ge_u': 0x4f,
  'i64.eqz': 0x50,
  'i64.eq': 0x51,
  'i64.ne': 0x52,
  'i64.lt_s': 0x53,
  'i64.lt_u': 0x54,
  'i64.gt_s': 0x55,
  'i64.gt_u': 0x56,
  'i64.le_s': 0x57,
  'i64.le_u': 0x58,
  'i64.ge_s': 0x59,
  'i64.ge_u': 0x5a,
  'f32.eq': 0x5b,
  'f32.ne': 0x5c,
  'f32.lt': 0x5d,
  'f32.gt': 0x5e,
  'f32.le': 0x5f,
  'f32.ge': 0x60,
  'f64.eq': 0x61,
  'f64.ne': 0x62,
  'f64.lt': 0x63,
  'f64.gt': 0x64,
  'f64.le': 0x65,
  'f64.ge': 0x66,
  'i32.clz': 0x67,
  'i32.ctz': 0x68,
  'i32.popcnt': 0x69,
  'i32.add': 0x6a,
  'i32.sub': 0x6b,
  'i32.mul': 0x6c,
  'i32.div_s': 0x6d,
  'i32.div_u': 0x6e,
  'i32.rem_s': 0x6f,
  'i32.rem_u': 0x70,
  'i32.and': 0x71,
  'i32.or': 0x72,
  'i32.xor': 0x73,
  'i32.shl': 0x74,
  'i32.shr_s': 0x75,
  'i32.shr_u': 0x76,
  'i32.rotl': 0x77,
  'i32.rotr': 0x78,
  'i64.clz': 0x79,
  'i64.ctz': 0x7a,
  'i64.popcnt': 0x7b,
  'i64.add': 0x7c,
  'i64.sub': 0x7d,
  'i64.mul': 0x7e,
  'i64.div_s': 0x7f,
  'i64.div_u': 0x80,
  'i64.rem_s': 0x81,
  'i64.rem_u': 0x82,
  'i64.and': 0x83,
  'i64.or': 0x84,
  'i64.xor': 0x85,
  'i64.shl': 0x86,
  'i64.shr_s': 0x87,
  'i64.shr_u': 0x88,
  'i64.rotl': 0x89,
  'i64.rotr': 0x8a,
  'f32.abs': 0x8b,
  'f32.neg': 0x8c,
  'f32.ceil': 0x8d,
  'f32.floor': 0x8e,
  'f32.trunc': 0x8f,
  'f32.nearest': 0x90,
  'f32.sqrt': 0x91,
  'f32.add': 0x92,
  'f32.sub': 0x93,
  'f32.mul': 0x94,
  'f32.div': 0x95,
  'f32.min': 0x96,
  'f32.max': 0x97,
  'f32.copysign': 0x98,
  'f64.abs': 0x99,
  'f64.neg': 0x9a,
  'f64.ceil': 0x9b,
  'f64.floor': 0x9c,
  'f64.trunc': 0x9d,
  'f64.nearest': 0x9e,
  'f64.sqrt': 0x9f,
  'f64.add': 0xa0,
  'f64.sub': 0xa1,
  'f64.mul': 0xa2,
  'f64.div': 0xa3,
  'f64.min': 0xa4,
  'f64.max': 0xa5,
  'f64.copysign': 0xa6,
  'i32.wrap/i64': 0xa7,
  'i32.trunc_s/f32': 0xa8,
  'i32.trunc_u/f32': 0xa9,
  'i32.trunc_s/f64': 0xaa,
  'i32.trunc_u/f64': 0xab,
  'i64.extend_s/i32': 0xac,
  'i64.extend_u/i32': 0xad,
  'i64.trunc_s/f32': 0xae,
  'i64.trunc_u/f32': 0xaf,
  'i64.trunc_s/f64': 0xb0,
  'i64.trunc_u/f64': 0xb1,
  'f32.convert_s/i32': 0xb2,
  'f32.convert_u/i32': 0xb3,
  'f32.convert_s/i64': 0xb4,
  'f32.convert_u/i64': 0xb5,
  'f32.demote/f64': 0xb6,
  'f64.convert_s/i32': 0xb7,
  'f64.convert_u/i32': 0xb8,
  'f64.convert_s/i64': 0xb9,
  'f64.convert_u/i64': 0xba,
  'f64.promote/f32': 0xbb,
  'i32.reinterpret/f32': 0xbc,
  'i64.reinterpret/f64': 0xbd,
  'f32.reinterpret/i32': 0xbe,
  'f64.reinterpret/i64': 0xbf,
  'i32.extend8_s': 0xc0,
  'i32.extend16_s': 0xc1,
  'i64.extend8_s': 0xc2,
  'i64.extend16_s': 0xc3,
  'i64.extend32_s': 0xc4
};

const typeGenerators = {
  function: (json, stream) => {
    unsigned.write(json, stream);
  },
  table: (json, stream) => {
    stream.writeByte(LANGUAGE_TYPES[json.elementType]);
    typeGenerators.memory(json.limits, stream);
  },
  /**
   * generates a [`global_type`](https://github.com/WebAssembly/design/blob/master/BinaryEncoding.md#global_type)
   */
  global: (json, stream) => {
    stream.writeByte(LANGUAGE_TYPES[json.contentType]);
    stream.writeByte(json.mutability);
  },
  /**
   * Generates a [resizable_limits](https://github.com/WebAssembly/design/blob/master/BinaryEncoding.md#resizable_limits)
   * @param {Object} json
   * @param {Stream} stream
   */
  memory: (json, stream) => {
    unsigned.write(Number(json.maximum !== undefined), stream); // the flags
    unsigned.write(json.intial, stream);

    if (json.maximum !== undefined) {
      unsigned.write(json.maximum, stream);
    }
  },
  /**
   * Generates a [init_expr](https://github.com/WebAssembly/design/blob/master/BinaryEncoding.md#resizable_limits)
   * The encoding of an initializer expression is the normal encoding of the
   * expression followed by the end opcode as a delimiter.
   */
  initExpr: (json, stream) => {
    generateOp(json, stream);
    generateOp({ name: 'end', type: 'void' }, stream);
  }
};

const immediataryGenerators = {
  varuint1: (json, stream) => {
    stream.writeByte(json);
  },
  varuint32: (json, stream) => {
    unsigned.write(json, stream);
  },
  varint32: (json, stream) => {
    signed.write(json, stream);
  },
  varint64: (json, stream) => {
    signed.write(json, stream);
  },
  uint32: (json, stream) => {
    stream.writeArray(json);
  },
  uint64: (json, stream) => {
    stream.writeArray(json);
  },
  block_type: (json, stream) => {
    stream.writeByte(LANGUAGE_TYPES[json]);
  },
  br_table: (json, stream) => {
    unsigned.write(json.targets.length, stream);
    for (let target of json.targets) {
      unsigned.write(target, stream);
    }
    unsigned.write(json.defaultTarget, stream);
  },
  call_indirect: (json, stream) => {
    unsigned.write(json.index, stream);
    stream.writeByte(json.reserved);
  },
  memory_immediate: (json, stream) => {
    unsigned.write(json.flags, stream);
    unsigned.write(json.offset, stream);
  }
};

const entryGenerators = {
  type: (entry, stream) => {
    // a single type entry binary encoded
    stream.writeByte(LANGUAGE_TYPES[entry.form]); // the form

    const len = entry.params.length; // number of parameters
    unsigned.write(len, stream);
    if (len !== 0) {
      stream.writeArray(entry.params.map((type) => LANGUAGE_TYPES[type])); // the paramter types
    }

    stream.writeByte(entry.return_type ? 1 : 0); // number of return types

    if (entry.return_type) {
      stream.writeByte(LANGUAGE_TYPES[entry.return_type]);
    }
  },
  import: (entry, stream) => {
    // write the module string
    unsigned.write(entry.moduleStr.length, stream);
    stream.writeString(entry.moduleStr);
    // write the field string
    unsigned.write(entry.fieldStr.length, stream);
    stream.writeString(entry.fieldStr);
    stream.writeByte(EXTERNAL_KIND[entry.kind]);
    typeGenerators[entry.kind](entry.type, stream);
  },
  function: (entry, stream) => {
    unsigned.write(entry, stream);
  },
  table: typeGenerators.table,
  global: (entry, stream) => {
    typeGenerators.global(entry.type, stream);
    typeGenerators.initExpr(entry.init, stream);
  },
  memory: typeGenerators.memory,
  export: (entry, stream) => {
    unsigned.write(entry.field_str.length, stream);
    stream.writeString(entry.field_str);
    stream.writeByte(EXTERNAL_KIND[entry.kind]);
    unsigned.write(entry.index, stream);
  },
  element: (entry, stream) => {
    unsigned.write(entry.index, stream);
    typeGenerators.initExpr(entry.offset, stream);
    unsigned.write(entry.elements.length, stream);
    for (let elem of entry.elements) {
      unsigned.write(elem, stream);
    }
  },
  code: (entry, stream) => {
    // 4 bytes for store length, so use the same allocated memory
    const codeStream = stream.substream(4);

    // write the locals
    unsigned.write(entry.locals.length, codeStream);
    for (let local of entry.locals) {
      unsigned.write(local.count, codeStream);
      codeStream.writeByte(LANGUAGE_TYPES[local.type]);
    }
    // write opcode
    for (let op of entry.code) {
      generateOp(op, codeStream);
    }

    unsigned.write(codeStream.bytesWrote, stream);
    stream.write(codeStream.buffer);
  },
  data: (entry, stream) => {
    unsigned.write(entry.index, stream);
    typeGenerators.initExpr(entry.offset, stream);
    unsigned.write(entry.data.length, stream);
    stream.writeArray(entry.data);
  }
};

const generateSection = function (json, stream) {
  const name = json.name;
  // 4 bytes for store length, so use the same allocated memory
  const payload = stream.substream(4);
  stream.writeByte(SECTION_IDS[name]);

  if (name === 'custom') {
    unsigned.write(json.sectionName.length, payload);
    payload.writeString(json.sectionName);
    payload.writeArray(json.payload);
  } else if (name === 'start') {
    unsigned.write(json.index, payload);
  } else {
    unsigned.write(json.entries.length, payload);
    for (let entry of json.entries) {
      entryGenerators[name](entry, payload);
    }
  }
  // write the size of the payload
  unsigned.write(payload.bytesWrote, stream);
  stream.write(payload.buffer);
};

const generatePreramble = (json, stream) => {
  stream.writeArray(json.magic);
  stream.writeArray(json.version);
};

const generateOp = (json, stream) => {
  let name = json.name;
  if (json.return_type !== undefined) {
    name = json.return_type + '.' + name;
  }

  stream.writeByte(OPCODES[name]);

  const immediates = OP_IMMEDIATES[json.name === 'const' ? json.return_type : json.name];
  if (immediates) {
    immediataryGenerators[immediates](json.immediates, stream);
  }
};

module.exports = (json, size) => {
  const stream = new WriteStream(size);
  const [preamble, ...rest] = json;
  generatePreramble(preamble, stream);
  for (let item of rest) {
    generateSection(item, stream);
  }

  return stream.buffer;
};

module.exports.SECTION_IDS = SECTION_IDS;
