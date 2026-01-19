# TVET-Employment Gap Analyzer (Backend)

A high-performance API built with **Hono** and **Bun** that processes real-time TESDA (Technical Education and Skills Development Authority) statistics and maps them against industry demand projections.

## 🚀 Features
- **Excel Stream Processing:** Uses `xlsx` to parse remote `.xlsx` files directly from TESDA's servers without local storage.
- **Labor Market Logic:** Implements a demand-multiplier algorithm based on 2024 DOLE (Department of Labor and Employment) labor market trends.
- **Dynamic Configuration:** Automatically adjusts row offsets and column mapping based on whether the source file is Regional, Provincial, or Sectoral.
- **CORS Enabled:** Pre-configured for seamless integration with the frontend.

## 🛠️ Tech Stack
- [Hono](https://hono.dev/) - Ultra-fast web framework.
- [SheetJS (XLSX)](https://sheetjs.com/) - Spreadsheet data extraction.
- [Bun](https://bun.sh/) - JavaScript runtime & package manager.

## 📥 Installation

1. Install dependencies:
   ```bash
   bun install

```

2. Start the development server:
```bash
bun run dev

```


The server will run at `http://localhost:3000`.

## 📡 API Endpoints

### `GET /api/analyze?file={index}`

Fetches and analyzes a specific TESDA dataset.

* **Query Params:** `file` (0-8) corresponding to the `tesdaFiles` array.
* **Response:** Array of objects containing `label`, `supply`, `demand`, `gap`, and `status`.