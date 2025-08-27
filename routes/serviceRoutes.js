const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getServiceStats
} = require('../controllers/serviceController');
const validateService = require('../middleware/validateService');

const router = express.Router();

// Public routes
// Get all services (public - for QR code scanning)
router.get('/', getAllServices);

// Get service by ID (public - for QR code scanning)
router.get('/:id', getServiceById);

// Protected admin routes
router.use(protect); // All routes below require authentication

// Create new service
router.post('/', validateService, createService);

// Update service
router.put('/:id', validateService, updateService);

// Delete service
router.delete('/:id', deleteService);

// Get service statistics
router.get('/:id/stats', getServiceStats);

module.exports = router;