const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/user.model'); // Adjust the path to match your User model file
const Expense = require('../models/expense.model');
const RegionData = require('../models/region.model'); 
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');


//VERIFY EXPENSES(This Month)
// get the regions with expenses entried in current month
router.get('/expenses', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  const expensesByRegion = await Expense.aggregate([
    {
      $match: {
        $expr: {
          $and: [
            { $eq: [{ $month: '$date' }, currentMonth] },
            { $eq: [{ $year: '$date' }, currentYear] }
          ]
        }
      }
    },
    {
      $group: {
        _id: '$region',
        expenses: { $push: '$$ROOT' },
        unverifiedCount: {
          $sum: {
            $cond: {
              if: { $eq: ['$verifiedByFcm', false] },
              then: 1,
              else: 0
            }
          }
        }
      }
    }
  ]);
  console.log('expensesByRegion:', expensesByRegion);

  res.render('dashboard/fcm/expenses', { expensesByRegion });
});

// get the expenses of selected regions in current month
router.get('/expenses/:region', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);

  const expenses = await Expense.find({
    region: req.params.region,
    date: { $gte: firstDayOfMonth, $lte: lastDayOfMonth }
  });

  let totalAmount = 0;
  expenses.forEach(expense => {
    if (expense.verifiedByFcm) {
      totalAmount += expense.amount;
    }
  });

  res.render('dashboard/fcm/expense-detail', { region: req.params.region, expenses, totalAmount });
});


// fcm verification for the expenses
router.post('/expenses/:id/verify', async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    expense.verifiedByFcm = true;
    await expense.save();
    req.flash('success', 'Expense verified successfully.');
    res.redirect(`/fcm/expenses/${expense.region}`); // Redirect to the expenses page
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to verify the expense.');
    res.status(500).send('Server error');
  }
});



//VERIFY EXPENSES(Previous Month)
// get the regions with expenses entried in previous month
router.get('/pre-expenses', async (req, res) => {
  const currentMonth = new Date().getMonth(); // Subtract 1 to get the previous month
  const currentYear = new Date().getFullYear();
  
  const expensesByRegion = await Expense.aggregate([
    {
      $match: {
        $expr: {
          $and: [
            { $eq: [{ $month: '$date' }, currentMonth] },
            { $eq: [{ $year: '$date' }, currentYear] }
          ]
        }
      }
    },
    {
      $group: {
        _id: '$region',
        expenses: { $push: '$$ROOT' },
        unverifiedCount: {
          $sum: {
            $cond: {
              if: { $eq: ['$verifiedByFcm', false] },
              then: 1,
              else: 0
            }
          }
        }
      }
    }
  ]);
  console.log('expensesByRegion:', expensesByRegion);

  res.render('dashboard/fcm/pre-expenses', { expensesByRegion });
});
// get the expenses of selected regions in previous month
router.get('/pre-expenses/:region', async (req, res) => {
  const currentMonth = new Date().getMonth(); // Subtract 1 to get the previous month
  const currentYear = new Date().getFullYear();

  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);

  const expenses = await Expense.find({
    region: req.params.region,
    date: { $gte: firstDayOfMonth, $lte: lastDayOfMonth }
  });

  let totalAmount = 0;
  expenses.forEach(expense => {
    if (expense.verifiedByFcm) {
      totalAmount += expense.amount;
    }
  });

  res.render('dashboard/fcm/pre-expense-detail', { region: req.params.region, expenses, totalAmount });
});
// fcm verification for the expenses
router.post('/pre-expenses/:id/verify', async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    expense.verifiedByFcm = true;
    await expense.save();
    req.flash('success', 'Expense verified successfully.');
    res.redirect(`/fcm/pre-expenses/${expense.region}`); // Redirect to the expenses page
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to verify the expense.');
    res.status(500).send('Server error');
  }
});


