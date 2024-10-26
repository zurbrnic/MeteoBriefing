/*var express = require('express');
var router = express.Router();

/* GET home page. 
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;*/


//import the multer library
var multer = require('multer');

var express = require('express');
var router = express.Router();

var path = require('path');

var fs = require('fs');
const fspromise = require('fs').promises;
var { unlink } = require('fs/promises');

//import PDFkit
var PDFDocument = require('pdfkit');
PDFMerge = require('pdf-merge');

// impot axios for http requests
var axios = require('axios');

// import puppeteer for webscraping
var puppet = require('puppeteer');

require("dotenv").config();






function getMetarTaf(airports) {
  console.log("-- Get Metar and Tafs");

  airports = airports.replace(",", "").split(" ");
  let metarPromises = [];
  let tafPromises = [];

  // Fetch METARs
  for (let airport of airports) {
    const metarUrl = `https://api.checkwx.com/metar/${airport}/decoded`;
    const config = {
      method: 'get',
      url: metarUrl,
      headers: { 'X-API-Key': '734d635d87d745bd80a2e2d81b' }
    };

    metarPromises.push(
      axios(config)
        .then(response => {
          const metar = response.data.data[0].raw_text;
          return metar;
        })
        .catch(error => {
          console.error(`Error fetching METAR for ${airport}:`, error);
          return null; // Handle errors gracefully
        })
    );
  }

  // Fetch TAFs
  for (let airport of airports) {
    const tafUrl = `https://api.checkwx.com/taf/${airport}/decoded`;
    const config = {
      method: 'get',
      url: tafUrl,
      headers: { 'X-API-Key': '734d635d87d745bd80a2e2d81b' }
    };

    tafPromises.push(
      axios(config)
        .then(response => {
          const taf = response.data.data[0].raw_text;
          return taf;
        })
        .catch(error => {
          console.error(`Error fetching TAF for ${airport}:`, error);
          return null; // Handle errors gracefully
        })
    );
  }

  // Wait for all METAR and TAF requests to complete
  return Promise.all(metarPromises)
    .then(metarResults => {
      const MetarList = metarResults.filter(metar => metar !== null);
      return Promise.all(tafPromises)
        .then(tafResults => {
          const TafList = tafResults.filter(taf => taf !== null);
          return { MetarList, TafList }; // Return both lists
        });
    });
}







// Get DABS Function
async function getDabs() {
  console.log("-- Get DABS")
  console.log(`Exec. path :  ${puppet.executablePath()}`)


  var dabsurl = 'https://www.skybriefing.com/de/dabs'


  const browser = await puppet.launch({
    headless: true,
    executablePath:
      process.env.NODE_ENV === 'production'
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppet.executablePath(),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      // '--single-process',
      '--no-zygote',
    ],
  });

  const page = await browser.newPage();

  await page.goto(dabsurl);

  // Set screen size.
  await page.setViewport({ width: 1080, height: 1080 });

  // Get newest Dabslink
  actualdabs = '#v-ch_skyguide_ibs_portal_dabs_DabsUI_LAYOUT_435674 > div > div.v-customlayout.v-layout.v-widget.v-has-width.skb-layout01.v-customlayout-skb-layout01 > div > div:nth-child(4) > div > div > div > a'

  await page.locator(actualdabs).click();

  const newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page())));
  const newPage = await newPagePromise;


  const pages = await browser.pages();
  console.log("newpage  " + pages);

  // print tabs
  // for (let tabs of pages) {
  //   let title = await tabs.title();
  //   console.log("1 " + title);
  // }

  dabspage = pages[2];
  await dabspage.bringToFront();
  await dabspage.setViewport({ width: 1080, height: 1080 });

  const [response] = await Promise.all([
    page.waitForNetworkIdle({ idleTime: 2000 }), // The promise resolves after navigation has finished
  ]);


  // await page.locator( '#baseSvg').click();

  dabspage.emulateMediaType('screen')
  await dabspage.pdf({
    path: "public/pdf/dabs.pdf",
    waitForFonts: true,
    landscape: true,
    height: 2300,
    width: 3800,
  })
  console.log("pdf created")


  // Make screenshot of notam page
  // await dabspage.screenshot({ path: 'screenshot.png' });
  // console.log("screenshot taken")
  browser.close()
}

