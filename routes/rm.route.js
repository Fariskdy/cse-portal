const express = require('express');
const router = express.Router();
const Expense = require('../models/expense.model'); // import the Expense model
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/user.model')
const RegionData = require('../models/region.model'); 

//##############################################    START    ##############################################

//##########################################################################################################
//######################################  Bill Upload Configuration  #######################################
//##########################################################################################################

//set the destination for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/bills/'); // Set the destination folder for uploaded bill images
  },
  filename: function (req, file, cb) {
    // Generate a unique filename for the uploaded file
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });
//##############################################    END    ###############################################



///###########################################################################################################
///##################################  ADD CURRENT MONTH EXPENSES ############################################
///###########################################################################################################

// ADD EXPENSES IN CURRENT MONTH
router.post('/expenses', upload.single('BillImage'), (req, res, next) => {
  // Get the form data from the request body
  const { region, month, date, description, type, voucherNo, amount, comments } = req.body;

  // Get the filename of the uploaded bill image
  const billImage = req.file.filename;

  // Create a new Expense object with the form data and the bill image filename
  const expense = new Expense({ region, month, date, description, type, voucherNo, amount, comments, BillImage: billImage });

  // Save the expense object to the database using Mongoose
  expense.save((err) => {
    if (err) {
      console.log(err);
      req.flash('error', 'Failed to save the expense data.');
      res.redirect('/rm/expenses');
      return;
    }

    // Set a success flash message and redirect the user back to the /expenses page after saving the expense data
    req.flash('success', 'Expense data saved successfully.');
    res.redirect('/rm/expenses');
  });
});

// DELETE THE ADDED EXPENSES
router.delete('/expenses/:id', (req, res, next) => {
  const expenseId = req.params.id;

  // Use Mongoose to find and remove the expense by its ID
  Expense.findByIdAndRemove(expenseId, (err, deletedExpense) => {
    if (err) {
      console.log(err);
      req.flash('error', 'Failed to delete the expense.');
      res.redirect('/rm/expenses');
      return;
    }

    if (!deletedExpense) {
      req.flash('error', 'Expense not found.');
      res.redirect('/rm/expenses');
      return;
    }

    // Delete the corresponding bill image file from the file system (assuming you have stored the file path in the 'BillImage' field)
    const billImagePath = path.join('public/uploads/bills/', deletedExpense.BillImage);
    fs.unlink(billImagePath, (err) => {
      if (err) {
        console.log(err);
      }

      // Set a success flash message and redirect the user back to the /expenses page after deleting the expense
      req.flash('success', 'Expense deleted successfully.');
      res.redirect('/rm/expenses');
    });
  });
});

