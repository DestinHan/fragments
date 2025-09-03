const express = require('express');
const { Fragment } = require('../model/fragment');
const authenticate = require('../auth/auth-middleware');

const router = express.Router();

router.use(authenticate);

router.use('/fragments', express.raw({ type: '*/*', limit: '5mb' }));

router.post('/fragments', async (req, res, next) => {
  try {
    const ownerId = req.user;
    const type = req.headers['content-type'];

    if (!Fragment.isSupportedType(type)) {
      return res.status(415).json({
        status: 'error',
        error: { message: 'unsupported media type', code: 415 },
      });
    }
    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).json({
        status: 'error',
        error: { message: 'invalid body', code: 400 },
      });
    }

    const frag = new Fragment({ ownerId, type });
    await frag.setData(req.body);

    const base = process.env.API_URL || `${req.protocol}://${req.headers.host}`;
    res.setHeader('Location', `${base}/v1/fragments/${frag.id}`);

    return res.status(201).json({
      status: 'ok',
      fragment: {
        id: frag.id,
        ownerId: frag.ownerId,
        created: frag.created,
        updated: frag.updated,
        type: frag.type,
        size: frag.size,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/fragments', async (req, res, next) => {
  try {
    const ownerId = req.user;
    const expand = req.query.expand === '1';
    const result = await Fragment.byUser(ownerId, expand);
    return res.status(200).json({ status: 'ok', fragments: result });
  } catch (err) {
    next(err);
  }
});

router.get('/fragments/:id', async (req, res, next) => {
  try {
    const ownerId = req.user;
    const { id } = req.params;

    const frag = await Fragment.byId(ownerId, id);
    const data = await frag.getData();
    if (!data) {
      return res.status(404).json({
        status: 'error',
        error: { message: 'not found', code: 404 },
      });
    }
    res.setHeader('Content-Type', frag.type);
    return res.status(200).send(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