// EXPENSE DATABASE ROUTES
// get the years with expense entries
router.get('/expenses-data', async (req, res) => {
  const years = await Expense.distinct('month')
    .then(years => years.map(year => year.split('-')[1]))
    .then(years => [...new Set(years)])
    .catch(err => {
      console.error(err);
      return [];
    });

  res.render('dashboard/fcm/years', { years });
});
// get the months with expense entries in selected year
router.get('/expenses-data/:year', (req, res) => {
  const year = req.params.year;

  Expense.find({ month: { $regex: year } })
    .distinct('month')
    .exec((err, months) => {
      if (err) {
        console.error(err);
        res.status(500).send('Internal server error');
      } else {
        console.log(months); // Log the months array for debugging purposes
        res.render('dashboard/fcm/months', { year, months });
      }
    });
});
// get the regions with expense entries in the selected month of the selected year
router.get('/expenses-data/:year/:month', (req, res) => {
  const year = req.params.year;
  const month = req.params.month;
  Expense.aggregate([
    {
      $match: {
        month,
        verifiedByFcm: false,
      },
    },
    {
      $group: {
        _id: '$region',
        count: { $sum: 1 },
      },
    },
  ]).exec((err, unverifiedCounts) => {
    if (err) {
      console.error(err);
      res.status(500).send('Internal server error');
    } else {
      Expense.find({ month })
        .distinct('region')
        .exec((err, regions) => {
          if (err) {
            console.error(err);
            res.status(500).send('Internal server error');
          } else {
            console.log(unverifiedCounts);
            console.log(regions);
            console.log(year);
            console.log(month);
            res.render('dashboard/fcm/regions', { month, regions, year, unverifiedCounts });
          }
        });
    }
  });
});
// get the expense data of the selected region



