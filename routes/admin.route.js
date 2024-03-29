const User = require('../models/user.model')
const router = require('express').Router();
const mongoose = require('mongoose');
const {roles} = require('../utils/constants')
router.get('/users', async (req, res, next) => {
    try {
        const users = await User.find();
        // res.send(users)
        res.render('dashboard/webadm/manage-users', { users })
    } catch (error) {
        next(error)
    }
})
//user profiles
router.get('/user/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            req.flash('error', 'Invalid Id');
            res.redirect('/admin/users');
            return;
        }
        const person = await User.findById(id);
        res.render('profile', { person })
    } catch (error) {
        next(error)
    }
})
// update roles
router.post('/update-role', async(req, res, next) => {
    const { id, role } = req.body;
    if (!id || !role) {
        req.flash('error', 'Invalid Request');
        return res.redirect('back')
    }
    //check for valid mongoose object id
    if (!mongoose.Types.ObjectId.isValid(id)) {
        req.flash('error', 'Invalid Id');
        return res.redirect('back')
    }
    //check for valid roles
    const rolesArray = Object.values(roles);
    if (!rolesArray.includes(role)) {
        req.flash('error', 'Invalid Role');
        return res.redirect('back')
    }
    //admins restriction to remove itself
    if (req.user.id === id) {
        req.flash('error', 'Admin cannot be removed or change their role, ask another admin to change role for this admin.');
        return res.redirect('back')
    }
    //finally update user
    const user = await User.findByIdAndUpdate(id, { role: role }, { new: true, runValidators: true })
    req.flash('info', `Role updated for ${user.email} to ${user.role}`)
    res.redirect('back')
})



  router.get('/settings', (req, res, next) => {
    res.render('dashboard/webadm/settings');
  })
 
module.exports = router