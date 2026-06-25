'use strict';

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');

// Every admin route requires a valid JWT access token.
router.use(requireAuth);

router.use('/products', require('./products'));
router.use('/services', require('./services'));
router.use('/categories', require('./categories'));
router.use('/cities', require('./cities'));
router.use('/regions', require('./regions'));
router.use('/sections', require('./sections'));
router.use('/settings', require('./settings'));
router.use('/media', require('./media'));
router.use('/inquiries', require('./inquiries'));
router.use('/dashboard', require('./dashboard'));
router.use('/audit', require('./audit'));
router.use('/backup', require('./backup'));

module.exports = router;
