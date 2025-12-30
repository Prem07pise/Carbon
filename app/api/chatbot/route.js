import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import vm from 'vm';
import { MongoClient } from 'mongodb';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function getSeedData() {
  try {
    // Prefer reading from the live database if available — this is more reliable
    // than parsing the seed file.
    if (process.env.MONGO_URL) {
      const client = new MongoClient(process.env.MONGO_URL);
      await client.connect();
      const db = client.db(process.env.DB_NAME || 'carbon_footprint_db');
      const departments = await db.collection('departments').find({}).toArray();
      const emissions = await db.collection('emissions').find({}).sort({ createdAt: -1 }).limit(200).toArray();
      await client.close();
      return { departments, emissions };
    }

    // Fallback: attempt a safer, sandboxed evaluation of array literals
    const filePath = path.join(process.cwd(), 'seed_data.js');
    const fileContent = await fs.readFile(filePath, 'utf-8');

    const departmentsRegex = /const departments = (\[[\s\S]*?\]);/;
    const emissionsRegex = /emissions\.push\(\{[\s\S]*?\}\);/g;

    const departmentsMatch = fileContent.match(departmentsRegex);
    let departments = [];
    if (departmentsMatch) {
      try {
        // Run only the array literal in a sandbox where uuidv4 is defined.
        const script = '(' + departmentsMatch[1] + ')';
        const sandbox = { uuidv4: () => '00000000-0000-0000-0000-000000000000', Date };
        departments = vm.runInNewContext(script, sandbox);
      } catch (e) {
        console.warn('Failed to evaluate departments in sandbox, falling back to empty array', e);
        departments = [];
      }
    }

    // Emissions in seed_data.js are generated dynamically — try to extract literal
    // pushes and evaluate their object literals when possible.
    const emissionsMatches = fileContent.match(emissionsRegex) || [];
    const emissions = [];
    for (const match of emissionsMatches) {
      try {
        const objStr = match.replace(/^emissions\.push\(/, '').replace(/\);\s*$/, '');
        const script = '(' + objStr + ')';
        const sandbox = { uuidv4: () => '00000000-0000-0000-0000-000000000000', Date };
        const evaluated = vm.runInNewContext(script, sandbox);
        emissions.push(evaluated);
      } catch (e) {
        // skip entries we cannot safely evaluate
      }
    }

    return { departments, emissions };
  } catch (error) {
    console.error('Error reading seed data:', error);
    return { departments: [], emissions: [] };
  }
}

export async function POST(req) {
  try {
    const { history = [], message } = await req.json();
    const { departments, emissions } = await getSeedData();

    const context = `
      You are a carbon footprint analyst. Your role is to provide feedback and recommendations based on the user's data.
      Please provide a summary of the user's carbon footprint data in 100 words or less, formatted as a list of points.
      Here is the data for the company:
      Departments: ${JSON.stringify(departments, null, 2)}
      Emissions: ${JSON.stringify(emissions.slice(-20), null, 2)} // Last 20 for brevity
    `;

    const fullMessage = `${context}\n\nUser message: ${message}`;

    if (!process.env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ text: 'Generative AI not configured. Set GEMINI_API_KEY in .env.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      // Try the recommended model; if unavailable this may throw.
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(fullMessage);
      const response = await result.response;
      const text = response.text();

      return new Response(JSON.stringify({ text }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (inner) {
      console.error('Generative AI call failed:', inner);
      // Graceful fallback: echo the message and include the error for visibility
      const fallback = `AI unavailable: ${inner?.message || inner}. Fallback echo: ${message}`;
      return new Response(JSON.stringify({ text: fallback }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    console.error('Chatbot route error:', err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
  }
}
