# Pmail Backend Server

Backend API for the Pmail email application with Knocc request system.

## Features

- User authentication (register/login with JWT)
- Email sending and receiving (with CC/BCC support)
- Knocc request system (paid contact requests)
- Wallet management
- Contact management
- Transaction history

## Tech Stack

- Node.js & Express
- Prisma ORM
- PostgreSQL database
- JWT authentication
- bcryptjs for password hashing

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Database

Make sure you have PostgreSQL installed and running.

Create a new database:

```sql
CREATE DATABASE pmail_db;
```

### 3. Configure Environment Variables

Update the `.env` file with your database credentials:

```env
DATABASE_URL="postgresql://your_username:your_password@localhost:5432/pmail_db?schema=public"
JWT_SECRET="your-secret-key-change-this-in-production"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV="development"
CLIENT_URL="http://localhost:5173"
```

### 4. Run Prisma Migrations

Generate Prisma client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

This will create all the necessary tables in your database.

### 5. Start the Server

Development mode (with auto-reload):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

The server will run on `http://localhost:5000`

### 6. View Database (Optional)

To view and edit your database with Prisma Studio:

```bash
npm run prisma:studio
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### Users
- `GET /api/users/search?query=name` - Search users
- `GET /api/users/contacts` - Get user's contacts
- `PUT /api/users/profile` - Update profile

### Emails
- `POST /api/emails` - Send email
- `GET /api/emails/inbox` - Get inbox emails
- `GET /api/emails/sent` - Get sent emails
- `GET /api/emails/:id` - Get email by ID
- `DELETE /api/emails/:id` - Move email to bin

### Knocc Requests
- `POST /api/knocc/request` - Send knocc request
- `GET /api/knocc/requests?filter=all|paid|pryro` - Get received requests
- `POST /api/knocc/requests/:id/respond` - Approve/decline request

### Wallet
- `POST /api/wallet/add-funds` - Add funds to wallet
- `GET /api/wallet/balance` - Get wallet balance
- `GET /api/wallet/transactions` - Get transaction history

## Database Schema

The database includes the following main models:

- **User** - User accounts with wallet and settings
- **Email** - Email messages
- **EmailRecipient** - Email recipients (TO/CC/BCC)
- **KnoccRequest** - Contact requests with payment
- **Contact** - Approved contacts
- **BlockedUser** - Blocked users
- **Transaction** - Wallet transactions

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your-token>
```

## Notes

- Passwords are hashed using bcryptjs
- JWT tokens expire after 7 days (configurable)
- Knocc requests with payment >= $50 are marked as "PRYRO" (priority)
- Declined requests are automatically refunded
- Approved requests add both users as contacts (bidirectional)
