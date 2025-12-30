# Carbon Footprint Analytics

This is a Next.js app that stores emission records in MongoDB and displays visual charts.

Quick setup:

1. Create a MongoDB Atlas cluster and get the connection URI.
2. Copy `.env.sample` to `.env` or `.env.local` and set `MONGO_URL` to your Atlas URI.

   Example `.env`:

   MONGO_URL="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/carbon_footprint_db?retryWrites=true&w=majority"
   DB_NAME=carbon_footprint_db

3. Install dependencies and seed the database (seeding uses `MONGO_URL` if set, otherwise falls back to `mongodb://localhost:27017`):

```powershell
cd "C:\Users\pisep\Desktop\Code Reminder\New folder\Carbon"
npm install
npm run seed
npm run dev
```

4. Open http://localhost:3000 to view the dashboard. The `seed` script will create sample departments and ~12 months of emission data to populate the charts.

If you prefer to seed manually via the UI, open the Settings tab and add a department then upload a CSV in Data Entry.
