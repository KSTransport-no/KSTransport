const bcrypt = require('bcryptjs');
const pool = require('./config/database'); // Adjust path as needed

const password = 'demo123';
const emails = ['ole.hansen@kstransport.no', 'kari.nordmann@kstransport.no', 'lars.andersen@kstransport.no', 'admin@kstransport.no'];

async function updatePasswords() {
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Generated hash for "demo123":', hashedPassword);

        for (const email of emails) {
            const result = await pool.query(
                'UPDATE sjåfører SET passord_hash = $1 WHERE epost = $2 RETURNING id, epost',
                [hashedPassword, email]
            );
            if (result.rows.length > 0) {
                console.log(`Updated password for: ${result.rows[0].epost}`);
            } else {
                console.log(`User not found: ${email}`);
            }
        }
        console.log('All specified passwords updated successfully.');
    } catch (error) {
        console.error('Error updating passwords:', error);
    } finally {
        pool.end(); // Close the database connection
    }
}

updatePasswords();