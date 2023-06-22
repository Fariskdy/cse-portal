const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { roles, regions } = require('../utils/constants');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        min: 3,
        max: 50
    },
    role: {
        type: String,
        enum: [roles.admin, roles.moderator, roles.Region_Manager,roles.FCM, roles.DOP, roles.Administrator, roles.Accountant],
        default: roles.admin
        
    },
    phoneNumber: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        unique: true
    },
    region: {
        type: String,
        enum:[
            regions.null,
            regions.CHITTOOR,
            regions.GUNTUR,
            regions.KURNOOL,
            regions.BARPETA,
            regions.DHUBRI,
            regions.GAYA,
            regions.KISHANGANJ,
            regions.SITAMARHI,
            regions.SRI_NAGAR,
            regions.RANCHI,
            regions.HAVERI,
            regions.BHIWANDI,
            regions.UDAIPUR,
            regions.BAHRAICH,
            regions.MORADABAD,
            regions.PARGANAS,
            regions.BIRBHUM,
            regions.MURSHIDABAD
            ],
            validate: {
                validator: function(value) {
                  if (this.role === roles.Region_Manager) {
                    return value ? true : false;
                  }
                  return true;
                },
                message: 'Region is mandatory for Region Managers'
              }

    },
    regionAddress : {
        type: String,
    },
    regionPhone:{
        type:String,
    },
    regionEmail : {
        type : String,
    },
    password: {
        type: String,
        required: true
    },
    resetPasswordToken: {
        type: String,
    },
    resetPasswordExpires: {
        type: Date,
    }
});

UserSchema.pre('save', async function (next) {
    try {
        if (this.isNew) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(this.password, salt);
            this.password = hashedPassword;
            if (this.email === process.env.ADMIN_EMAIL.toLowerCase()) {
                this.role = roles.admin;
            }
        }
        next();
    } catch (err) {
        next(err);
    }
});

UserSchema.methods.isvalidPassword = async function (password) {
    try {
        return await bcrypt.compare(password, this.password);
    } catch (error) {
        throw createHttpError.InternalServerError(error.message);
    }
};

module.exports = mongoose.model('user', UserSchema);
