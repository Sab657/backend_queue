const express = require('express');
const {
  adminLogin,
  getAdminProfile,
  adminLogout
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validateAuth = require('../middleware/validateAuth');

const router = express.Router();

// Public routes
router.post('/login', validateAuth.validateLogin, adminLogin);

// Protected routes
router.use(protect); // All routes below this middleware are protected

router.get('/profile', getAdminProfile);
router.post('/logout', adminLogout);

module.exports = router;