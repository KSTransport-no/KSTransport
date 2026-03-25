const bcrypt = require('bcryptjs');

async function testHash() {
  const password = 'demo123';
  
  // Generer ny hash
  const hash = await bcrypt.hash(password, 10);
  console.log('Generated hash:', hash);
  console.log('Hash length:', hash.length);
  
  // Test hash-en
  const isValid = await bcrypt.compare(password, hash);
  console.log('Hash is valid:', isValid);
  
  // Test med den vi prøver å bruke
  const testHash = '$2a$10$yGu4o4RYxdT2XjUj5A6XPuDZxMksZAvyYbWY/sxdcJl0iWrxyruy6';
  const testResult = await bcrypt.compare(password, testHash);
  console.log('Test hash result:', testResult);
}

testHash().catch(console.error);
