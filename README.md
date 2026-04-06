# 🗳️ SecureVote
### A Blockchain-Powered Democratic Voting System

SecureVote is a decentralized electronic voting platform built with React, Node.js, PostgreSQL + PostGIS, and Ethereum smart contracts (Hardhat). Every vote is recorded immutably on-chain while voter data is managed securely in a PostGIS-enabled PostgreSQL database.

---

## 📋 Prerequisites

### 1. Node.js

Check if Node.js is installed:
```bash
node -v
```

If not installed, download and install from the [official Node.js website](https://nodejs.org/):
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nodejs npm

# macOS (using Homebrew)
brew install node

# Windows
# Download the installer from https://nodejs.org
```

---

### 2. PostgreSQL with PostGIS

Check if PostgreSQL is installed:
```bash
psql --version
```

If not installed, install PostgreSQL and the PostGIS extension:

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib postgis
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS (using Homebrew):**
```bash
brew install postgresql postgis
brew services start postgresql
```

**Windows:**
Download the PostgreSQL installer from [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/), then install the PostGIS Stack Builder extension afterward.

---

## 🗄️ Database Setup

### Step 1 — Create the Database

Log in to PostgreSQL as the superuser and create the voting database:

```bash
sudo -u postgres psql
```

Inside the psql shell:
```sql
CREATE DATABASE voting_system;
\q
```

### Step 2 — Enable PostGIS Extension

```bash
sudo -u postgres psql -d voting_system
```

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
\q
```

### Step 3 — Import the Schema

Load the schema file into the `voting_system` database:

```bash
# Using the command line
sudo -u postgres psql -d voting_system -f voting_system_schema.sql
```

**Manual alternative** — if you prefer to import through the psql shell:
```bash
sudo -u postgres psql -d voting_system
```
Then inside psql:
```sql
\i /path/to/voting_system_schema.sql
```

### Step 4 — Create the Admin User & Grant Permissions

Run the following commands to create the `voting_admin` database user and grant it full access:

```bash
sudo -u postgres psql -d voting_system
```

```sql
-- Create the admin user
CREATE USER voting_admin WITH PASSWORD 'Pass123!';

-- Grant access to the database
GRANT ALL PRIVILEGES ON DATABASE voting_system TO voting_admin;

-- Grant access to all tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO voting_admin;

-- Grant access to all sequences
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO voting_admin;

\q
```

---

## 📦 Install Dependencies

Run `npm install` in each of the three project directories:

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install

# Smart Contracts
cd ../contracts
npm install
```

---

## 🔑 Configure Environment Variables

Copy the template below into `backend/.env` and replace every value marked with `← REPLACE THIS` with your real credentials.

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=voting_system
DB_USER=voting_admin
DB_PASSWORD=Pass123!                          # ← use the password you set in DB setup

# JWT
JWT_SECRET=your_strong_random_secret_here     # ← REPLACE THIS — use a long random string
JWT_EXPIRES_IN=7d
JWT_EXPIRE=1h

# Email Configuration (NodeMailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com               # ← REPLACE THIS — your Gmail address
EMAIL_PASSWORD=your_gmail_app_password        # ← REPLACE THIS — Gmail App Password
                                              #   (NOT your Gmail login password)
                                              #   Generate at: Google Account → Security
                                              #   → 2-Step Verification → App Passwords

# Blockchain Configuration
# ⚠️  Fill these in AFTER running Terminal 2 and Terminal 3
USE_BLOCKCHAIN=true
BLOCKCHAIN_NETWORK=http://127.0.0.1:8545/
BLOCKCHAIN_PRIVATE_KEY=                       # ← paste private key printed in Terminal 2
CONTRACT_ADDRESS=                             # ← paste contract address printed in Terminal 3

# Encryption & Security
CUSTOM_TOKEN_ENCRYPTION=your_encryption_key  # ← REPLACE THIS — any strong random string
HMAC_SECRET=your_hmac_secret                 # ← REPLACE THIS — any strong random string

# Cookie
# Set COOKIE_SECURE=false for localhost, true for production (requires HTTPS)
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
# FRONTEND_URL=http://192.168.0.106:3000      # ← uncomment and set your LAN IP if needed

IS_DEV=true
```

### How to get your Gmail App Password

1. Go to your [Google Account](https://myaccount.google.com/) → **Security**
2. Enable **2-Step Verification** if not already on
3. Search for **App Passwords** → select app: `Mail`, device: `Other` → name it `SecureVote`
4. Copy the generated 16-character password and paste it as `EMAIL_PASSWORD`

> ⚠️ **Important:** Do not fill in `BLOCKCHAIN_PRIVATE_KEY` or `CONTRACT_ADDRESS` until you have started the Hardhat node (Terminal 2) and deployed the contract (Terminal 3). Those values are only available after those steps.

---

## 🔐 Generate RSA Key Pair

SecureVote uses RSA encryption to secure data between the frontend and backend. You need to generate a `private.pem` and `public.pem` key pair and place them in the correct locations.

### Step 1 — Generate the keys

Run this from the **`backend/`** folder:

```bash
cd backend

# Generate private key (2048-bit RSA)
openssl genrsa -out private.pem 2048

# Generate public key from the private key
openssl rsa -in private.pem -pubout -out public.pem
```

This creates two files inside `backend/`:
```
backend/
├── private.pem    ← keep this secret, never commit to git
└── public.pem     ← safe to share with the frontend
```

> ⚠️ Add `private.pem` to your `.gitignore` immediately. Never commit the private key.

---

### Step 2 — Copy public key to `frontend/.env.local`

The public key must be on a **single line** with `\n` replacing actual newlines. Run this from `backend/` to get the correctly formatted value:

```bash
# Formats the public key into a single-line .env-safe string
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' public.pem
```

Copy the output and paste it into `frontend/.env.local`:

```env
# frontend/.env.local

REACT_APP_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhki...your key here...\n-----END PUBLIC KEY-----\n"

# Must match HMAC_SECRET in backend/.env exactly
REACT_APP_HMAC_SECRET=your_hmac_secret
```

---

### Step 3 — Paste public key into `frontend/utils/secureCrypto.js`

Open `frontend/utils/secureCrypto.js` and find the public key constant near the top of the file. Replace the placeholder with your actual key:

```js
// frontend/utils/secureCrypto.js

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA
... paste your full public.pem contents here ...
-----END PUBLIC KEY-----`;
```

Print your public key to copy from:

```bash
cat backend/public.pem
```

Paste the full output — including the `-----BEGIN PUBLIC KEY-----` and `-----END PUBLIC KEY-----` lines — into the template literal inside `secureCrypto.js`.

---

## 🚀 Running SecureVote

Open **four separate terminal windows** and run each command in order.

---

### Terminal 1 — Frontend

```bash
cd frontend
npm start
```

The React app will be available at `http://localhost:3000`

---

### Terminal 2 — Blockchain (Hardhat Local Node)

```bash
cd contracts
npx hardhat node
```

This starts a local Ethereum node. **Keep this terminal running.**  
A list of test accounts with their **private keys** will be printed here — copy one of them for use in the backend `.env`.

---

### Terminal 3 — Deploy Smart Contract

> ⚠️ Run this **only after Terminal 2 is running.**

```bash
cd contracts
npx hardhat run scripts/deploy.js --network localhost
```

After deployment, the **contract address** will be printed in this terminal. Copy it and paste it into `backend/.env` as `CONTRACT_ADDRESS`.

---

### Terminal 4 — Backend

> ⚠️ Run this **only after completing Terminals 2 & 3** and updating `backend/.env` with the private key and contract address.

```bash
cd backend
npm start
```

The backend API will be available at `http://localhost:5000`

---

## ✅ You're Ready!

Once all four terminals are running, **SecureVote is live** and ready to run a democratic election.

```
Frontend   →  http://localhost:3000
Backend    →  http://localhost:5000
Blockchain →  http://localhost:8545  (Hardhat local node)
```

---

## 🗂️ Project Structure

```
securevote/
├── frontend/                  # React application
│   ├── .env.local
│   └── utils/
│       └── secureCrypto.js    ← paste public key here
├── backend/                   # Node.js + Express API
│   ├── .env
│   ├── private.pem            ← generated, never commit
│   └── public.pem             ← generated, share with frontend
├── contracts/                 # Solidity smart contracts (Hardhat)
│   └── scripts/
│       └── deploy.js
└── voting_system_schema.sql
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Backend | Node.js, Express |
| Database | PostgreSQL + PostGIS |
| Blockchain | Solidity, Hardhat, Ethers.js |
| Network | Ethereum (local via Hardhat) |

---

## ⚖️ License

MIT — feel free to use and adapt SecureVote for your democratic needs.