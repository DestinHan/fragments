const {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');

const logger = require('../../../logger');
const MemoryDB = require('../memory/memory-db');
const s3 = require('./s3Client');

const BUCKET = process.env.AWS_S3_BUCKET_NAME;

// 메타데이터 저장용 메모리 DB (문자열 직렬화 X: memory/index.js와 호환되게 객체 그대로 저장해도 됨)
const metadata = new MemoryDB();

// --- 메타데이터 ---
async function writeFragment(fragmentMeta) {
  const { ownerId, id } = fragmentMeta;
  return metadata.put(ownerId, id, fragmentMeta);
}

async function readFragment(ownerId, id) {
  return metadata.get(ownerId, id);
}

async function listFragments(ownerId, expand = false) {
  const values = await metadata.query(ownerId);
  if (!Array.isArray(values) || values.length === 0) return [];
  if (expand) return values;
  return values.map((m) => m && m.id).filter(Boolean);
}

// --- 데이터(S3) ---
const keyOf = (ownerId, id) => `${ownerId}/${id}`;

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks);
}

async function writeFragmentData(ownerId, id, buffer) {
  const Key = keyOf(ownerId, id);
  try {
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key, Body: buffer }));
  } catch (err) {
    logger.error({ err, bucket: BUCKET, key: Key }, 'S3 PutObject failed');
    throw new Error('unable to upload fragment data');
  }
}

async function readFragmentData(ownerId, id) {
  const Key = keyOf(ownerId, id);
  try {
    const out = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key }));
    return await streamToBuffer(out.Body);
  } catch (err) {
    // 없거나 권한 문제일 수 있음: 상위에서 404를 내므로 undefined 반환
    logger.warn({ err, bucket: BUCKET, key: Key }, 'S3 GetObject failed');
    return undefined;
  }
}

async function deleteFragment(ownerId, id) {
  // 존재 확인 (라우터에서 이미 404 체크하지만 방어적으로)
  const meta = await readFragment(ownerId, id);
  if (!meta) {
    const e = new Error('not found');
    e.code = 'NotFound';
    throw e;
  }

  const Key = keyOf(ownerId, id);
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key }));
  } catch (err) {
    // 객체 없을 가능성 → 경고만 하고 메타 삭제 계속
    logger.warn({ err, bucket: BUCKET, key: Key }, 'S3 DeleteObject failed (ignored)');
  }

  await metadata.del(ownerId, id);
}

module.exports = {
  writeFragment,
  readFragment,
  listFragments,
  writeFragmentData,
  readFragmentData,
  deleteFragment,
};
