const express = require('express');
const {
  adminLogin,
  getAdminProfile,
  changePassword,
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
router.put('/change-password', validateAuth.validatePasswordChange, changePassword);
router.post('/logout', adminLogout);

module.exports = router;