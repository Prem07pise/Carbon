import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'carbon_footprint_db';

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = await MongoClient.connect(MONGO_URL);
  const db = client.db(DB_NAME);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

// EPA Emission Factors (lbs CO2 per unit)
const EMISSION_FACTORS = {
  electricity: {
    grid: { factor: 0.92, unit: 'kWh', name: 'Grid Electricity' },
    solar: { factor: 0, unit: 'kWh', name: 'Solar Energy' },
    wind: { factor: 0, unit: 'kWh', name: 'Wind Energy' }
  },
  transportation: {
    gasoline: { factor: 19.6, unit: 'gallon', name: 'Gasoline Vehicle' },
    diesel: { factor: 22.4, unit: 'gallon', name: 'Diesel Vehicle' },
    electric: { factor: 0.36, unit: 'mile', name: 'Electric Vehicle' },
    hybrid: { factor: 0.5, unit: 'mile', name: 'Hybrid Vehicle' },
    publicTransit: { factor: 0.14, unit: 'mile', name: 'Public Transit' },
    flight: { factor: 0.4, unit: 'mile', name: 'Air Travel' }
  },
  heating: {
    naturalGas: { factor: 117, unit: 'therm', name: 'Natural Gas' },
    heatingOil: { factor: 22.4, unit: 'gallon', name: 'Heating Oil' },
    propane: { factor: 12.7, unit: 'gallon', name: 'Propane' },
    electric: { factor: 3.412, unit: 'kWh', name: 'Electric Heating' }
  },
  waste: {
    landfill: { factor: 2072, unit: 'ton', name: 'Landfill Waste' },
    recycled: { factor: 0, unit: 'ton', name: 'Recycled' },
    composted: { factor: 0, unit: 'ton', name: 'Composted' }
  }
};

function calculateEmissions(category, subcategory, value) {
  const factor = EMISSION_FACTORS[category]?.[subcategory]?.factor || 0;
  const co2Lbs = value * factor;
  const co2Kg = co2Lbs * 0.453592; // Convert lbs to kg
  return {
    co2Lbs: Math.round(co2Lbs * 100) / 100,
    co2Kg: Math.round(co2Kg * 100) / 100,
    factor,
    unit: EMISSION_FACTORS[category]?.[subcategory]?.unit || ''
  };
}

