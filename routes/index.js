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



// Get Notams Function
async function getNotams(airports) {
  console.log("Get Notams")
  airports = airports.replace(/,/g, "")
  console.log(airports)


  var notamurl = 'https://www.notams.faa.gov/dinsQueryWeb/'

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

  await page.goto(notamurl);

  // Set screen size.
  await page.setViewport({ width: 1080, height: 720 });

  // Type into search box.
  agreebtn = 'body > div.ui-dialog.ui-widget.ui-widget-content.ui-corner-all.ui-dialog-buttonpane.ui-draggable > div.ui-dialog-buttonpane.ui-widget-content.ui-helper-clearfix > button'
  textfield = 'body > table:nth-child(9) > tbody > tr > td:nth-child(1) > table > tbody > tr:nth-child(1) > td > form > table > tbody > tr > td:nth-child(2) > table > tbody > tr:nth-child(4) > td > textarea'

  await page.locator(agreebtn).click();

  // await page.locator(textfield).fill('lszb');
  await page.locator('textarea[name="retrieveLocId"]').fill(airports);

  const newpage = await page.locator('input[name="submit"]').click();
  console.log("newpage  " + newpage);

  const newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page())));
  const newPage = await newPagePromise;

  // await page.waitForSelector('input[type="button"]');

  const pages = await browser.pages();
  console.log("newpage  " + newPage);
  notampage1 = pages[2];
  await notampage1.bringToFront();
  await notampage1.setViewport({ width: 1080, height: 720 });

  await notampage1.pdf({
    path: "public/pdf/notams.pdf",
  })

  browser.close()
}


// getNotams(airportsNotam)


let metarFile = './public/metar.txt';
let tafFile = './public/taf.txt';

// Get Metar and Taf Function
function getMetarTaf(airports) {
  console.log(" Get Metar and Tafs :    ")

  airports = airports.replace(",", "").split(" ")
  let MetarList = []
  let TafList = []

  for (element in airports) {
    var metarurl = `https://api.checkwx.com/metar/${airports[element]}/decoded`
    var config = {
      method: 'get',
      url: metarurl,
      headers: { 'X-API-Key': '734d635d87d745bd80a2e2d81b' }
    };

    axios(config).then(function (response) {
      // console.log(response.data["data"][0]["raw_text"])
      //let metar = JSON.stringify(response.data["data"][0]["raw_text"])
      let metar = (response.data["data"][0]["raw_text"])

      return metar
    })
      .then(function (resp) {
        MetarList.push("\n" + "\n" + resp)
        let metar = resp + "\n\n"
        fs.appendFile(metarFile, metar, (err) => {

          // In case of a error throw err.
          if (err) throw err;
        })
        return MetarList
      })
      .catch(function (error) {
        console.log(error);
      });
  }

  for (element in airports) {
    var tafurl = `https://api.checkwx.com/taf/${airports[element]}/decoded`
    var config = {
      method: 'get',
      url: tafurl,
      headers: { 'X-API-Key': '734d635d87d745bd80a2e2d81b' }
    };

    axios(config).then(function (response) {
      // console.log(response.data["data"][0]["raw_text"])
      //let metar = JSON.stringify(response.data["data"][0]["raw_text"])
      let taf = (response.data["data"][0]["raw_text"])

      return taf
    })
      .then(function (resp) {
        TafList.push("\n" + "\n" + resp)
        let taf = resp + "\n\n"
        fs.appendFile(tafFile, taf, (err) => {

          // In case of a error throw err.
          if (err) throw err;
        })
        return TafList
      })
      .catch(function (error) {
        console.log(error);
      });
  }
}
// getMetarTaf(AirportList)



