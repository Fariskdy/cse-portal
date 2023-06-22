const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const User = require('../models/user.model');
const bcrypt = require('bcrypt')

router.get('/', (req, res, next) => {
    res.render('index');
})

router.get('/notifications', (req, res, next) => {
    res.render('notifications');
})
// middleware to attach the user's role to the request object
const attachUserRole = (req, res, next) => {
    if (req.user && req.user.role) {
      // store the user's role as a property of the request object
      req.userRole = req.user.role;
    }
    next();
  };
  
  router.use(attachUserRole);

  router.get('/dashboard', (req, res, next) => {
    const { user } = req;
  
    if (user.role === 'ADMIN') {
      res.render('dashboard/webadm/dashboard');
    } else if (user.role === 'REGION_MANAGER') {
      res.render('dashboard/rm/dashboard');
    } else if (user.role === 'FIELD_COORDINATION_MANAGER') {
      res.render('dashboard/fcm/dashboard');
    } else if (user.role === 'DIRECTOR_OF_PROJECTS') {
      res.render('dashboard/dop/dashboard');
    } else if (user.role === 'ADMINISTRATOR') {
        res.render('dashboard/adm/dashboard');
    } else if (user.role === 'ACCOUNTANT') {
        res.render('dashboard/acc/dashboard');
    } else {
      req.flash('error', 'Access denied');
      res.redirect('/');
    }
  });
  

// Route to display the forgot password page
router.get('/forgot-password', (req, res) => {
  res.render('forgot-password');
});

// Route to handle submission of the forgot password form
router.post('/forgot-password', async (req, res) => {
  try {
    // Generate a random token for the password reset link
    const token = crypto.randomBytes(20).toString('hex');

    // Find the user associated with the email address
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      // If no user is found, redirect back to the forgot password page with an error message
      req.flash('error', 'No account with that email address exists.');
      return res.redirect('/forgot-password');
    }

    // Set the password reset token and expiry time for the user
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    // Save the user with the updated password reset token and expiry time
    await user.save();

    // Create a nodemailer transporter with the SMTP transport
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Create the email message with the reset link
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: 'Password Reset Link',
      text: `You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\nPlease click on the following link, or paste this into your browser to complete the process:\n\n${req.protocol}://${req.headers.host}/reset-password/${token}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.\n`,
    };

    // Send the email with nodemailer
    await transporter.sendMail(mailOptions);

    // Redirect to the login page with a success message
    req.flash('success', 'An email has been sent to you with further instructions.');
    res.redirect('/auth/login');
  } catch (error) {
    console.error(error);
    req.flash('error', 'An error occurred while processing your request.');
    res.redirect('/forgot-password');
  }
});

// Route to display the reset password page
// GET request to display password reset form
router.get('/reset-password/:token', function(req, res) {
  // Find a user with the reset token
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot-password');
    }
    res.render('reset-password', { token: req.params.token });
  });
});

// POST request to handle password reset form submission
router.post('/reset-password/:token', async function(req, res) {
  try {
    const user = await User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } });
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot-password');
    }

    // Hash the new password and save it to the user record
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    // Save the user
    await user.save();

    // Send a confirmation email to the user
    const smtpTransport = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_FROM,
      subject: 'Your password has been changed',
      text: `Hello,\n\nThis is a confirmation that the password for your account ${user.email} has just been changed.\n`,
    };
    await smtpTransport.sendMail(mailOptions);

    req.flash('success', 'Success! Your password has been changed.');
    res.redirect('/auth/login');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Something went wrong. Please try again later.');
    res.redirect('/reset-password');
  }
});

module.exports = router