// getDabs()



// Specify the path to the JSON file
const filePathMinimas = './public/airport_minimas.json';

// Read JSON function
async function readJsonFile(airportList) {
  console.log("-- Get Airport Minimas");
  airportList = airportList.replace(/,/g, "").split(" ")

  try {
    // Read the file asynchronously
    const data = await fspromise.readFile(filePathMinimas, 'utf-8');

    // Parse the JSON data
    const jsonData = JSON.parse(data);

    let newAirportJson = {};  // Empty JSON object

    const extractedAirports = jsonData.airports.filter(airport => airportList.includes(airport.id));
    // const extractedAirports = jsonData.airports.filter(airport => airportList.includes(airport.id)&& airport.type === 'LNAV');
    newAirportJson = {
      airports: extractedAirports
    };

    return newAirportJson

  } catch (error) {
    console.error('Error reading JSON file:', error);
  }
}




async function getNotamsAPI(airportList) {
  console.log("-- Get Notams");
  // GET NOTAM data from the FAA NOTAM API
  const apiUrl = 'https://external-api.faa.gov/notamapi/v1/notams';
  const airports = airportList.split(/[,; ]+/).map(airport => airport.trim().toUpperCase());

  const fetchPromises = airports.map(async (airport) => {
    const params = new URLSearchParams({
      icaoLocation: airport,
    });

    const fullUrl = `${apiUrl}?${params.toString()}`;
    console.log(fullUrl);

    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'client_id': '04b1a2e24d574321bbc0263f4b53ac44',
          'client_secret': '5cd7d9d58c6A4D13A459e2C51904073c',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // console.log(data); // Process the returned data
      return data; // Return the fetched NOTAMs

    } catch (error) {
      console.error(`Error fetching NOTAMs for ${airport}:`, error);
      return null; // Return null or handle the error as needed
    }
  });

  // Wait for all fetch promises to resolve
  const results = await Promise.all(fetchPromises);
  return results; // Return all results
}




//multer file storage configuration
let storage = multer.diskStorage({
  //store the images in the public/images folder
  destination: function (req, file, cb) {
    cb(null, 'public/images')
  },
  //rename the images
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + '.' + file.mimetype.split('/')[1])
  }
})

//configuration for file filter
let fileFilter = (req, file, callback) => {
  let ext = path.extname(file.originalname);
  //if the file extension isn't '.png' or '.jpg' return an error page else return true
  if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') {
    return callback(new Error('Only png and jpg files are accepted'))
  } else {
    return callback(null, true)
  }
}

//initialize Multer with the configurations for storage and file filter
var upload = multer({ storage, fileFilter: fileFilter });





//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////// Routes Handler ////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post('/addairports', async (req, res) => {
  const { airportNames } = req.body; // Destructure airportNames from req.body

  // Add airport names to the session
  req.session.airportnames = airportNames;

  console.log("/addairports: Airport Names :   " + airportNames)

  try {
    // Get METAR and TAFs
    const { MetarList, TafList } = await getMetarTaf(airportNames);
    req.session.metar = MetarList;
    req.session.taf = TafList;

    // Get Airport Minimas
    const airportMinimas = await readJsonFile(airportNames);
    req.session.airportminimas = airportMinimas;

    // Get NOTAMs
    const notamsResult = await getNotamsAPI(airportNames);

    // Add NOTAM Data to the session
    for (let index = 0; index < notamsResult.length; index++) {
      const icaoID = notamsResult[index].items[0].properties.coreNOTAMData.notam.location.toLowerCase();
      const propertyName = `notams_${icaoID}`;
      req.session[propertyName] = notamsResult[index];
    }
    // Redirect to homepage
    // res.redirect('/');
    res.json(req.session.airportminimas);

  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Internal Server Error'); // Send an appropriate error response
  }

})