export async function GET(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/', '');

  try {
    const { db } = await connectToDatabase();

    // GET /api/emissions - Get all emissions with filters
    if (path === 'emissions' || path === 'emissions/') {
      const department = url.searchParams.get('department');
      const category = url.searchParams.get('category');
      const startDate = url.searchParams.get('startDate');
      const endDate = url.searchParams.get('endDate');

      const query = {};
      if (department && department !== 'all') query.department = department;
      if (category && category !== 'all') query.category = category;
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = startDate;
        if (endDate) query.date.$lte = endDate;
      }

      const emissions = await db.collection('emissions')
        .find(query)
        .sort({ date: -1 })
        .toArray();

      return Response.json({ success: true, data: emissions });
    }

    // GET /api/departments - Get all departments
    if (path === 'departments' || path === 'departments/') {
      const departments = await db.collection('departments').find({}).toArray();
      return Response.json({ success: true, data: departments });
    }

    // GET /api/analytics/summary - Get summary analytics
    if (path === 'analytics/summary') {
      const department = url.searchParams.get('department');
      const startDate = url.searchParams.get('startDate');
      const endDate = url.searchParams.get('endDate');

      const query = {};
      if (department && department !== 'all') query.department = department;
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = startDate;
        if (endDate) query.date.$lte = endDate;
      }

      const emissions = await db.collection('emissions').find(query).toArray();

      const totalEmissions = emissions.reduce((sum, e) => sum + (e.co2Kg || 0), 0);
      const categoryBreakdown = {};
      const departmentBreakdown = {};
      const monthlyData = {};

      emissions.forEach(emission => {
        // Category breakdown
        if (!categoryBreakdown[emission.category]) {
          categoryBreakdown[emission.category] = 0;
        }
        categoryBreakdown[emission.category] += emission.co2Kg || 0;

        // Department breakdown
        if (!departmentBreakdown[emission.department]) {
          departmentBreakdown[emission.department] = 0;
        }
        departmentBreakdown[emission.department] += emission.co2Kg || 0;

        // Monthly data
        const month = emission.date.substring(0, 7); // YYYY-MM
        if (!monthlyData[month]) {
          monthlyData[month] = 0;
        }
        monthlyData[month] += emission.co2Kg || 0;
      });

      // Calculate previous period for comparison
      const currentDate = new Date();
      const lastMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1).toISOString().split('T')[0];
      const lastMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).toISOString().split('T')[0];
      
      const lastMonthQuery = {
        date: { $gte: lastMonthStart, $lte: lastMonthEnd }
      };
      if (department && department !== 'all') lastMonthQuery.department = department;
      
      const lastMonthEmissions = await db.collection('emissions').find(lastMonthQuery).toArray();
      const lastMonthTotal = lastMonthEmissions.reduce((sum, e) => sum + (e.co2Kg || 0), 0);

      // Calculate two months ago for trend
      const twoMonthsAgoStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 1).toISOString().split('T')[0];
      const twoMonthsAgoEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 0).toISOString().split('T')[0];
      
      const twoMonthsAgoQuery = {
        date: { $gte: twoMonthsAgoStart, $lte: twoMonthsAgoEnd }
      };
      if (department && department !== 'all') twoMonthsAgoQuery.department = department;
      
      const twoMonthsAgoEmissions = await db.collection('emissions').find(twoMonthsAgoQuery).toArray();
      const twoMonthsAgoTotal = twoMonthsAgoEmissions.reduce((sum, e) => sum + (e.co2Kg || 0), 0);

      const monthOverMonthChange = twoMonthsAgoTotal > 0 
        ? ((lastMonthTotal - twoMonthsAgoTotal) / twoMonthsAgoTotal * 100).toFixed(1)
        : 0;

      return Response.json({
        success: true,
        data: {
          totalEmissions: Math.round(totalEmissions * 100) / 100,
          totalRecords: emissions.length,
          categoryBreakdown,
          departmentBreakdown,
          monthlyData,
          lastMonthTotal: Math.round(lastMonthTotal * 100) / 100,
          monthOverMonthChange: parseFloat(monthOverMonthChange)
        }
      });
    }

    // GET /api/analytics/trends - Get trend data for charts
    if (path === 'analytics/trends') {
      const department = url.searchParams.get('department');
      const months = parseInt(url.searchParams.get('months') || '12');

      const query = {};
      if (department && department !== 'all') query.department = department;

      const emissions = await db.collection('emissions').find(query).toArray();

      // Group by month
      const monthlyTrends = {};
      emissions.forEach(emission => {
        const month = emission.date.substring(0, 7);
        if (!monthlyTrends[month]) {
          monthlyTrends[month] = {
            month,
            electricity: 0,
            transportation: 0,
            heating: 0,
            waste: 0,
            total: 0
          };
        }
        const category = emission.category;
        monthlyTrends[month][category] = (monthlyTrends[month][category] || 0) + (emission.co2Kg || 0);
        monthlyTrends[month].total += emission.co2Kg || 0;
      });

      // Sort by month and get last N months
      const sortedTrends = Object.values(monthlyTrends)
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-months);

      return Response.json({ success: true, data: sortedTrends });
    }

    // GET /api/recommendations - Get AI recommendations
    if (path === 'recommendations' || path === 'recommendations/') {
      const department = url.searchParams.get('department');
      
      const query = {};
      if (department && department !== 'all') query.department = department;
      
      const emissions = await db.collection('emissions').find(query).toArray();
      
      const categoryTotals = {};
      emissions.forEach(e => {
        categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.co2Kg;
      });

      const recommendations = [];

      // Generate recommendations based on highest emissions
      const sortedCategories = Object.entries(categoryTotals)
        .sort(([, a], [, b]) => b - a);

      sortedCategories.forEach(([category, total], index) => {
        if (index < 3) { // Top 3 categories
          const percentage = ((total / Object.values(categoryTotals).reduce((a, b) => a + b, 0)) * 100).toFixed(1);
          
          let recommendation = {};
          
          if (category === 'electricity') {
            recommendation = {
              id: uuidv4(),
              category,
              priority: 'high',
              title: 'Switch to Renewable Energy',
              description: `Electricity accounts for ${percentage}% of your emissions (${Math.round(total)} kg CO2). Consider installing solar panels or switching to a renewable energy provider.`,
              potentialReduction: `${Math.round(total * 0.7)} kg CO2/year`,
              estimatedCost: '$15,000 - $25,000 (solar installation)',
              paybackPeriod: '7-10 years'
            };
          } else if (category === 'transportation') {
            recommendation = {
              id: uuidv4(),
              category,
              priority: 'high',
              title: 'Optimize Fleet & Promote EVs',
              description: `Transportation represents ${percentage}% of emissions (${Math.round(total)} kg CO2). Transition to electric or hybrid vehicles and encourage carpooling.`,
              potentialReduction: `${Math.round(total * 0.5)} kg CO2/year`,
              estimatedCost: '$30,000 - $50,000 per EV',
              paybackPeriod: '5-8 years'
            };
          } else if (category === 'heating') {
            recommendation = {
              id: uuidv4(),
              category,
              priority: 'medium',
              title: 'Improve Insulation & Upgrade HVAC',
              description: `Heating/cooling is ${percentage}% of your footprint (${Math.round(total)} kg CO2). Improve building insulation and upgrade to energy-efficient HVAC systems.`,
              potentialReduction: `${Math.round(total * 0.3)} kg CO2/year`,
              estimatedCost: '$5,000 - $15,000',
              paybackPeriod: '3-5 years'
            };
          } else if (category === 'waste') {
            recommendation = {
              id: uuidv4(),
              category,
              priority: 'medium',
              title: 'Implement Recycling & Composting Program',
              description: `Waste contributes ${percentage}% to emissions (${Math.round(total)} kg CO2). Start comprehensive recycling and composting programs.`,
              potentialReduction: `${Math.round(total * 0.8)} kg CO2/year`,
              estimatedCost: '$2,000 - $5,000',
              paybackPeriod: '2-3 years'
            };
          }
          
          recommendations.push(recommendation);
        }
      });

      // Add general recommendations
      if (recommendations.length < 3) {
        recommendations.push({
          id: uuidv4(),
          category: 'general',
          priority: 'low',
          title: 'Conduct Energy Audit',
          description: 'Perform a comprehensive energy audit to identify additional reduction opportunities.',
          potentialReduction: 'Variable',
          estimatedCost: '$500 - $2,000',
          paybackPeriod: 'Immediate insights'
        });
      }

      return Response.json({ success: true, data: recommendations });
    }

    // GET /api/emission-factors - Get all emission factors
    if (path === 'emission-factors' || path === 'emission-factors/') {
      return Response.json({ success: true, data: EMISSION_FACTORS });
    }

    return Response.json({ error: 'Endpoint not found' }, { status: 404 });

  } catch (error) {
    console.error('GET Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/', '');

  try {
    const { db } = await connectToDatabase();
    const body = await request.json();

    // POST /api/emissions - Create new emission record
    if (path === 'emissions' || path === 'emissions/') {
      const { date, category, subcategory, value, unit, department, notes } = body;

      if (!date || !category || !subcategory || value === undefined || !department) {
        return Response.json(
          { error: 'Missing required fields: date, category, subcategory, value, department' },
          { status: 400 }
        );
      }

      const calculation = calculateEmissions(category, subcategory, parseFloat(value));

      const emission = {
        id: uuidv4(),
        date,
        category,
        subcategory,
        value: parseFloat(value),
        unit: unit || calculation.unit,
        department,
        notes: notes || '',
        co2Lbs: calculation.co2Lbs,
        co2Kg: calculation.co2Kg,
        emissionFactor: calculation.factor,
        createdAt: new Date().toISOString()
      };

      await db.collection('emissions').insertOne(emission);

      return Response.json({ success: true, data: emission }, { status: 201 });
    }

    // POST /api/emissions/bulk - Bulk upload emissions
    if (path === 'emissions/bulk') {
      const { emissions } = body;

      if (!Array.isArray(emissions) || emissions.length === 0) {
        return Response.json(
          { error: 'emissions array is required and must not be empty' },
          { status: 400 }
        );
      }

      const processedEmissions = emissions.map(e => {
        const calculation = calculateEmissions(e.category, e.subcategory, parseFloat(e.value));
        return {
          id: uuidv4(),
          date: e.date,
          category: e.category,
          subcategory: e.subcategory,
          value: parseFloat(e.value),
          unit: e.unit || calculation.unit,
          department: e.department,
          notes: e.notes || '',
          co2Lbs: calculation.co2Lbs,
          co2Kg: calculation.co2Kg,
          emissionFactor: calculation.factor,
          createdAt: new Date().toISOString()
        };
      });

      await db.collection('emissions').insertMany(processedEmissions);

      return Response.json(
        { success: true, data: { imported: processedEmissions.length } },
        { status: 201 }
      );
    }

    // POST /api/departments - Create new department
    if (path === 'departments' || path === 'departments/') {
      const { name, description } = body;

      if (!name) {
        return Response.json({ error: 'Department name is required' }, { status: 400 });
      }

      const department = {
        id: uuidv4(),
        name,
        description: description || '',
        createdAt: new Date().toISOString()
      };

      await db.collection('departments').insertOne(department);

      return Response.json({ success: true, data: department }, { status: 201 });
    }

    return Response.json({ error: 'Endpoint not found' }, { status: 404 });

  } catch (error) {
    console.error('POST Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/', '');

  try {
    const { db } = await connectToDatabase();

    // DELETE /api/emissions/:id
    if (path.startsWith('emissions/')) {
      const id = path.split('/')[1];
      
      const result = await db.collection('emissions').deleteOne({ id });

      if (result.deletedCount === 0) {
        return Response.json({ error: 'Emission record not found' }, { status: 404 });
      }

      return Response.json({ success: true, message: 'Emission record deleted' });
    }

    return Response.json({ error: 'Endpoint not found' }, { status: 404 });

  } catch (error) {
    console.error('DELETE Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/', '');

  try {
    const { db } = await connectToDatabase();
    const body = await request.json();

    // PUT /api/emissions/:id - Update emission record
    if (path.startsWith('emissions/')) {
      const id = path.split('/')[1];
      const { date, category, subcategory, value, unit, department, notes } = body;

      const updateData = {};
      if (date) updateData.date = date;
      if (category) updateData.category = category;
      if (subcategory) updateData.subcategory = subcategory;
      if (department) updateData.department = department;
      if (notes !== undefined) updateData.notes = notes;
      
      if (value !== undefined) {
        const calculation = calculateEmissions(
          category || body.category,
          subcategory || body.subcategory,
          parseFloat(value)
        );
        updateData.value = parseFloat(value);
        updateData.co2Lbs = calculation.co2Lbs;
        updateData.co2Kg = calculation.co2Kg;
        updateData.emissionFactor = calculation.factor;
        if (unit) updateData.unit = unit;
      }

      updateData.updatedAt = new Date().toISOString();

      const result = await db.collection('emissions').updateOne(
        { id },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return Response.json({ error: 'Emission record not found' }, { status: 404 });
      }

      const updated = await db.collection('emissions').findOne({ id });

      return Response.json({ success: true, data: updated });
    }

    return Response.json({ error: 'Endpoint not found' }, { status: 404 });

  } catch (error) {
    console.error('PUT Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}