// Get DABS Function
async function getDabs() {
  console.log("Get DABS")
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
let airportNames = ["lszg", "lszh", "eddn"];
let newAirportJson = {};  // Empty JSON object

// Read JSON function
async function readJsonFile(airportList) {
  airportList = airportList.replace(",", "").split(" ")
  try {
    // Read the file asynchronously
    const data = await fspromise.readFile(filePathMinimas, 'utf-8');

    // Parse the JSON data
    const jsonData = JSON.parse(data);

    const extractedAirports = jsonData.airports.filter(airport => airportList.includes(airport.id));
    newAirportJson = {
      airports: extractedAirports
    };
    console.log(newAirportJson["airports"])
    // Create table and pdf
    // createPdfWithTable(newAirportJson)

  } catch (error) {
    console.error('Error reading JSON file:', error);
  }
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

/*//create a '/' GET route that'll return the index.html file stored in the public/html folder
router.get('/', function(req, res, next) {
  res.sendFile(path.join(__dirname, '..','/public/html/index.html'));
}); */




//
router.post('/addairports', function (req, res) {
  // delete old txt files
  fs.unlink(metarFile, (err) => {
    if (err) {
      console.error(`Error removing file: ${err}`);
      return;
    }
  });

  fs.unlink(tafFile, (err) => {
    if (err) {
      console.error(`Error removing file: ${err}`);
      return;
    }
  });

  console.log(" Airpot Names :   " + req.body.airportnames)

  // Get Metar/Taf from all selected airports
  try {
    metars = getMetarTaf(req.body.airportnames)
  }
  catch (error) {
    console.log(error)
  }

  // Get NOTAMS from all selected airports and save pdf file
  // try {
  //   metars = getNotams(req.body.airportnames)
  // }
  // catch (error) {
  //   console.log(error)
  // }

  // Get Minimas from all selected airports
  try {
    readJsonFile(req.body.airportnames)
  }
  catch (error) {
    console.log(error)
  }

  // Redirect to homepage
  res.redirect('/')

})




// 
router.post('/upload', upload.array('images'), function (req, res) {
  let files = req.files;
  let imgNames = [];
  // console.log(req)

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


// Create PDF with images, Metar/Taf, Minimas, Notams and DABS
router.post('/pdf', function (req, res, next) {

  let body = req.body

  //Create a new pdf
  let doc = new PDFDocument({ size: 'A4', autoFirstPage: false });
  let pdfName = 'pdf-' + Date.now() + '.pdf';

  //store the pdf in the public/pdf folder
  doc.pipe(fs.createWriteStream(path.join(__dirname, '..', `/public/pdf/${pdfName}`)));

  //create the pdf pages and add the images
  for (let name of body) {
    doc.addPage()
    doc.image(path.join(__dirname, '..', `/public/images/${name}`), 20, 20, { width: 555.28, align: 'center', valign: 'center' })
    console.log("dirname:  ", path.join(__dirname, '..'))
  }

  // Read Metars and Tafs from txt file and add to pdf doc

  if (fs.existsSync(metarFile) && fs.existsSync(tafFile)) {
    fs.readFile(metarFile, "utf8", (err, data) => {

      // In case of a error throw err.
      if (err) throw err;

      let metars = data

      fs.readFile(tafFile, "utf8", (err, data) => {
        // In case of a error throw err.
        if (err) throw err;

        // Rearrange TAFs (new line for each new timeframe)
        let splittaf = data.split(/(?=TEMPO)|(?=BECMG)|(?=PROB)/)
        let tafs = splittaf.join("\n     ")

        // Create Metar/Taf pdf page and add the relevant minimas
        doc.addPage()
        //METAR
        doc.fontSize(14);
        doc.text("METAR", {
          underline: true,
          align: 'center',
          paragraphGap: 8,
        })
        doc.fontSize(10);
        doc.text(metars)
        // TAF
        doc.fontSize(14);
        doc.text("\n\n" + "TAF", {
          underline: true,
          align: 'center',
          paragraphGap: 8,
        })
        doc.fontSize(10);
        doc.text(tafs)

        // Create Table with the relevant minimas and add to doc
        // Define table data
        const tableData = [
          ['Time', 'Airport', 'Runway', 'Approach', 'Minimum', 'Visibility'],
        ];

        // Iterate through the airport array
        for (let i = 0; i < newAirportJson.airports.length; i++) {
          const airport = newAirportJson.airports[i];
          const newRow = ["", airport.id.toUpperCase(), airport.rwy, airport.type, airport.minima, airport.vis];
          tableData.push(newRow);
          // console.log(`ID: ${airport.id}`);
        }
        // console.log(tableData)

        const columnWidths = [80, 80, 80, 80, 80, 80];
        const rowHeight = 25;


        // Draw table
        doc.fontSize(8);
        const yOffset = (doc.page.height) - 40;
        // console.log("Length:  ", tableData.length)

        tableData.forEach((row, rowIndex) => {
          row.forEach((cell, cellIndex) => {
            const x = 30 + cellIndex * columnWidths[cellIndex];
            // const y = 10 + rowIndex * rowHeight;
            const y = yOffset - (1 + tableData.length) * rowHeight + rowIndex * rowHeight;
            // const y = pageHeight - (rowIndex * rowHeight);
            // console.log("Act. Height:  ", pageHeight - (rowIndex * rowHeight))
            // console.log("y:   ", y)

            // Draw cell rectangle
            doc.rect(x, y, columnWidths[cellIndex], rowHeight).strokeColor('black').stroke();

            if (rowIndex == 0) {
              // Draw cell text for header
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

        //end the process
        doc.end();

        // Concatenate Briefing PDF with Notam PDF and DABS PDF
        const files = [
          path.join(__dirname, '..', `/public/pdf/${pdfName}`),
          // path.join(__dirname, '..', `/public/pdf/notams.pdf`),
          // path.join(__dirname, '..', `/public/pdf/dabs.pdf`),
          // { file: path.join(__dirname, '..', `/public/pdf/${pdfName}`) }
        ];

        //Save as new file
        PDFMerge(files, { output: path.join(__dirname, '..', `/public/pdf/${pdfName}`) })
          .then((buffer) => {
            //send the address back to the browser
            res.send(`/pdf/${pdfName}`)
          });


        // delete metar taf files
        fs.unlink(metarFile, (err) => {
          if (err) {
            console.error(`Error removing file: ${err}`);
            return;
          }

          console.log(`File metar.txt has been successfully removed.`);
        });

        fs.unlink(tafFile, (err) => {
          if (err) {
            console.error(`Error removing file: ${err}`);
            return;
          }

          console.log(`File taf.txt has been successfully removed.`);
        });
      })
    })
  }
  else {
    console.log(`File ${metarFile} or ${tafFile} does not exist!`)
  }

})


router.get('/new', function (req, res, next) {
  //delete the files stored in the session
  let filenames = req.session.imagefiles;

  let deleteFiles = async (paths) => {
    let deleting = paths.map((file) => unlink(path.join(__dirname, '..', `/public/images/${file}`)))
    await Promise.all(deleting)
  }
  deleteFiles(filenames)

  //remove the data from the session
  req.session.imagefiles = undefined

  //redirect to the root URL
  res.redirect('/')
})


router.post('/delete', function (req, res, next) { 
  console.log("Delete route");
  console.log(req.body); // This should show the parsed body

})





module.exports = router;