router.post('/addapproaches', async (req, res) => {

  // Filter the selected approaches from the airportminimas session object
  const matchingAirports = req.session.airportminimas.airports.filter(airport =>
    req.body.filteredAirports.some(filtered =>
      filtered.id.toLowerCase() === airport.id &&
      filtered.rwy === airport.rwy &&
      filtered.type === airport.type
    )
  );

  // Add the filtered object to the session for later use in the /pdf route to construct the minimas table
  req.session.filteredAirportMinimas = matchingAirports;

  res.json({ message: "/addapproaches: Successfully added selected approaches and minimas to the session" })
})



// 
router.post('/upload', upload.array('images'), function (req, res) {
  let files = req.files;
  let imgNames = [];

  //extract the filenames 
  for (i of files) {
    let index = Object.keys(i).findIndex(function (e) { return e === 'filename' })
    imgNames.push(Object.values(i)[index])
  }
  //store the image filenames in a session
  req.session.imagefiles = imgNames

  //redirect the request to the root URL route
  res.redirect('/')
})


// Render uploaded images
router.get('/', function (req, res, next) {
  //if there are no image filenames in a session, return the normal HTML page
  if (req.session.imagefiles === undefined) {
    res.sendFile(path.join(__dirname, '..', '/public/html/index.html'))
  } else {
    //if there are image filenames stored in a session, render them in an index.jade file
    res.render('index', { images: req.session.imagefiles })
  }
});





