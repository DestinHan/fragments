// src/model/fragment.js

// Use crypto.randomUUID() to create unique IDs, see:
// https://nodejs.org/api/crypto.html#cryptorandomuuidoptions
const { randomUUID } = require('crypto');
// Use https://www.npmjs.com/package/content-type to create/parse Content-Type headers
const contentType = require('content-type');

// Functions for working with fragment metadata/data using our DB
const {
  readFragment,
  writeFragment,
  readFragmentData,
  writeFragmentData,
  listFragments,
  deleteFragment,
} = require('./data');

const SUPPORTED_TYPES = ['text/plain'];

function normalizeMime(value) {
  // "text/plain; charset=utf-8" -> "text/plain"
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

  /**
   * Get all fragments (id or full) for the given user
   * @param {string} ownerId user's hashed email
   * @param {boolean} expand whether to expand ids to full fragments
   * @returns Promise<Array<Fragment>|Array<string>>
   */
  static async byUser(ownerId, expand = false) {
    const list = await listFragments(ownerId, expand);
    if (expand) {
      return list.map((m) => new Fragment(m));
    }
    return list;
  }

  /**
   * Gets a fragment for the user by the given id.
   * @param {string} ownerId user's hashed email
   * @param {string} id fragment's id
   * @returns Promise<Fragment>
   */
  static async byId(ownerId, id) {
    const meta = await readFragment(ownerId, id);
    if (!meta) {
      throw new Error(`fragment not found: ownerId=${ownerId}, id=${id}`);
    }
    return new Fragment(meta);
  }

  /**
   * Delete the user's fragment data and metadata for the given id
   * @param {string} ownerId user's hashed email
   * @param {string} id fragment's id
   * @returns Promise<void>
   */
  static async delete(ownerId, id) {
    await deleteFragment(ownerId, id);
  }

  /**
   * Saves the current fragment (metadata) to the database
   * @returns Promise<void>
   */
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

  /**
   * Gets the fragment's data from the database
   * @returns Promise<Buffer|undefined>
   */
  getData() {
    return readFragmentData(this.ownerId, this.id);
  }

  /**
   * Set's the fragment's data in the database
   * @param {Buffer} data
   * @returns Promise<void>
   */
  async setData(data) {
    if (!Buffer.isBuffer(data)) {
      throw new Error('setData() requires a Buffer');
    }
    await writeFragmentData(this.ownerId, this.id, data);
    this.size = data.length;
    await this.save();
  }

  /**
   * Returns the mime type (e.g., without encoding) for the fragment's type:
   * "text/html; charset=utf-8" -> "text/html"
   * @returns {string} fragment's mime type (without encoding)
   */
  get mimeType() {
    const { type } = contentType.parse(this.type);
    return type;
  }

  /**
   * Returns true if this fragment is a text/* mime type
   * @returns {boolean} true if fragment's type is text/*
   */
  get isText() {
    return this.mimeType.startsWith('text/');
  }

  /**
   * Returns the formats into which this fragment type can be converted
   * @returns {Array<string>} list of supported mime types
   */
  get formats() {
    return [this.mimeType];
  }

  /**
   * Returns true if we know how to work with this content type
   * @param {string} value a Content-Type value (e.g., 'text/plain' or 'text/plain; charset=utf-8')
   * @returns {boolean} true if we support this Content-Type (i.e., type/subtype)
   */
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
