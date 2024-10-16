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

  // print tabs
  // for (let tabs of pages) {
  //   let title = await tabs.title();
  //   console.log("1 " + title);
  // }


  // Finding and clicking a button with the text 'Check All NOTAMs'
  // await notampage1.$$eval('input[name="button"]', buttons => {
  //   console.log(buttons)

  //   for (const button of buttons) {
  //     console.log(button)
  //     if (button.textContent === 'Check All NOTAMs') {
  //       button.click();
  //       break; // Clicking the first matching button and exiting the loop
  //     }
  //   }
  // });

  // Make screenshot of notam page
  // await notampage1.screenshot({ path: 'screenshot.png' });
  // console.log("screenshot taken")
  browser.close()
}


// getNotams(airportsNotam)




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
        fs.appendFile('./public/metar.txt', metar, (err) => {

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
        fs.appendFile('./public/taf.txt', taf, (err) => {

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

getDabs()





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
  if (ext !== '.png' && ext !== '.jpg') {
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
  fs.unlink('./public/metar.txt', (err) => {
    if (err) {
      console.error(`Error removing file: ${err}`);
      return;
    }
  });

  fs.unlink('./public/taf.txt', (err) => {
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
  try {
    metars = getNotams(req.body.airportnames)
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


// Create PDF with images and Metar/Taf
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
  }

  // Read Metars and Tafs from txt file and add to pdf doc
  fs.readFile('./public/metar.txt', "utf8", (err, data) => {

    // In case of a error throw err.
    if (err) throw err;

    // splitdata = data.split('\n')
    // console.log(splitdata)

    // let metars = splitdata.slice(0, (splitdata.length) / 2).join("\n\n")
    let metars = data
    // let tafs = splitdata.slice((splitdata.length) / 2, -1).join("\n\n")
    // console.log("METAR : " + metars)
    // console.log("TAF : " + tafs)

    fs.readFile('./public/taf.txt', "utf8", (err, data) => {
      // In case of a error throw err.
      if (err) throw err;

      // Rearrange TAFs (new line for each new timeframe)
      let splittaf = data.split(/(?=TEMPO)|(?=BECMG)|(?=PROB)/)
      let tafs = splittaf.join("\n     ")


      //metars = data

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
      // // TAF
      doc.fontSize(14);
      doc.text("\n\n" + "TAF", {
        underline: true,
        align: 'center',
        paragraphGap: 8,
      })
      doc.fontSize(10);
      doc.text(tafs)

      //end the process
      doc.end();

      // Concatenate Briefing PDF with Notam PDF 
      const files = [
        path.join(__dirname, '..', `/public/pdf/${pdfName}`),
        path.join(__dirname, '..', `/public/pdf/notams.pdf`),
        path.join(__dirname, '..', `/public/pdf/dabs.pdf`),
        // { file: path.join(__dirname, '..', `/public/pdf/${pdfName}`) }
      ];

      //Save as new file
      PDFMerge(files, { output: path.join(__dirname, '..', `/public/pdf/${pdfName}`) })
        .then((buffer) => {
          //send the address back to the browser
          res.send(`/pdf/${pdfName}`)
        });


      // delete metar taf files
      fs.unlink('./public/metar.txt', (err) => {
        if (err) {
          console.error(`Error removing file: ${err}`);
          return;
        }

        console.log(`File has been successfully removed.`);
      });

      fs.unlink('./public/taf.txt', (err) => {
        if (err) {
          console.error(`Error removing file: ${err}`);
          return;
        }

        console.log(`File has been successfully removed.`);
      });
    })
  })
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


module.exports = router;

