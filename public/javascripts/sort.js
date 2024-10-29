import Sortable from '/javascripts/sortable.core.esm.js';

//use sortablejs on the container element for the image tags
let list = document.querySelector('div');
let sort = Sortable.create(list);

let convertButton = document.querySelector('a.convert');
let downloadButton = document.querySelector('a.download');
let metar = document.querySelectorAll('a.checkwx');


//When the convert button is clicked
convertButton.onclick = function () {
    let images = document.querySelectorAll('img');
    let loader = document.querySelector('span.loader');
    let convertText = document.querySelector('span.text');

    let filenames = [];
    //extract the image names into an array
    for (let image of images) {
        filenames.push(image.dataset.name)
    }
    //activate loading animation
    loader.style.display = 'inline-block';
    convertText.style.display = 'none'

    //Create a post request that'll send the image filenames to the '/pdf' route and receive the link to the PDF file
    fetch('/pdf', {
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(filenames)
    })
        .then((resp) => {
            return resp.text()
        })
        .then((data) => {
            //stop the loading animation
            loader.style.display = 'none';

            //display the convert and download button
            convertText.style.display = 'inline-block'
            downloadButton.style.display = 'inline-block'

            //attach the address to the download button
            downloadButton.href = data
        })
        .catch((error) => {
            console.error(error.message)
        })
}



downloadButton.onclick = function (event) {
    event.preventDefault(); // Prevent any default behavior

    let pdfLink = downloadButton.getAttribute('href');
    
    if (!pdfLink) {
        console.error('No PDF link found');
        return; // Exit if no link is found
    }

    // Update UI component visibility
    downloadButton.style.display = 'none';
    convertButton.style.display = 'none';
    
    // Start the download
    fetch(pdfLink)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to download file: ${response.status}`);
            }
            return response.blob(); // Convert response to Blob
        })
        .then(blob => {
            // Create a URL for the Blob
            const url = window.URL.createObjectURL(blob);
            
            // Create a link element to trigger the download
            const a = document.createElement('a');
            a.href = url;
            a.download = pdfLink.split('/').pop(); // Use the filename from the URL
            document.body.appendChild(a);
            a.click(); // Trigger the download
            a.remove(); // Remove the link element
            window.URL.revokeObjectURL(url); // Release the Blob URL
            
            // After the download, send a request to delete the file
            return fetch('/delete', {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ link: pdfLink }) // Sending the link for deletion
            });
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error deleting file: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('File deleted:', data); // Handle deletion success
            fetch('/', {
                method: 'GET',
                headers: {
                    "Content-Type": "application/json"
                }
            })
        })
        .catch(error => {
            console.error('Error:', error); // Handle any errors
        });
};


