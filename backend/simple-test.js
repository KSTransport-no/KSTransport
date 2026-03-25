const bcrypt = require('bcryptjs');

const password = 'demo123';
const hashToTest = '$2a$10$4b61zugWng9VSQDTZbVpOuYWFc8Go5p4gZjrMhCGCJelglE8iAkBu'; // Replace with the hash from your database

async function runTest() {
    try {
        // Generate a hash
        const generatedHash = await bcrypt.hash(password, 10);
        console.log('Generated hash:', generatedHash);

        // Compare the password with the generated hash
        const compareGenerated = await bcrypt.compare(password, generatedHash);
        console.log('Compare with generated hash:', compareGenerated);

        // Compare the password with the hash from the database
        const compareDatabase = await bcrypt.compare(password, hashToTest);
        console.log('Compare with database hash:', compareDatabase);

    } catch (error) {
        console.error('Error during test:', error);
    }
}

runTest();