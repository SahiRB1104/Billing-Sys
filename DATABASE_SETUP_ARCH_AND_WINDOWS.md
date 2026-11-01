# End-to-End Database Setup Guide: SQLite 3 (WAL Mode) & PostgreSQL (Arch Linux + Windows PC)

This guide explains **step-by-step** how your POS database works on **Arch Linux** (your development machine) and **Windows 10 / 11** (store billing computer), with zero prior database experience needed.

---

## 1. Which Database Does This Project Use?

### Current Default (Single-Counter Offline POS): **SQLite 3 in WAL Mode**
- **Good news**: **SQLite 3 is already built into Python (`import sqlite3`)!** You do **not** need to run a separate database server or configure users/passwords for SQLite.
- When you start the backend, it automatically creates and configures:
  - Database file: `backend/data/store.db`
  - Write-Ahead Log file: `backend/data/store.db-wal`
  - Shared-Memory index: `backend/data/store.db-shm`
  - Staff KYC documents folder: `backend/data/staff_docs/` (stores `<10MB` PDFs/images on disk so `store.db` stays small and fast).

### What is `WAL Mode` (Write-Ahead Logging) and Why Is It Enabled?
In normal SQLite, if power goes out while a bill is being saved, or if the dashboard reads sales stats while a cashier is saving a bill, the database can lock or corrupt.
With **WAL Mode (`PRAGMA journal_mode=WAL;`)**:
1. **Crash-Proof on Power Cut**: Every bill is written sequentially to `store.db-wal` first and safely synced to disk (`PRAGMA synchronous=NORMAL;`).
2. **Zero Locking**: Cashiers can scan items and save bills at full speed while reports/exports run simultaneously.
3. **Automatic**: Already configured inside [`backend/app/database.py`](file:///home/sahil/Projects/Billing-Sys/backend/app/database.py) every time the app starts!

---

## 2. Arch Linux Setup & Commands (Step-by-Step)

### Step 2.1: Install SQLite CLI Tool on Arch Linux (Optional, for inspecting `.db` files)
Python already has SQLite built-in, but installing the `sqlite` package gives you the `sqlite3` terminal command and `sqlitebrowser` gives you a visual GUI table viewer:

```bash
# Install SQLite3 CLI and DB Browser GUI on Arch Linux
sudo pacman -S --needed sqlite sqlitebrowser
```

### Step 2.2: Verify WAL Mode is Active on Arch Linux
Run this command in your project folder:

```bash
cd /home/sahil/Projects/Billing-Sys/backend
sqlite3 data/store.db "PRAGMA journal_mode;"
```
Expected output:
```text
wal
```

### Step 2.3: View All Tables & Staff / Bills from Terminal on Arch Linux
```bash
# List all tables
sqlite3 /home/sahil/Projects/Billing-Sys/backend/data/store.db ".tables"

# View staff accounts and auto-generated EMP codes
sqlite3 -header -column /home/sahil/Projects/Billing-Sys/backend/data/store.db \
  "SELECT id, staff_id, name, username, role, contact_number, document_type, document_ref, hard_copy_collected FROM users;"

# Or open the database visually in a desktop window:
sqlitebrowser /home/sahil/Projects/Billing-Sys/backend/data/store.db
```

### Step 2.4: Safe Backup & Restore on Arch Linux
1. **From the POS UI (Easiest)**: Go to **Settings -> Store Details -> Download Database Backup (.db)**.
2. **From Terminal**:
   ```bash
   sqlite3 /home/sahil/Projects/Billing-Sys/backend/data/store.db ".backup '/home/sahil/store_backup.db'"
   ```

---

## 3. Windows 10 / 11 Offline Setup (Step-by-Step)

### Step 3.1: Install Python & SQLite on Windows PC
1. Download and install **Python 3.11 or 3.12 (64-bit)** from `python.org`.
   - **Important**: Check **"Add python.exe to PATH"** during installation.
   - Python for Windows **includes SQLite 3 automatically**—no separate SQLite installer is required to run the POS!
2. *(Optional)* If you want to inspect the database file on Windows with a visual program, download **DB Browser for SQLite** (`sqlitebrowser.org`).

### Step 3.2: Where Is Data Stored on Windows?
- By default, when launched via [`scripts/start-windows-offline.bat`](file:///home/sahil/Projects/Billing-Sys/scripts/start-windows-offline.bat):
  - If `backend\data\store.db` exists inside the app folder, it uses `backend\data\store.db`.
  - Otherwise, it stores data in `%LOCALAPPDATA%\BillingSysPOS\data\store.db` (`C:\Users\<YourUser>\AppData\Local\BillingSysPOS\data\store.db`).
- Uploaded staff KYC PDF/Image files are stored in `backend\data\staff_docs\`.

### Step 3.3: Launching the POS Offline on Windows
1. Double-click [`scripts\start-windows-offline.bat`](file:///home/sahil/Projects/Billing-Sys/scripts/start-windows-offline.bat).
2. To start automatically when Windows boots:
   - Press `Win + R`, type `shell:startup`, and press **Enter**.
   - Create a shortcut to `scripts\start-windows-offline.bat` inside that Startup folder.

### Step 3.4: How to Backup & Restore on Windows (e.g., to a USB Pen Drive)
- **To Backup**: In the POS software, open **Settings -> Download Database Backup (.db)** and save the `.db` file to your USB drive.
- **To Restore on a New Windows PC**:
  1. Close the POS software.
  2. Copy your backup file and rename it to `store.db` inside `backend\data\store.db` (delete any old `store.db-wal` and `store.db-shm` files if replacing the database).
  3. Start the POS software again—all products, bills, customer credit balances, and staff accounts will be restored immediately.

---

## 4. Future Upgrade: How to Switch to PostgreSQL (Multi-Counter LAN)

If your supermarket grows to **2 to 10 billing counters** connected over a local Wi-Fi/Ethernet router and you want all counters to share one central live database:

### Step 4.1: Install PostgreSQL on the Main Counter PC
- **On Arch Linux**:
  ```bash
  sudo pacman -S postgresql
  sudo -iu postgres initdb -D /var/lib/postgres/data
  sudo systemctl enable --now postgresql
  sudo -iu postgres psql -c "CREATE USER posadmin WITH PASSWORD 'strongpassword';"
  sudo -iu postgres psql -c "CREATE DATABASE store_pos OWNER posadmin;"
  ```
- **On Windows**:
  Download the official PostgreSQL 16 Windows installer (`postgresql.org/download/windows/`) and create a database named `store_pos`.

### Step 4.2: Install the Python Driver & Update `backend/.env`
```bash
pip install psycopg2-binary
```
Then open or create `backend/.env` and set **one single line**:
```env
DATABASE_URL=postgresql://posadmin:strongpassword@127.0.0.1:5432/store_pos
```
*(For other billing counters on the same LAN, replace `127.0.0.1` with the Manager PC's LAN IP address, e.g., `192.168.1.100`).*
Restart the backend—SQLAlchemy will automatically create all tables in PostgreSQL with **zero code changes**!
