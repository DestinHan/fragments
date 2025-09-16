const express = require('express');

const { Fragment } = require('../model/fragment');
const { createSuccessResponse, createErrorResponse } = require('../response');
const hash = require('../hash');

const authenticate = require('../auth/auth-middleware');

const router = express.Router();

const STRATEGY = process.env.AUTH_STRATEGY === 'http' ? 'http' : 'bearer';

const logger = require('../logger'); 

router.use(authenticate(STRATEGY));

router.use('/fragments', express.raw({ type: '*/*', limit: '5mb' }));

function getOwnerId(req) {
  if (req.userId) return req.userId;
  if (typeof req.user === 'string') return hash(req.user);
  if (req.user && req.user.sub) return req.user.sub;
  return null;
}

// POST /v1/fragments
router.post('/fragments', async (req, res, next) => {
  try {
    const ownerId = getOwnerId(req);
    if (!ownerId) {
      return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
    }

    const type = req.headers['content-type'];
    if (!Fragment.isSupportedType(type)) {
      return res.status(415).json(createErrorResponse(415, 'unsupported media type'));
    }
    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).json(createErrorResponse(400, 'invalid body'));
    }

    const frag = new Fragment({ ownerId, type });
    await frag.setData(req.body);

    const base = process.env.API_URL || `${req.protocol}://${req.headers.host}`;
    res.setHeader('Location', `${base}/v1/fragments/${frag.id}`);

    return res.status(201).json(
      createSuccessResponse({
        fragment: {
          id: frag.id,
          ownerId: frag.ownerId,
          created: frag.created,
          updated: frag.updated,
          type: frag.type,
          size: frag.size,
        },
      })
    );
  } catch (err) {
    next(err);
  }
});

// GET /v1/fragments
router.get('/fragments', async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    if (!ownerId) {
      return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
    }

    const expand = req.query.expand === '1';
    const result = await Fragment.byUser(ownerId, expand);
    return res.status(200).json(createSuccessResponse({ fragments: result }));
  } catch {
    return res.status(500).json(createErrorResponse(500, 'unable to process request'));
  }
});

// GET /v1/fragments/:id
router.get('/fragments/:id', async (req, res) => {
  const ownerId = getOwnerId(req);
  const { id } = req.params;

  try {
    const frag = await Fragment.byId(ownerId, id);
    const data = await frag.getData();
    if (!data) {
      return res.status(404).json(createErrorResponse(404, 'not found'));
    }
    res.setHeader('Content-Type', frag.type);
    return res.status(200).send(data);
  } catch {
    return res.status(404).json(createErrorResponse(404, 'not found'));
  }
});

// GET /v1/fragments/:id/info
router.get('/fragments/:id/info', async (req, res) => {
  const ownerId = getOwnerId(req);
  const { id } = req.params;

  try {
    const frag = await Fragment.byId(ownerId, id);
    return res.status(200).json(
      createSuccessResponse({
        fragment: {
          id: frag.id,
          ownerId: frag.ownerId,
          created: frag.created,
          updated: frag.updated,
          type: frag.type,
          size: frag.size,
        },
      })
    );
  } catch {
    return res.status(404).json(createErrorResponse(404, 'not found'));
  }
});

// DELETE /v1/fragments/:id
router.delete('/fragments/:id', async (req, res) => {
  const ownerId = getOwnerId(req);
  const { id } = req.params;

  try {
    await Fragment.byId(ownerId, id);
  } catch {
    return res.status(404).json(createErrorResponse(404, 'not found'));
  }

  try {
    await Fragment.delete(ownerId, id);
  } catch (err) {
    logger.warn({ err, ownerId, id }, 'delete threw but resource existed; returning 200'); // ✅ e 사용
  }

  return res.status(200).json(createSuccessResponse());
});


module.exports = router;
