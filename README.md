# Pmail - Email Communication Platform

Pmail is a modern email platform with a unique "Knocc" request system that allows users to monetize their inbox. People must pay to send you emails unless they're in your approved contacts.

## Features

✨ **Core Features:**
- User authentication (Register/Login)
- Email sending and receiving with CC/BCC support
- Inbox, Sent, Starred, and Bin views
- Real-time email reading status

🔔 **Knocc Request System:**
- Paid contact requests ($1 minimum)
- Priority "Pryro" requests ($50+)
- Accept or decline incoming requests
- Automatic refunds on decline
- Bidirectional contact approval

💰 **Wallet System:**
- Add funds to your wallet
- Transaction history
- Automatic payment processing for Knocc requests

👥 **Contact Management:**
- Search for users on the platform
- View "Who You Know" suggestions
- Browse all platform users
- Verification badges
- Approved contacts list

## Tech Stack

**Frontend:**
- React + Vite
- Tailwind CSS
- Lucide React Icons

**Backend:**
- Node.js + Express
- Prisma ORM
- PostgreSQL
- JWT Authentication
- bcryptjs

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn

### Installation

#### 1. Clone the repository

```bash
git clone <repository-url>
cd pmail
```

#### 2. Setup Frontend

```bash
# Install dependencies
npm install

# Create .env file
echo "VITE_API_URL=http://localhost:5000/api" > .env
```

#### 3. Setup Backend

```bash
cd server

# Install dependencies
npm install

# Update .env file with your database credentials
# DATABASE_URL="postgresql://username:password@localhost:5432/pmail_db"
# JWT_SECRET="your-secret-key"

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate
```

#### 4. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## Project Structure

```
pmail/
├── src/                    # Frontend source
│   ├── components/         # React components
│   │   ├── LoginPage.jsx
│   │   ├── Sidebar.jsx
│   │   ├── EmailList.jsx
│   │   ├── EmailDetail.jsx
│   │   ├── ComposeModal.jsx
│   │   ├── WalletModal.jsx
│   │   └── ...
│   ├── services/           # API services
│   │   └── api.js
│   ├── App.jsx
│   └── main.jsx
├── server/                 # Backend source
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Auth middleware
│   │   ├── utils/          # Utilities
│   │   └── index.js
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   └── package.json
└── package.json
```

## API Documentation

See [server/README.md](server/README.md) for detailed API documentation.

## Features Walkthrough

### Registration
1. Click "Register" tab
2. Fill in your details (name, email, password, etc.)
3. Set your Knocc price (what people pay to contact you)
4. Create account

### Sending Emails
1. Click "Write" button
2. Type recipient name/email (autocomplete suggestions appear)
3. Add CC/BCC if needed
4. Write subject and message
5. Click "Send Email"
6. If recipient not approved, pay their Knocc price

### Knocc Requests
1. View incoming requests in "Knocc Requests"
2. Filter by All, Paid ($1), or Pryro ($50+)
3. Review request details
4. Approve to add to contacts and receive payment
5. Decline to refund sender

### Wallet
1. Click "More" → "Wallet"
2. Add funds using preset amounts
3. View transaction history
4. Use funds to send Knocc requests

## Database Schema

Key models:
- **User** - User accounts with wallet and settings
- **Email** - Email messages with sender and recipients
- **EmailRecipient** - Recipients (TO/CC/BCC) with read status
- **KnoccRequest** - Contact requests with payment info
- **Contact** - Approved contacts (bidirectional)
- **Transaction** - Wallet transaction history

## Environment Variables

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:5000/api
```

**Backend (server/.env):**
```env
DATABASE_URL="postgresql://username:password@localhost:5432/pmail_db"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV="development"
CLIENT_URL="http://localhost:5173"
```

## License

This project is licensed under the MIT License.
