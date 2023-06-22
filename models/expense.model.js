const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  region: {
    type: String,
    required: true
  },
  month: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['INCOME', 'SDF', 'EXAM', 'RANGE', 'OFFICE', 'ART_FEST', 'TRAINING', 'SCHOLARSHIPS', 'TLT', 'IR_VISITS', 'INITIATION', 'AWARDS', 'MAHALLU', 'MADRASSA', 'OTHERS'],
    required: true
  },
  voucherNo: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    validate: {
      validator: function(value) {
        if (this.type === 'INCOME') {
          return true; // no validation for INCOME type
        }
        return value <= 10000; // validate other types against 10000 limit
      },
      message: 'Expense amount cannot be greater than 10000 for this type of expense.'
    }
  },
  BillImage: {
    type: String,
  },
  comments: {
    type: String,
  },
  verifiedByFcm : {
    type: Boolean,
    default: false
  },
  verifiedByDop : {
    type: Boolean,
    default: false
  },
  verifiedByAdm : {
    type: Boolean,
    default: false
  }
});

expenseSchema.pre('validate', function(next) {
  const date = this.date;
  const month = date.toLocaleString('en-US', { month: '2-digit' });
  const year = date.toLocaleString('en-US', { year: 'numeric' });
  this.month = `${month}-${year}`;
  next();
});

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = Expense;

