// import fs from "fs";
// import axios from "axios";
// import xlsx from "xlsx";

// const inputFile = "./voters.xlsx";  // Original Excel from your local system
// const outputFile = "./voters_with_latlng.xlsx"; // Will be created after geocoding

// // Read Excel
// const workbook = xlsx.readFile(inputFile);
// const sheetName = workbook.SheetNames[0];
// const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

// // Free geocoding with OpenStreetMap Nominatim
// async function geocodeAddressOSM(address) {
//   try {
//     const response = await axios.get("https://nominatim.openstreetmap.org/search", {
//       params: { q: address, format: "json", limit: 1 },
//       headers: { "User-Agent": "VoterUploadTest/1.0" } // required by Nominatim
//     });
//     if (!response.data[0]) return { lat: null, lng: null };
//     return { lat: response.data[0].lat, lng: response.data[0].lon };
//   } catch (err) {
//     console.error("Geocoding error for", address, err.message);
//     return { lat: null, lng: null };
//   }
// }

// async function process() {
//   for (let i = 0; i < sheetData.length; i++) {
//     const row = sheetData[i];
//     console.log(`Geocoding ${i + 1}/${sheetData.length}: ${row.address}`);
//     const geo = await geocodeAddressOSM(row.address);
//     row.address = `${geo.lat},${geo.lng}`; // replace address with lat,lng
//     await new Promise(r => setTimeout(r, 1000)); // pause 1s to respect free API limits
//   }

//   const newSheet = xlsx.utils.json_to_sheet(sheetData);
//   const newWorkbook = xlsx.utils.book_new();
//   xlsx.utils.book_append_sheet(newWorkbook, newSheet, "Voters");
//   xlsx.writeFile(newWorkbook, outputFile);

//   console.log(`Updated Excel saved to ${outputFile}`);
// }

// process();