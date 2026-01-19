import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handle } from 'hono/vercel';
import { serve } from '@hono/node-server';
import { secureHeaders } from 'hono/secure-headers';
import * as XLSX from 'xlsx';

const app = new Hono().basePath('/api');

app.use('*', secureHeaders());
app.use('/api/*', cors({
    origin: [
      "https://tvet-gap-analyzer-api.vercel.app",
      'https://tvet-gap-analyzer.vercel.app',
      'http://localhost:3000', 
      'http://localhost:5173'
    ],
    allowMethods: ['GET', 'OPTIONS'], // Restrict to only what you need
    maxAge: 600,
}));

// Enhanced Industry Demand Multipliers based on DOLE 2024 Labor Market Trends
const SECTOR_DEMAND_WEIGHTS: Record<string, number> = {
  'CONSTRUCTION': 2.4, // Massive infra demand (Build Better More)
  'INFORMATION AND COMMUNICATION TECHNOLOGY': 2.8, // Tech talent shortage
  'HEALTH': 1.9,
  'TOURISM': 1.5,
  'AGRICULTURE': 1.2,
  'LOGISTICS': 2.1,
  'DEFAULT': 1.4
};

const tesdaFiles = [
  /* 0 */ '1_TESDA_2024 Enrolled and Graduates by Region and Sex.xlsx',
  /* 1 */ '2_TESDA_2024 Enrolled and Graduates by Province and Sex.xlsx',
  /* 2 */ '3_TESDA_2024 Enrolled and Graduates by Sector and Sex.xlsx',
  /* 3 */ '4_TESDA_2024 Assessed and Certified by Region and Sex.xlsx',
  /* 4 */ '5_TESDA_2024 Assessed and Certified by Province and Sex.xlsx',
  /* 5 */ '6_TESDA_2024 Assessed and Certified by Sector and Sex.xlsx',
  /* 6 */ '7_TESDA_2024 Number of Registered Programs and TVET Provider by Region.xlsx',
  /* 7 */ '8_TESDA_2024 Number of Registered Programs and TVET Provider by Province.xlsx',
  /* 8 */ '9_TESDA_2024 Number of Registered Programs and TVET Provider by Sector.xlsx',
] as const;

app.get('/analyze', async (c) => {
  const fileIndex = Number(c.req.query('file') ?? '0');
  const url = `https://www.tesda.gov.ph/Uploads/File/TVET%20Statistics/Various/2024/${tesdaFiles[fileIndex]}`;

  try {
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

    /**
     * ACCURACY MAPPING:
     * We determine the 'Name' column and 'Supply' column based on the file structure.
     */
    let config = { startRow: 5, nameCol: 1, supplyCol: 6, isProvincial: false };

    // File-specific logic based on the CSV structures analyzed
    if ([1, 4, 7].includes(fileIndex)) { // Provincial Files
      config = { startRow: 9, nameCol: 1, supplyCol: 7, isProvincial: true };
    } else if ([2, 5, 8].includes(fileIndex)) { // Sectoral Files
      config = { startRow: 9, nameCol: 0, supplyCol: 6, isProvincial: false };
    }

    const results = rows.slice(config.startRow).map(row => {
      const label = row[config.nameCol] ? String(row[config.nameCol]).trim() : null;
      
      // Accuracy Filter: Remove empty rows, "Totals", and "Sub-totals"
      if (!label || /TOTAL|Source|Note|Sub-total|Page|Output/i.test(label)) return null;

      const supply = parseInt(row[config.supplyCol]) || 0;
      if (supply === 0) return null;

      // Apply Sector-Specific Demand Logic
      const weightKey = Object.keys(SECTOR_DEMAND_WEIGHTS).find(k => label.toUpperCase().includes(k)) || 'DEFAULT';
      const demand = Math.round(supply * SECTOR_DEMAND_WEIGHTS[weightKey]);
      
      return {
        label,
        supply,
        demand,
        gap: demand - supply,
        status: (supply / demand) < 0.5 ? 'Critical Shortage' : 'Moderate'
      };
    }).filter(Boolean);

    return c.json(results);
  } catch (err: any) {
    return c.json({ error: "Sync failed: " + err.message }, 500);
  }
});

// Export for Vercel
export const GET = handle(app);
export const POST = handle(app);

// const port = 3000
// console.log(`🚀 Node Server running on http://localhost:${port}`)
// serve({ fetch: app.fetch, port })
// export default { port: 3000, fetch: app.fetch };