require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function setup() {
  try {
    console.log('🔧 Setting up Bike2Carbon database...');
    
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('✅ Schema created');

    const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
    await pool.query(seed);
    console.log('✅ Seed data inserted');

    console.log('🚲 Database setup complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Setup failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

setup();
