// Harvest service - handles term harvesting from SPARQL endpoints

const { spawn } = require("child_process");
const path = require("path");
const config = require("../config");

/**
 * Validate and sanitize collection URI
 * 
 * @param {string} uri - URI to validate
 * @returns {boolean} True if valid
 * @throws {Error} If URI is invalid
 */
function validateCollectionUri(uri) {
  if (!uri || typeof uri !== 'string') {
    throw new Error('Collection URI must be a non-empty string');
  }
  
  // Must be a valid HTTP/HTTPS URL
  if (!uri.match(/^https?:\/\//)) {
    throw new Error('Collection URI must start with http:// or https://');
  }
  
  // Prevent command injection by checking for suspicious characters
  // Block shell metacharacters: ; & | ` $ ( ) [ ] \ < > ' "
  if (uri.match(/[;&|`$()[\\\]\\<>'"]/)) {
    throw new Error('Collection URI contains invalid characters');
  }
  
  return true;
}

/**
 * Execute the Python harvest script to fetch terms from a SKOS collection
 * 
 * Note: We use Promise wrapper here because child_process.spawn is callback-based
 * and doesn't natively support async/await. This is the standard pattern for
 * promisifying callback-based Node.js APIs.
 * 
 * @param {string} collectionUri - URI of the SKOS collection to harvest
 * @returns {Promise<{success: boolean, termsInserted: number, termsUpdated: number, fieldsInserted: number, output: string}>}
 */
async function harvestCollection(collectionUri) {
  return new Promise((resolve, reject) => {
    // Validate URI before passing to subprocess
    try {
      validateCollectionUri(collectionUri);
    } catch (err) {
      reject(err);
      return;
    }
    
    const pythonScript = path.join(__dirname, "harvest.py");
    const dbPath = config.translations.dbPath;

    console.log(`[Harvest] Starting harvest for collection: ${collectionUri}`);
    console.log(`[Harvest] Database path: ${dbPath}`);
    console.log(`[Harvest] Python script: ${pythonScript}`);

    // Spawn Python process
    const pythonProcess = spawn("python3", [pythonScript, collectionUri, dbPath]);

    let output = "";
    let errorOutput = "";

    // Capture stdout
    pythonProcess.stdout.on("data", (data) => {
      const chunk = data.toString();
      output += chunk;
      console.log(`[Harvest] ${chunk.trim()}`);
    });

    // Capture stderr
    pythonProcess.stderr.on("data", (data) => {
      const chunk = data.toString();
      errorOutput += chunk;
      console.error(`[Harvest Error] ${chunk.trim()}`);
    });

    // Handle process completion
    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        console.error(`[Harvest] Process exited with code ${code}`);
        reject(new Error(`Harvest failed: ${errorOutput || output}`));
        return;
      }

      // Parse the harvest summary from output
      const result = parseHarvestOutput(output);
      console.log(`[Harvest] Completed successfully`, result);
      resolve(result);
    });

    // Handle process errors
    pythonProcess.on("error", (error) => {
      console.error(`[Harvest] Failed to start process:`, error);
      reject(new Error(`Failed to start harvest process: ${error.message}`));
    });
  });
}

/**
 * Parse harvest output to extract statistics
 * 
 * @param {string} output - Output from the Python harvest script
 * @returns {{success: boolean, termsInserted: number, termsUpdated: number, fieldsInserted: number, output: string}}
 */
function parseHarvestOutput(output) {
  const result = {
    success: true,
    termsInserted: 0,
    termsUpdated: 0,
    fieldsInserted: 0,
    output: output,
  };

  // Extract statistics from output
  const termsInsertedMatch = output.match(/New terms inserted:\s*(\d+)/);
  const termsUpdatedMatch = output.match(/Existing terms updated:\s*(\d+)/);
  const fieldsInsertedMatch = output.match(/New term fields inserted:\s*(\d+)/);

  if (termsInsertedMatch) {
    result.termsInserted = parseInt(termsInsertedMatch[1], 10);
  }
  if (termsUpdatedMatch) {
    result.termsUpdated = parseInt(termsUpdatedMatch[1], 10);
  }
  if (fieldsInsertedMatch) {
    result.fieldsInserted = parseInt(fieldsInsertedMatch[1], 10);
  }

  return result;
}

module.exports = {
  harvestCollection,
};
