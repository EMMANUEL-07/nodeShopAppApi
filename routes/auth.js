const express = require("express")
const { check, body } = require('express-validator')

const router = express.Router()

const authController = require('../controllers/auth')
const user = require("../models/user")

router.put(
   '/signup',
   [
      body('email')
         .isEmail()
         .withMessage('Please enter a valid email')
         .custom((value, { req }) => {
            return user.findOne({ email: value })
               .then(userDoc => {
                  if (userDoc) {
                     return Promise.reject('E-mail address exist');
                  }
               })
         }).normalizeEmail(),
      body('password')
         .trim()
         .isLength({ min: 5 }),
      body('name')
         .trim()
         .not()
         .isEmpty()
   ],
   authController.signUp
)

router.post('/login', authController.login)

module.exports = router