router.post('/pdf', async function (req, res, next) {
  try {
    let body = req.body;

    // Create a new pdf
    let doc = new PDFDocument({ size: 'A4', autoFirstPage: false });
    let pdfName = `pdf-${Date.now()}.pdf`;
    const pdfDir = path.join(__dirname, '..', '/public/pdf');

    // Ensure the directory exists
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    // Add the filepath to the pdf to the session
    req.session.pdffilepath = path.join(pdfDir, pdfName);

    // Store the pdf in the public/pdf folder and Pipe the PDF to a writable stream
    const writeStream = fs.createWriteStream(path.join(pdfDir, pdfName));
    doc.pipe(writeStream);

    // Create the pdf pages and add the images
    for (let name of body) {
      doc.addPage();
      doc.image(path.join(__dirname, '..', `/public/images/${name}`), 20, 20, { width: 555.28 });
    }

    // Read Metars and Tafs from session
    let metars = req.session.metar.join("\n\n");
    let splittaf = req.session.taf.join("\n\n").split(/(?=TEMPO)|(?=BECMG)|(?=PROB)/);
    let tafs = splittaf.join("\n     ");

    // Create Metar/Taf pdf page
    doc.addPage();
    doc.fontSize(14).text("METAR", { underline: true, align: 'center', paragraphGap: 8 });
    doc.fontSize(10).text(metars);
    doc.fontSize(14).text("\n\nTAF", { underline: true, align: 'center', paragraphGap: 8 });
    doc.fontSize(10).text(tafs);

    // Create table for minimas
    const tableData = [['Time', 'Airport', 'Runway', 'Approach', 'Minimum', 'Visibility']];
    for (let airport of req.session.filteredAirportMinimas) {
      const newRow = ["", airport.id.toUpperCase(), airport.rwy, airport.type, airport.minima, airport.vis];
      tableData.push(newRow);
    }

    const columnWidths = [80, 80, 80, 80, 80, 80];
    const rowHeight = 25;
    const yOffset = (doc.page.height) - 40;
    doc.fontSize(8);

    // Draw table
    tableData.forEach((row, rowIndex) => {
      row.forEach((cell, cellIndex) => {
        const x = 30 + cellIndex * columnWidths[cellIndex];
        const y = yOffset - (1 + tableData.length) * rowHeight + rowIndex * rowHeight;
        // Draw cell rectangle
        doc.rect(x, y, columnWidths[cellIndex], rowHeight).strokeColor('black').stroke();
        if (rowIndex == 0) {
          doc.font('Helvetica-Bold').text(cell, x + 5, y + 5, {
            underline: true,
            paragraphGap: 0,
          });
        } else {
          // Draw cell text
          doc.font('Helvetica').text(cell, x + 5, y + 5);
        }
      });
    });

    // Add NOTAMS to PDF
    doc.addPage().fontSize(14).text("NOTAMS", { underline: true, align: 'center', paragraphGap: 8 });

    for (const airport of req.session.airportnames.split(/[,; ]+/)) {
      let notamString = `notams_${airport}`;
      if (req.session[notamString]) {

        // Title with airport name and two horizontal lines
        const yPosition1 = doc.y - 4;   // Position the line below the text
        doc.moveTo(50, yPosition1)       // Start point of the line (x, y)
          .lineTo(550, yPosition1)       // End point of the line (x, y)
          .stroke();                    // Render the line

        doc.fontSize(12);
        doc.text(airport.toUpperCase(), {
          align: 'center',
          paragraphGap: 5,
        })

        const yPosition2 = doc.y - 4;   // Position the line below the text
        doc.moveTo(50, yPosition2)       // Start point of the line (x, y)
          .lineTo(550, yPosition2)       // End point of the line (x, y)
          .stroke();                    // Render the line

        doc.fontSize(9);

        for (let i = 0; i < req.session[notamString].items.length; i++) {
          // Deconstruct the notam message
          let notamID = req.session[notamString].items[i].properties.coreNOTAMData.notam.number;
          // let notamQualifier = ;
          let notamLocationA = req.session[notamString].items[i].properties.coreNOTAMData.notam.location;
          let notamEffDateB = req.session[notamString].items[i].properties.coreNOTAMData.notam.effectiveStart;
          let notamExpDateC = req.session[notamString].items[i].properties.coreNOTAMData.notam.effectiveEnd;
          let notamTextE = req.session[notamString].items[i].properties.coreNOTAMData.notam.text;
          let notamLowLimF = req.session[notamString].items[i].properties.coreNOTAMData.notam.minimumFL;
          let notamUppLimG = req.session[notamString].items[i].properties.coreNOTAMData.notam.maximumFL;

          // Check the actuality of the notam
          let effDate = new Date(notamEffDateB);
          let expDate = new Date(notamExpDateC);
          let currentDate = new Date();
          const fiftyDaysAgo = new Date();
          fiftyDaysAgo.setDate(currentDate.getDate() - 50);

          // Check expiration date
          if (!(notamExpDateC == "PERM")) {
            // Check if expiration date is in the past and only add notam if thats not the case
            if (expDate < currentDate) {
              console.log('The expiration date is in the past.');
            } else {
              doc.font('Helvetica').text(notamID);
              doc.font('Helvetica').text("A)  " + notamLocationA);
              doc.font('Helvetica').text("B)  " + notamEffDateB);
              doc.font('Helvetica').text("C)  " + notamExpDateC);
              doc.font('Helvetica').text("E)  " + notamTextE);
              doc.font('Helvetica').text("F)  FL" + notamLowLimF);
              doc.font('Helvetica').text("G)  FL" + notamUppLimG);
              doc.text(" ");
            }
          }
          else if (effDate >= fiftyDaysAgo) {
            doc.font('Helvetica').text(notamID);
            doc.font('Helvetica').text("A)  " + notamLocationA);
            doc.font('Helvetica').text("B)  " + notamEffDateB);
            doc.font('Helvetica').text("C)  " + notamExpDateC);
            doc.font('Helvetica').text("E)  " + notamTextE);
            doc.font('Helvetica').text("F)  FL" + notamLowLimF);
            doc.font('Helvetica').text("G)  FL" + notamUppLimG);
            doc.text(" ");
            console.log("The permanently created NOTAM is not older than 50 days")

          }
          else {
            console.log("The permanently created NOTAM is older than 50 days")
          }
        }
      }
    }

    // End the document
    doc.end();

    // Wait for the writeStream to finish
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // Concatenate Briefing PDF and DABS PDF
    const files = [
      path.join(pdfDir, pdfName),
      // path.join(__dirname, '..', `/public/pdf/dabs.pdf`), // Uncomment if needed
    ];

    // Save as new file
    await PDFMerge(files, { output: path.join(pdfDir, pdfName) });

    // Send the address back to the browser
    res.send(`/pdf/${pdfName}`);
  } catch (error) {
    console.error('Error creating PDF:', error);
    res.status(500).send('Internal Server Error');
  }
});



