const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

// Create a pool for connecting to the database
const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'hapi',
  password: 'admin',
  port: 5432,
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
  await createTables();
  var codeData=0;
  var bundleId=0;
  var observationData=0;


  // Check if the resource is a bundle
  if (resource.resourceType === 'Bundle' && Array.isArray(resource.entry)) {
    // Retrieve id under bundle
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

// Function to process a single resource
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
    const conceptIds = resource.code.coding[0].code; // Extract the first concept id
    //const conceptIds = resource.code.coding.map(coding => coding.code);

    console.log('Patient ID:', patientId);
    console.log('Concept IDs:', conceptIds);

    // Insert data into the OBSERVATION table
    await insertData('OBSERVATION', ['PATIENT_ID', 'CONCEPT_ID'], [patientId, conceptIds]);
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

// Function to insert data into corresponding tables
async function insertData(resourceType, attributes, values) {
  try {
    const client = await pool.connect();
    const tableName = getTableName(resourceType);
    
    // Define specific attributes for the OBSERVATION table
    const specificAttributes = ['PATIENT_ID', 'CONCEPT_ID']; // Specific attributes for the OBSERVATION table
    
    // Filter out only the specific attributes and values for insertion
    const filteredAttributes = attributes.filter(attr => specificAttributes.includes(attr));
    const filteredValues = values.filter((_, index) => specificAttributes.includes(attributes[index]));
    
    // Insert data into the OBSERVATION table
    if (tableName === 'OBSERVATION' && filteredAttributes.length === 2) {
      const columns = filteredAttributes.join(', ');
      const placeholders = filteredValues.map((_, index) => `$${index + 1}`).join(', ');
      const query = `INSERT INTO ${tableName} (PATIENT_ID, CONCEPT_ID) VALUES ($1, $2)`;
      
      console.log('Query:', query);
      
      await client.query(query, filteredValues);
      client.release();
      console.log(`Data inserted successfully into ${tableName}`);
    } else {
      console.error('Error: Incorrect table or attributes for insertion.');
    }
  } catch (error) {
    console.error('Error inserting data:', error);
    throw error; // Rethrow the error to handle it in the calling function
  }
}// Function to get table name for a given resource type
function getTableName(resourceType) {
  // Define table names for different resource types
  const tableNames = {
    'Observation': 'Observation',
    'Patient': 'PATIENT',
    'Condition': 'CONDITION',
    // Add table names for other resource types as needed
  };

  // Return table name for the given resource type
  return tableNames[resourceType] || '';
}

module.exports = router;