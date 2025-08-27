const express = require('express');
const { protect } = require('../middleware/auth');
const {
  joinQueue,
  getQueueStatus,
  getServiceQueue,
  callNext,
  markServing,
  completeService,
  cancelQueue
} = require('../controllers/queueController');
const validateQueue = require('../middleware/validateQueue');

const router = express.Router();

// Public routes
// Join queue via QR code scan (public)
router.post('/join/:serviceId', validateQueue, joinQueue);

// Get queue status by queue ID (public)
router.get('/status/:queueId', getQueueStatus);

// Protected admin routes
router.use(protect); // All routes below require authentication

// Get service queue list
router.get('/service/:serviceId', getServiceQueue);

// Call next in queue
router.post('/call-next/:serviceId', callNext);

// Mark customer as serving
router.put('/serving/:queueId', markServing);

// Complete service
router.put('/complete/:queueId', completeService);

// Cancel queue entry
router.put('/cancel/:queueId', cancelQueue);

module.exports = router;