router.get('/new', async function (req, res, next) {
  //delete the files stored in the session
  // let filenames = req.session.imagefiles;

  // let deleteFiles = async (paths) => {
  //   let deleting = paths.map((file) => unlink(path.join(__dirname, '..', `/public/images/${file}`)))
  //   await Promise.all(deleting)
  // }
  // deleteFiles(filenames)

  let filePath = req.session.pdffilepath;

  try {
    // Check if the file exists
    // await fspromise.access(filePath);
    if (req.session.pdffilepath) {
      // Delete the PDF file
      await fspromise.unlink(filePath, (err) => {
        if (err) throw err;
        console.log('error...');
      });
    }

    // Delete the images if they exist
    if (req.session.imagefiles) {
      const filenames = req.session.imagefiles;
      const deletePromises = filenames.map(file => {
        const imagePath = path.join(__dirname, '..', `/public/images/${file}`);

        return fspromise.access(imagePath) // Check if the image file exists
          .then(() => {
            // If the file exists, delete it
            return fspromise.unlink(imagePath);
          })
          .then(() => {
            console.log(`/new -- Image ${imagePath} deleted successfully.`);
          })
          .catch(err => {
            if (err.code === 'ENOENT') {
              console.log(`/new -- Image ${imagePath} does not exist, skipping.`);
            } else {
              console.error('Error deleting image:', err);
            }
          });
      });

      await Promise.all(deletePromises);
      console.log('/new -- All image deletion attempts completed.');
    }

    // Clean up session data
    req.session.airportminimas = undefined;
    req.session.filteredAirportMinimas = undefined;
    req.session.airportnames = undefined;
    req.session.imagefiles = undefined;
    req.session.pdffilepath = undefined;
    req.session.metar = undefined;
    req.session.taf = undefined;

  } catch (err) {
    console.error('/new -- Error deleting file:', err);
    res.status(500).json({ error: 'File not found or unable to delete' });
  }

  //redirect to the root URL
  res.redirect('/')
})




router.post('/delete', async function (req, res, next) {
  console.log("Delete route");

  const { link } = req.body; // Destructure to get the link

  if (!link) {
    return res.status(400).json({ error: 'Link is required' }); // Check if link is provided
  }

  const filePath = path.join(__dirname, '..', `/public/${link}`); // Construct the file path

  try {
    // Delete the PDF file
    await fspromise.unlink(filePath, (err) => {
      if (err) throw err;
      console.log('error...');
    });

    // Delete the images
    if (req.session.imagefiles) {
      const filenames = req.session.imagefiles;
      const deletePromises = filenames.map(file => {
        const imagePath = path.join(__dirname, '..', `/public/images/${file}`);
        return fspromise.unlink(imagePath).catch(err => {
          console.error('Error deleting image:', err);
        });
      });
      await Promise.all(deletePromises);
      console.log('Images deleted successfully');
    }

    // Clean up session data
    req.session.airportminimas = undefined;
    req.session.filteredAirportMinimas = undefined;
    req.session.airportnames = undefined;
    req.session.imagefiles = undefined;
    req.session.pdffilepath = undefined;
    req.session.metar = undefined;
    req.session.taf = undefined;


    // Send a success response
    res.json({ message: 'File and associated images deleted successfully' });
  } catch (err) {
    console.error('Error deleting file:', err);
    res.status(500).json({ error: 'File not found or unable to delete' });
  }
});



router.get('/dabs', async (req, res) => {
  const url = 'https://www.skybriefing.com/de/dabs?p_p_id=ch_skyguide_ibs_portal_dabs_DabsUI&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=APP&p_p_cacheability=cacheLevelPage&_ch_skyguide_ibs_portal_dabs_DabsUI_v-resourcePath=%2FAPP%2Fconnector%2F0%2F3%2Fhref%2Fdabs-2024-10-25.pdf';

  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });

    console.log("response", response); // Convert buffer to string
    // console.log('Response Status:', response.status);
    // console.log('Response Headers:', response.headers);

    // Set the content type for PDF only once
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="document.pdf"');

    // Send the PDF data
    res.send(response.data);
  } catch (error) {
    // Ensure that only one response is sent
    console.error('Error fetching the PDF:', error);

    // Send error response only if no response has been sent yet
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error');
    }
  }
});





module.exports = router;

