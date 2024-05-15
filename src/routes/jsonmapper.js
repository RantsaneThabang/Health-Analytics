const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

// Create a pool for connecting to the database
const pool = new Pool({
  user: 'admin',
  host: '0.0.0.0',
  database: 'hapi',
  password: 'admin',
  port: 5434,
});

// Endpoint for processing FHIR API resource
router.post('/resources', async (req, res) => {
  try {
    const resource = req.body;
    await main(resource);
    res.status(200).json({ message: 'Data processed successfully' });
  } catch (error) {
    console.error('Error processing data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Main function to process FHIR API resource
async function main(resource) {
  // Create tables if not already exists
  //await createTables();
  var codeData=0;
  var bundleId=0;
  var observationData=0;


  // Check if the resource is a bundle
  if ((resource.resourceType === 'Bundle' || resource.resourceType === 'Observation') && Array.isArray(resource.entry)) {    // Retrieve id under bundle
    bundleId = resource.id;

    // Process each entry in the bundle
    for (const entry of resource.entry) {
      if (entry.resource) {
        // Retrieve code under code
        codeData = entry.resource.code;

        // Retrieve observation under resource
        const observationData = entry.resource;

        await processResource(observationData);
      }
    }

    console.log('Bundle ID:', bundleId);
    console.log('Code Data:', codeData);
    console.log('Observation Data:', observationData);
  } else {
    // Process the single resource
    await processResource(resource);
  }
}
async function processResource(resource) {
  // Get resource type
  const resourceType = getResourceType(resource);
  console.log('Resource Type:', resourceType);

  // Extract attributes and values dynamically
  const attributes = Object.keys(resource);
  const values = Object.values(resource);

  // Check if the resource type is "Observation"
  if (resourceType === 'Observation') {
    // Extract the PATIENT_ID and CONCEPT_ID from the resource
    const patientId = resource.subject.reference.split('/').pop();
    const conceptIds = resource.code.coding[1].code; // Extract the first concept id
  
    console.log('Patient ID:', patientId);
    console.log('Concept IDs:', conceptIds);
  
    // New code added here for processing Observation data
    const observationId = resource.id;
    const conceptAnswerBool = resource.valueBoolean !== undefined ? resource.valueBoolean : null;
    const conceptAnswerDate = resource.valueDateTime !== undefined ? resource.valueDateTime : null;
  
    // Insert data into the OBSERVATION table
    await insertData('OBSERVATION', ['OBSERVATION_ID', 'CONCEPT_ANSWER_BOOL', 'CONCEPT_ANSWER_DATE', 'PATIENT_ID', 'CONCEPT_ID'], [observationId, conceptAnswerBool, conceptAnswerDate, patientId, conceptIds]);
  
    // Insert data into the OBSERVATION table for PATIENT_ID and CONCEPT_ID
    //await insertData('OBSERVATION', ['PATIENT_ID', 'CONCEPT_ID'], [patientId, conceptIds]);
  }
   else if (resourceType === 'Patient') {
      // Extract specific attributes for Patient resource
      const patientId = resource.id;
      const gender = resource.gender;
      const birthdate = resource.birthDate; // Corrected birthDate

      // Extract address with specific criteria from the address array
      let address = '';
      if (resource.address && Array.isArray(resource.address)) {
          for (const addr of resource.address) {
              if (addr.extension && Array.isArray(addr.extension)) {
                  for (const ext of addr.extension) {
                      if (ext.extension && Array.isArray(ext.extension)) {
                          for (const subExt of ext.extension) {
                              // Assuming the URL contains the specific criteria
                              if (subExt.url && subExt.valueString) {
                                  // Check for specific criteria in URL and valueString
                                  if (subExt.url.includes('address') && subExt.valueString) {
                                      address = subExt.valueString;
                                      break;
                                  }
                              }
                          }
                      }
                      if (address !== '') {
                          break;
                      }
                  }
              }
              if (address !== '') {
                  break;
              }
          }
      }

      console.log('Patient ID:', patientId);
      console.log('Gender:', gender);
      console.log('Birthdate:', birthdate);
      console.log('Address:', address);

      // Insert data into the PATIENT table
      await insertData('PATIENT', ['id', 'gender', 'birthdate', 'address'], [patientId, gender, birthdate, address]);
  } else {
      // Insert data into corresponding tables
      console.log('Data attributes:', attributes);
      console.log('Data values:', values);
      await insertData(resourceType, attributes, values);
  }
}




// Function to create tables in the database
async function createTables() {
  // Create tables if not already exists
  // Use the provided SQL statements for creating tables
}

// Function to determine the resource type
function getResourceType(resource) {
  // Assume resource type is the key in the resource object
  const resourceType = resource.resourceType;
  console.log('Resource Type:', resourceType);
  return resourceType;
}
function getTableName(resourceType) {
  // Log the resourceType
  console.log('Resource Type1:', resourceType);
  
  // Define table names for different resource types
  let tableName = '';
  if (resourceType === 'OBSERVATION') {
    tableName = 'Observation';
  } else if (resourceType === 'PATIENT') {
    tableName = 'Patient';
  } else if (resourceType === 'Condition') {
    tableName = 'CONDITION';
  }
  // Add more conditions for other resource types as needed

  // Return table name for the given resource type
  return tableName;
}


// Function to insert data into corresponding tables
// Function to insert data into corresponding tables
async function insertData(resourceType, attributes, values) {
  try {
    const client = await pool.connect();
    let tableName = getTableName(resourceType);
    console.log('TableName', tableName);
    
    // Insert data into corresponding tables based on resource type
    if (tableName === 'Observation') {
      const query = `INSERT INTO ${tableName} (${attributes.join(', ')}) VALUES (${values.map((_, i) => `$${i + 1}`).join(', ')})`;
      
      console.log('Query:', query);
      
      await client.query(query, values);
      client.release();
      console.log(`Data inserted successfully into ${tableName}`);
    } else if (tableName === 'Patient') {
      const query = `INSERT INTO ${tableName} (${attributes.join(', ')}) VALUES (${values.map((_, i) => `$${i + 1}`).join(', ')})`;
      
      console.log('Query:', query);
      
      await client.query(query, values);
      client.release();
      console.log(`Data inserted successfully into ${tableName}`);
    } else {
      console.error('Error: Incorrect table for insertion.');
    }
  } catch (error) {
    console.error('Error inserting data:', error);
    throw error;
  }
}




module.exports = router;