// GET THE ADDED EXPENESES IN TABLE FORMAT
router.get('/expenses', (req, res, next) => {
  // Get the current user's region from the session or request headers
  const currentUserRegion = req.user.region || req.headers.region;
  console.log(`Current user's region: ${currentUserRegion}`);

  // Get the current month (0-based index, so add 1)
  const currentMonth = new Date().getMonth() + 1;

  // Query the database for expenses belonging to the current user's region and month
  Expense.aggregate([
    { $match: {
      region: currentUserRegion,
      date: { $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1), $lt: new Date(new Date().getFullYear(), currentMonth, 1) }
    }},
    { $group: { _id: null, totalAmount: { $sum: "$amount" }, totalVerifiedAmount: { $sum: { $cond: [{ $eq: ["$verifiedByAdm", true] }, "$amount", 0] } } } }
  ], (err, result) => {
    if (err) {
      console.log(err);
      res.sendStatus(500);
      return;
    }
    const totalAmount = result.length ? result[0].totalAmount : 0;
    const totalVerifiedAmount = result.length ? result[0].totalVerifiedAmount : 0;
    console.log(`Total amount spent for ${currentUserRegion} in month ${currentMonth}: `, totalAmount);
    console.log(`Total verified amount for ${currentUserRegion} in month ${currentMonth}: `, totalVerifiedAmount);
    

    function getCurrentMonthStartDate() {
      var currentDate = new Date();
      var year = currentDate.getFullYear();
      var month = String(currentDate.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}-01`;
    }
    
    function getCurrentMonthEndDate() {
      var currentDate = new Date();
      var year = currentDate.getFullYear();
      var month = String(currentDate.getMonth() + 1).padStart(2, '0');
      var lastDay = new Date(year, currentDate.getMonth() + 1, 0).getDate();
      return `${year}-${month}-${lastDay}`;
    }
    // Query the database again for expenses belonging to the current user's region and month, this time without the aggregation stage
    Expense.find({
      region: currentUserRegion,
      date: { $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1), $lt: new Date(new Date().getFullYear(), currentMonth, 1) }
    }, (err, expenses) => {
      if (err) {
        console.log(err);
        res.sendStatus(500);
        return;
      }
      console.log(`Expenses for ${currentUserRegion} in month ${currentMonth}: `, expenses);

      // Render the dashboard/rm/expense EJS template with the list of expenses, total amount, and total verified amount
      res.render('dashboard/rm/expense', { expenses: expenses, totalAmount: totalAmount, totalVerifiedAmount: totalVerifiedAmount,getCurrentMonthStartDate,getCurrentMonthEndDate });
    });
  });
});
//##############################################    END    ###############################################



//############################################################################################################
//################################## ADD PREVIOUS MONTH EXPENSES #############################################
//############################################################################################################

// add expenses in previous month
router.post('/pre-expenses', upload.single('BillImage'), (req, res, next) => {
  // Get the form data from the request body
  const { region, month, date, description, type, voucherNo, amount, comments } = req.body;

  // Get the filename of the uploaded bill image
  const billImage = req.file.filename;

  // Create a new Expense object with the form data and the bill image filename
  const expense = new Expense({ region, month, date, description, type, voucherNo, amount, comments, BillImage: billImage });

  // Save the expense object to the database using Mongoose
  expense.save((err) => {
    if (err) {
      console.log(err);
      req.flash('error', 'Failed to save the expense data.');
      res.redirect('/rm/pre-expenses');
      return;
    }

    // Set a success flash message and redirect the user back to the /expenses page after saving the expense data
    req.flash('success', 'Expense data saved successfully.');
    res.redirect('/rm/pre-expenses');
  });
});

router.delete('/pre-expenses/:id', (req, res, next) => {
  const expenseId = req.params.id;

  // Use Mongoose to find and remove the expense by its ID
  Expense.findByIdAndRemove(expenseId, (err, deletedExpense) => {
    if (err) {
      console.log(err);
      req.flash('error', 'Failed to delete the expense.');
      res.redirect('/rm/pre-expenses');
      return;
    }

    if (!deletedExpense) {
      req.flash('error', 'Expense not found.');
      res.redirect('/rm/pre-expenses');
      return;
    }

    // Delete the corresponding bill image file from the file system (assuming you have stored the file path in the 'BillImage' field)
    const billImagePath = path.join('public/uploads/bills/', deletedExpense.BillImage);
    fs.unlink(billImagePath, (err) => {
      if (err) {
        console.log(err);
      }

      // Set a success flash message and redirect the user back to the /expenses page after deleting the expense
      req.flash('success', 'Expense deleted successfully.');
      res.redirect('/rm/pre-expenses');
    });
  });
});


router.get('/pre-expenses', (req, res, next) => {
  // Get the current user's region from the session or request headers
  const currentUserRegion = req.user.region || req.headers.region;
  console.log(`Current user's region: ${currentUserRegion}`);

  // Get the current month (0-based index, so subtract 1 to get the previous month)
  const previousMonth = new Date().getMonth() - 1;

  // Query the database for expenses belonging to the current user's region and the previous month
  Expense.aggregate([
    { $match: {
      region: currentUserRegion,
      date: { $gte: new Date(new Date().getFullYear(), previousMonth, 1), $lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } // set the date range to previous month
    }},
    { $group: { _id: null, totalAmount: { $sum: "$amount" }, totalVerifiedAmount: { $sum: { $cond: [{ $eq: ["$verifiedByAdm", true] }, "$amount", 0] } } } }
  ], (err, result) => {
    if (err) {
      console.log(err);
      res.sendStatus(500);
      return;
    }
    const totalAmount = result.length ? result[0].totalAmount : 0;
    const totalVerifiedAmount = result.length ? result[0].totalVerifiedAmount : 0;
    console.log(`Total amount spent for ${currentUserRegion} in the previous month: `, totalAmount);
    console.log(`Total verified amount for ${currentUserRegion} in the previous month: `, totalVerifiedAmount);


    // Query the database again for expenses belonging to the current user's region and the previous month, this time without the aggregation stage
    Expense.find({
      region: currentUserRegion,
      date: { $gte: new Date(new Date().getFullYear(), previousMonth, 1), $lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } // set the date range to previous month
    }, (err, expenses) => {
      if (err) {
        console.log(err);
        res.sendStatus(500);
        return;
      }
      console.log(`Expenses for ${currentUserRegion} in the previous month: `, expenses);

      // Render the dashboard/rm/expense EJS template with the list of expenses, total amount, and total verified amount
      res.render('dashboard/rm/pre-expense', { expenses: expenses, totalAmount: totalAmount, totalVerifiedAmount: totalVerifiedAmount });
    });
  });
});
//##############################################    END    ###############################################


//############################################################################################################
//############################################   MY EXPENSES   ###############################################
//############################################################################################################

// GET THE YEARS WITH EXPENSES
router.get('/my-expenses', async (req, res) => {
  const userRegion = req.user.region; // assuming you have the user's region in the req.user object
  const years = await Expense.distinct('month', { region: userRegion })
    .then(years => years.map(year => year.split('-')[1]))
    .then(years => [...new Set(years)])
    .catch(err => {
      console.error(err);
      return [];
    });

res.render('dashboard/rm/years', { years, userRegion });
});

// GET THE MONTHS IN THE SELECTED YEAR
router.get('/my-expenses/:year', (req, res) => {
  const year = req.params.year;
  const userRegion = req.user.region;

  Expense.find({ region: userRegion, month: { $regex: year } })
    .distinct('month')
    .exec((err, months) => {
      if (err) {
        console.error(err);
        res.status(500).send('Internal server error');
      } else {
        console.log(months); // Log the months array for debugging purposes
        res.render('dashboard/rm/months', { userRegion, year, months });
      }
    });
});

// GET THE EXPENSES IN THE SELECTED MONTH
router.get('/my-expenses/:year/:month', (req, res) => {
  const month = req.params.month;
  const year = req.params.year;
  const userRegion = req.user.region;

  Expense.find({ region: userRegion, month: month }, (err, expenses) => {
    if (err) {
      console.error(err);
      res.status(500).send('Internal server error');
    } else {
      console.log('userRegion:', userRegion);
      console.log('month:', month);
      console.log('expenses:', expenses);

            // Calculate the total amount of expenses where verifiedByFcm and verifiedByDop are true
            const totalAmount = expenses.reduce((sum, expense) => {
              if (expense.verifiedByAdm) {
                return sum + expense.amount;
              } else {
                return sum;
              }
            }, 0);
      
      res.render('dashboard/rm/month-data', { userRegion, month, year, expenses, totalAmount });
    }
  });
});
//##############################################    END    ###############################################

//############################################################################################################
//############################################  region Data  ###############################################
//############################################################################################################

// GET route to display the region data
// GET route to display the region data for the current user
router.get('/region-data', async (req, res) => {
  try {
    const currentUserRegion = req.user.region; // Assuming you have user authentication and the region is stored in req.user

    // Fetch the region data for the current user from the database
    const regionData = await RegionData.findOne({ region: currentUserRegion });

    // Render the view/template and pass the region data as a variable
    res.render('dashboard/rm/region-data', { regionData, isEditable: true });
    console.log(regionData);
  } catch (error) {
    console.error(error);
    res.redirect('/error');
  }
});

// POST route to handle create or update operations on region data
router.post('/region-data', async (req, res) => {
  try {
    const currentUserRegion = req.user.region; // Assuming you have user authentication and the region is stored in req.user

    // Fetch the region data for the current user from the database
    let regionData = await RegionData.findOne({ region: currentUserRegion });

    // If region data exists, update it; otherwise, create new data
    if (regionData) {
      regionData.region = req.body.region;
      regionData.hms = req.body.hms;
      regionData.field_coordinators = req.body.field_coordinators;
      regionData.hms_students = req.body.hms_students;
      regionData.teachers = req.body.teachers;
      regionData.new_hms = req.body.new_hms;
      regionData.third_std_students = req.body.third_std_students;
      regionData.qlm_centres = req.body.qlm_centres;
      regionData.talim_e_baligan_centres = req.body.talim_e_baligan_centres;
      regionData.model_hms = req.body.model_hms;
      regionData.back_to_school_centres = req.body.back_to_school_centres;
      regionData.pre_schools = req.body.pre_schools;


      await regionData.save();
    } else {
      regionData = new RegionData({
        region: req.body.region,
        hms: req.body.hms,
        field_coordinators: req.body.field_coordinators,
        hms_students: req.body.hms_students,
        teachers: req.body.teachers,
        new_hms: req.body.new_hms,
        third_std_students: req.body.third_std_students,
        qlm_centres: req.body.qlm_centres,
        talim_e_baligan_centres: req.body.talim_e_baligan_centres,
        model_hms: req.body.model_hms,
        back_to_school_centres: req.body.back_to_school_centres,
        pre_schools: req.body.pre_schools
      });

      await regionData.save();
    }

    res.redirect('/rm/region-data');
    req.flash('success', 'Region Data saved successfully.');
  } catch (error) {
    console.error(error);
    res.redirect('/error');
  }
});

router.get('/region-data/alloted-amount', async (req, res, next) => {
  try {
    const currentUserRegion = req.user.region;
    const currentYear = new Date().getFullYear();
    
    // Calculate the start date (May 1st of the current year)
    const startDate = new Date(currentYear, 4, 1);
    
    // Calculate the end date (April 30th of the next year)
    const endDate = new Date(currentYear + 1, 3, 30);
    
    const regionData = await RegionData.findOne({ region: currentUserRegion });
    
    const expenses = await Expense.aggregate([
      {
        $match: {
          region: currentUserRegion,
          date: { $gte: startDate, $lte: endDate },
          verifiedByAdm: true
        }
      },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const totalExpensesByType = {};
    
    expenses.forEach(expense => {
      totalExpensesByType[expense._id] = expense.totalAmount;
    });
    
    if (regionData) {
      // Calculate the allotted amount for the SDF
      const hms = regionData.hms;
      const fieldCoordinators = regionData.field_coordinators;
      const hmsStudents = regionData.hms_students;
      const teachers = regionData.teachers;
      const newHms = regionData.new_hms;
      const thirdStdStudents = regionData.third_std_students;
      const qlmCentres = regionData.qlm_centres;
      const talimEBaliganCentres = regionData.talim_e_baligan_centres;
      const modelHms = regionData.model_hms;
      const backToSchoolCentres = regionData.back_to_school_centres;
      const preSchools = regionData.pre_schools;

      const sdfAllottedAmount = 1300 * hms + 100000 * fieldCoordinators;
      const examAllottedAmount = hmsStudents * 58;
      const rangeAllottedAmount = teachers * 1000;
      const artsAllottedAmount = hms *250 + 60000;
      const tltAllottedAmount = teachers * 2500 * 0.3;
      const initiationAllottedAmount = newHms * 1000;
      const awardsAllottedAmount = hms * 3000;
      const scholarshipAllottedAmount = thirdStdStudents * 500;
      const mahalluAllottedAmount = 15000 * (qlmCentres + talimEBaliganCentres) + 10000 * (modelHms + preSchools) + 25000 * backToSchoolCentres;

      
      const sdfBalance = sdfAllottedAmount - totalExpensesByType['SDF'];
      const examBalance = examAllottedAmount - totalExpensesByType['EXAM'];
      const rangeBalance = rangeAllottedAmount - totalExpensesByType['RANGE'];
      const artsBalance = artsAllottedAmount - totalExpensesByType['ART_FEST'];
      const tltBalance = tltAllottedAmount - totalExpensesByType['TLT'];
      const initiationBalance = initiationAllottedAmount - totalExpensesByType['INITIATION'];
      const awardsBalance = awardsAllottedAmount - totalExpensesByType['AWARDS'];
      const mahalluBalance = mahalluAllottedAmount - totalExpensesByType['MAHALLU'];
      const scholarshipBalance = scholarshipAllottedAmount - totalExpensesByType['SCHOLARSHIPS'];


      // Calculate the total expenditure excluding 'INCOME'
            const totalExpenditure = Object.keys(totalExpensesByType)
            .filter(type => type !== 'INCOME')
            .reduce((sum, type) => sum + totalExpensesByType[type], 0);

        // Calculate the total Income
        const totalIncome = totalExpensesByType['INCOME']
      res.render('dashboard/rm/alloted-amount', { sdfAllottedAmount, examAllottedAmount , rangeAllottedAmount , artsAllottedAmount ,
      tltAllottedAmount, initiationAllottedAmount , awardsAllottedAmount, mahalluAllottedAmount , scholarshipAllottedAmount , totalExpensesByType, totalExpenditure, totalIncome,
      sdfBalance, examBalance, rangeBalance, artsBalance, tltBalance, initiationBalance, awardsBalance, mahalluBalance, scholarshipBalance });
    } else {
      // Handle the case when region data is not found
      res.render('dashboard/rm/alloted-amount', { sdfAllottedAmount: 0 });
    }
  } catch (error) {
    console.error(error);
    res.redirect('/error');
  }
});

router.get('/region-data/criteria', (req, res, next) => {
  res.render('dashboard/rm/criteria');
})


//############################################################################################################
//############################################   SETTINGS   ###############################################
//############################################################################################################


// ROUTE TO GET THE SETTINGS PAGE
router.get('/settings', (req, res, next) => {
    res.render('dashboard/rm/settings');
  }
);

// ROUTE TO CHANGE PASSWORD
router.post('/change-password', async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  try {
    // Find the logged-in user by their ID
    const user = await User.findById(req.user.id);

    // Verify the current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      req.flash('error', 'Current password is incorrect');
      return res.redirect('/rm/settings');
    }

    // Check if the new password and confirm password match
    if (newPassword !== confirmPassword) {
      req.flash('error', 'New password and confirm password do not match');
      return res.redirect('/rm/settings');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    user.password = hashedPassword;
    await user.save();

    // Set a success flash message
    req.flash('success', 'Password successfully changed');

    // Redirect the user to a success page or their profile page
    res.redirect('/rm/settings');
  } catch (error) {
    // Handle any errors that occur during the password change process
    console.error('Error changing password:', error);
    req.flash('error', 'An error occurred while changing the password');
    res.redirect('/rm/settings');
  }
});
//##############################################    END    ###############################################


module.exports = router