// Route to handle the download request
router.get('/download-expenses-data/:year/:month/:region', (req, res) => {
  const month = req.params.month;
  const year = req.params.year;
  const region = req.params.region;
  Expense.find({ month, region }).exec((err, expenses) => {
    if (err) {
      console.error(err);
      res.status(500).send('Internal server error');
    } else {
      // Create a new PDF document with A4 size
      const doc = new PDFDocument({ size: "A4" });

      // Define the file path for the PDF
      const filePath = path.join(
        __dirname,
        "../public/downloads",
        `${year}-${month}-${region}-expenses.pdf`
      );

      // Pipe the PDF document to a write stream
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Add downloaded date in the top corner
      const downloadedDate = new Date().toLocaleDateString();
      const dateText = `Downloaded Date: ${downloadedDate}`;
      const textWidth = doc.widthOfString(dateText); // Get the width of the text

      doc.fontSize(10).text(dateText, doc.page.width - textWidth - 30, 20, {
        align: "right",
        width: textWidth,
      });


      
// Add logo and headings
const logoImagePath = path.join(__dirname, '../public/assets/images/hnec.png'); // Replace 'path/to/logo.png' with the actual path to your logo image file
const mainHeadingText = 'EXPENSE REPORT';
const subHeadingText = 'National Interventions'; // Modify this to your desired subheading text

// Load the logo image and get its size
const logoImage = doc.openImage(logoImagePath);
const logoWidth = 100; // Adjust the logo width as needed
const logoHeight = (logoImage.height * logoWidth) / logoImage.width;

// Adjust the position values for logo and headings
const logoX = 50;
const logoY = 30; // Increase this value to move the logo higher
const subHeadingX = logoX + logoWidth + 10;
const subHeadingY = logoY + (logoHeight - doc.currentLineHeight()) / 2 - 20; // Increase this value to move the subheading higher
const mainHeadingX = subHeadingX;
const mainHeadingY = subHeadingY + doc.currentLineHeight() + 10; // Increase this value to move the main heading higher

// Draw the logo image
doc.image(logoImage, logoX, logoY, { width: logoWidth, height: logoHeight });

// Draw the subheading
doc.font('Helvetica-Bold').fontSize(17.86).fillColor('#6da8b3').text(subHeadingText, subHeadingX, subHeadingY);

// Draw the main heading
doc.font('Helvetica-Bold').fontSize(35).fillColor('#00594d').text(mainHeadingText, mainHeadingX, mainHeadingY);



// Draw the main heading
doc.font('Helvetica-Bold').fontSize(35).fillColor('#00594d').text(mainHeadingText, mainHeadingX, mainHeadingY);


// Add Region and Month labels
const regionLabel = `Region: ${region}`;
const monthLabel = `Month: ${month}`;
const labelsX = logoX;
const labelsY = logoY + logoHeight + 20; // Adjust the vertical offset

// Draw Region label
doc.font('Helvetica').fontSize(12).fillColor('black').text(regionLabel, labelsX, labelsY);

// Draw Month label
doc.text(monthLabel, labelsX, labelsY + 20); // Adjust the vertical position of the Month label


// Save the current graphics state
doc.save();

// Set the fill color to black and draw the black part of the banner
doc
  .fillColor("#168595")
  .rect(0, doc.page.height - 30, doc.page.width / 2, 30)
  .fill();

// Set the fill color to red and draw the red part of the banner
doc
  .fillColor("#00594d")
  .rect(doc.page.width / 2, doc.page.height - 30, doc.page.width / 2, 30)
  .fill();

// Add an image watermark
const watermarkImagePath = path.join(
  __dirname,
  "../public/assets/images/CSE.png"
); // Replace 'path/to/watermark.png' with the actual path to your watermark image file

const watermarkOptions = {
  width: doc.page.width * 0.5, // Adjust the width of the watermark image
  opacity: 0.9, // Adjust the opacity of the watermark (0.0 - 1.0)
  align: "center",
  valign: "center",
};

const imageWidth = watermarkOptions.width;
const imageHeight = doc.page.height * (imageWidth / doc.page.width);
const x = (doc.page.width - imageWidth) / 2;
const y = (doc.page.height - imageHeight) / 2;

doc.image(watermarkImagePath, x, y, watermarkOptions);

// Restore the graphics state to remove the watermark from affecting other elements
doc.restore();

const tableHeaders = ['Date', 'Description', 'Type', 'Voucher', 'Amount', 'Status'];

// Table data
const tableData = expenses.map(expense => [
  expense.date.toISOString().substring(0, 10),
  expense.description,
  expense.type,
  expense.voucherNo,
  expense.amount,
  expense.verifiedByAdm ? 'Verified' : 'Pending'
]);

// Adjust the position of the table
const tableX = 50;
const tableY = labelsY + 60; // Adjust the vertical position of the table, here it's set 20 units below the label section

// Set column widths
const columnWidths = [65, 205, 90, 55, 55, 50];

// Define table header style
const headerFontSize = 12;
const headerFontWeight = 'bold';
const headerBackgroundColor = '#CCCCCC';
const headerTextColor = '#000000';
const headerCellHeight = 20;

// Write table headers
doc.fontSize(headerFontSize);
doc.fillColor(headerBackgroundColor);
doc.fillOpacity(0.7);
doc.lineWidth(1);

tableHeaders.forEach((header, index) => {
  const cellX = tableX + columnWidths.slice(0, index).reduce((sum, width) => sum + width, 0);
  const cellY = tableY;

  doc.rect(cellX, cellY, columnWidths[index], headerCellHeight).fillAndStroke(headerBackgroundColor, '#000000');
  doc.fillColor(headerTextColor);
  doc.text(header, cellX + 5, cellY + 5, {
    width: columnWidths[index],
    height: headerCellHeight,
    align: 'center',
    valign: 'center'
  });
});

// Draw table borders and write table data
doc.fontSize(11);
doc.fillOpacity(1);
doc.strokeOpacity(0.5);

tableData.forEach((row, rowIndex) => {
  row.forEach((cell, cellIndex) => {
    const cellX = tableX + columnWidths.slice(0, cellIndex).reduce((sum, width) => sum + width, 0);
    const cellY = tableY + headerCellHeight + (rowIndex * headerCellHeight);

    doc.rect(cellX, cellY, columnWidths[cellIndex], headerCellHeight).stroke();
    doc.text(cell.toString(), cellX + 5, cellY + 5);
  });
});



// Finalize the PDF
doc.end();

      // Set headers for file download
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${year}-${month}-${region}-expenses.pdf`
      );

      // Pipe the PDF file to the response
      stream.on("finish", () => {
        res.download(filePath, (err) => {
          if (err) {
            console.error(err);
            res.status(500).send("Internal server error");
          }

          // Delete the file after it has been downloaded
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error(err);
            }
          });
        });
      });
    }
  });
});




router.get('/expenses-data/:year/:month/:region', (req, res) => {
  const month = req.params.month;
  const year = req.params.year;
  const region = req.params.region;
  Expense.find({ month, region })
    .exec((err, expenses) => {
      if (err) {
        console.error(err);
        res.status(500).send('Internal server error');
      } else {
        console.log(expenses);
        const verifiedExpenses = expenses.filter(expense => expense.verifiedByAdm);
        const totalAmount = verifiedExpenses.reduce((total, expense) => total + expense.amount, 0);
        res.render('dashboard/fcm/data', { year, month, region, expenses, totalAmount });
      }
    });
});

// settings page
router.get('/settings', (req, res, next) => {
  res.render('dashboard/fcm/settings');
}
);

// update password

// POST route for changing password
router.post('/change-password', async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  try {
    // Find the logged-in user by their ID
    const user = await User.findById(req.user.id);

    // Verify the current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      req.flash('error', 'Current password is incorrect');
      return res.redirect('/fcm/settings');
    }

    // Check if the new password and confirm password match
    if (newPassword !== confirmPassword) {
      req.flash('error', 'New password and confirm password do not match');
      return res.redirect('/fcm/settings');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    user.password = hashedPassword;
    await user.save();

    // Set a success flash message
    req.flash('success', 'Password successfully changed');

    // Redirect the user to a success page or their profile page
    res.redirect('/fcm/settings');
  } catch (error) {
    // Handle any errors that occur during the password change process
    console.error('Error changing password:', error);
    req.flash('error', 'An error occurred while changing the password');
    res.redirect('/fcm/settings');
  }
});



//=========================  REGION DATA ====================================//

// GET REGIONS WITH REGION DATA

router.get('/region-data', async (req, res) => {
  try {
    const regions = await RegionData.find({}, 'region');
    res.render('dashboard/fcm/region-data', { regions });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// GET REGION DATA OF SELECTED REGION
router.get('/region-data/:region', async (req, res) => {
  try {
    const selectedRegion = req.params.region;
    const regionData = await RegionData.findOne({ region: selectedRegion });
    if (!regionData) {
      return res.status(404).send('Region Data not found');
    }

    const users = await User.find({ region: regionData.region }, 'name email');
    res.render('dashboard/fcm/region-data-details', { regionData, users });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
// GET SUMMARY OF SELECTED REGION

router.get('/region-data/:region/summary', async (req, res) => {
  try {
    const selectedRegion = req.params.region;
    const regionData = await RegionData.findOne({ region: selectedRegion });

    const currentUserRegion = regionData.region;
    const currentYear = new Date().getFullYear();

    // Calculate the start date (May 1st of the current year)
    const startDate = new Date(currentYear, 4, 1);

    // Calculate the end date (April 30th of the next year)
    const endDate = new Date(currentYear + 1, 3, 30);

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
      res.render('dashboard/fcm/summary', {currentUserRegion,sdfAllottedAmount, examAllottedAmount , rangeAllottedAmount , artsAllottedAmount ,
      tltAllottedAmount, initiationAllottedAmount , awardsAllottedAmount, mahalluAllottedAmount , scholarshipAllottedAmount , totalExpensesByType, totalExpenditure, totalIncome,
      sdfBalance, examBalance, rangeBalance, artsBalance, tltBalance, initiationBalance, awardsBalance, mahalluBalance, scholarshipBalance });
    } else {
      // Handle the case when region data is not found
      res.render('dashboard/fcm/summary', { sdfAllottedAmount: 0 });
    }
  } catch (error) {
    console.error(error);
    res.redirect('/error');
  }
});

// Fund Allocation

router.get('/criteria', (req, res, next) => {
  res.render('dashboard/fcm/criteria');
})

module.exports = router;







