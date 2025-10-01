const { randomUUID } = require('crypto');
const contentType = require('content-type');

const {
  readFragment,
  writeFragment,
  readFragmentData,
  writeFragmentData,
  listFragments,
  deleteFragment,
} = require('./data');

const SUPPORTED_TYPES = ['text/plain', 'text/markdown', 'application/json'];

function normalizeMime(value) {
  const { type } = contentType.parse(value);
  return type;
}

class Fragment {
  constructor({ id, ownerId, created, updated, type, size = 0 }) {
    if (!ownerId) throw new Error('ownerId is required');
    if (!type) throw new Error('type is required');

    const mime = normalizeMime(type);
    if (!Fragment.isSupportedType(mime)) {
      throw new Error(`unsupported type: ${mime}`);
    }

    if (typeof size !== 'number' || Number.isNaN(size) || size < 0) {
      throw new Error('size must be a non-negative number');
    }

    const now = new Date().toISOString();

    this.id = id || randomUUID();
    this.ownerId = ownerId;
    this.type = type;
    this.size = size;
    this.created = created || now;
    this.updated = updated || now;
  }

  static async byUser(ownerId, expand = false) {
    const list = await listFragments(ownerId, expand);
    if (expand) return list.map((m) => new Fragment(m));
    return list;
  }
  static async byId(ownerId, id) {
    const meta = await readFragment(ownerId, id);
    if (!meta) {
      throw new Error(`fragment not found: ownerId=${ownerId}, id=${id}`);
    }
    return new Fragment(meta);
  }

  static async delete(ownerId, id) {
    await deleteFragment(ownerId, id);
  }

  async save() {
    this.updated = new Date().toISOString();
    const meta = {
      id: this.id,
      ownerId: this.ownerId,
      created: this.created,
      updated: this.updated,
      type: this.type,
      size: this.size,
    };
    await writeFragment(meta);
  }

  getData() {
    return readFragmentData(this.ownerId, this.id);
  }

  async setData(data) {
    if (!Buffer.isBuffer(data)) throw new Error('setData() requires a Buffer');
    await writeFragmentData(this.ownerId, this.id, data);
    this.size = data.length;
    await this.save();
  }

  get mimeType() {
    return normalizeMime(this.type);
  }

  get isText() {
    return this.mimeType.startsWith('text/');
  }

  get formats() {
    if (this.mimeType === 'text/markdown') {
      return ['text/markdown', 'text/html', 'text/plain'];
    }
    return [this.mimeType];
  }

  static isSupportedType(value) {
    try {
      const mime = normalizeMime(value);
      return SUPPORTED_TYPES.includes(mime);
    } catch {
      return false;
    }
  }
}

module.exports.Fragment = Fragment;
