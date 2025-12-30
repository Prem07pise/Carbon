require('dotenv').config();
const { MongoClient } = require('mongodb');
const { v4: uuidv4 } = require('uuid');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'carbon_footprint_db';

async function seedData() {
  const client = await MongoClient.connect(MONGO_URL);
  const db = client.db(DB_NAME);

  console.log('🌱 Seeding database...');

  // Clear existing data
  await db.collection('departments').deleteMany({});
  await db.collection('emissions').deleteMany({});

  // Create departments
  const departments = [
    { id: uuidv4(), name: 'Operations', description: 'Main operations department', createdAt: new Date().toISOString() },
    { id: uuidv4(), name: 'IT Department', description: 'Information Technology', createdAt: new Date().toISOString() },
    { id: uuidv4(), name: 'Facilities', description: 'Building facilities management', createdAt: new Date().toISOString() },
    { id: uuidv4(), name: 'Transportation', description: 'Fleet and logistics', createdAt: new Date().toISOString() }
  ];

  await db.collection('departments').insertMany(departments);
  console.log(`✅ Created ${departments.length} departments`);

  // Generate sample emissions data for the last 12 months
  const emissions = [];
  const categories = ['electricity', 'transportation', 'heating', 'waste'];
  const subcategories = {
    electricity: ['grid', 'solar'],
    transportation: ['gasoline', 'diesel', 'electric', 'publicTransit'],
    heating: ['naturalGas', 'electric'],
    waste: ['landfill', 'recycled']
  };

  const emissionFactors = {
    electricity: { grid: 0.92, solar: 0 },
    transportation: { gasoline: 19.6, diesel: 22.4, electric: 0.36, publicTransit: 0.14 },
    heating: { naturalGas: 117, electric: 3.412 },
    waste: { landfill: 2072, recycled: 0 }
  };

  const units = {
    electricity: 'kWh',
    transportation: { gasoline: 'gallon', diesel: 'gallon', electric: 'mile', publicTransit: 'mile' },
    heating: { naturalGas: 'therm', electric: 'kWh' },
    waste: 'ton'
  };

  // Generate data for last 12 months
  for (let monthsAgo = 11; monthsAgo >= 0; monthsAgo--) {
    const date = new Date();
    date.setMonth(date.getMonth() - monthsAgo);
    const dateStr = date.toISOString().split('T')[0];

    // Generate 5-10 records per month
    const recordsThisMonth = 5 + Math.floor(Math.random() * 6);
    
    for (let i = 0; i < recordsThisMonth; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const subcategoryList = subcategories[category];
      const subcategory = subcategoryList[Math.floor(Math.random() * subcategoryList.length)];
      const department = departments[Math.floor(Math.random() * departments.length)];

      // Generate realistic values based on category
      let value;
      if (category === 'electricity') {
        value = 500 + Math.random() * 2000; // 500-2500 kWh
      } else if (category === 'transportation') {
        if (subcategory === 'gasoline' || subcategory === 'diesel') {
          value = 50 + Math.random() * 200; // 50-250 gallons
        } else {
          value = 100 + Math.random() * 500; // 100-600 miles
        }
      } else if (category === 'heating') {
        if (subcategory === 'naturalGas') {
          value = 20 + Math.random() * 80; // 20-100 therms
        } else {
          value = 200 + Math.random() * 800; // 200-1000 kWh
        }
      } else if (category === 'waste') {
        value = 0.1 + Math.random() * 0.9; // 0.1-1 ton
      }

      // Calculate emissions
      const factor = emissionFactors[category][subcategory];
      const co2Lbs = value * factor;
      const co2Kg = co2Lbs * 0.453592;

      const unit = typeof units[category] === 'object' 
        ? units[category][subcategory] 
        : units[category];

      emissions.push({
        id: uuidv4(),
        date: dateStr,
        category,
        subcategory,
        value: Math.round(value * 100) / 100,
        unit,
        department: department.id,
        notes: '',
        co2Lbs: Math.round(co2Lbs * 100) / 100,
        co2Kg: Math.round(co2Kg * 100) / 100,
        emissionFactor: factor,
        createdAt: new Date().toISOString()
      });
    }
  }

  await db.collection('emissions').insertMany(emissions);
  console.log(`✅ Created ${emissions.length} emission records`);

  console.log('🎉 Database seeded successfully!');
  console.log(`   - Departments: ${departments.length}`);
  console.log(`   - Emissions: ${emissions.length}`);

  await client.close();
}

seedData().catch(console.error);
