# Pmail Setup Instructions

## 🚀 Quick Start

### 1. Install Dependencies

#### Backend
```bash
cd server
npm install
```

#### Frontend
```bash
cd ..
npm install
```

### 2. Database Setup

```bash
cd server
npx prisma generate
npx prisma migrate dev
```

### 3. Environment Configuration

The `.env` file in the `server` folder is already configured with default values. Update these as needed:

- `JWT_SECRET` - Change this to a secure random string for production
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` - For Gmail integration (optional)
- `POLAR_API_URL` & `POLAR_MACAROON` - For Lightning Network payments (optional)

### 4. Start the Application

#### Start Backend Server
```bash
cd server
npm run dev
```
The backend will run on `http://localhost:5000`

#### Start Frontend (in new terminal)
```bash
npm run dev
```
The frontend will run on `http://localhost:5173`

### 5. Open in Browser
Navigate to `http://localhost:5173`

## ✨ Features Implemented

### Core Email Features
- ✅ User authentication (register/login)
- ✅ Send and receive emails
- ✅ Inbox, Sent, Starred, Bin views
- ✅ Email composition with rich features
- ✅ Knocc Request system (pay to contact)

### Wallet & Payments
- ✅ Wallet balance management
- ✅ Add funds via card (simulated)
- ✅ **Lightning Network integration** (Bitcoin payments)
  - Generate Lightning invoices
  - Real-time payment detection
  - Instant wallet crediting
- ✅ Withdraw funds (bank or Lightning)
- ✅ Transaction history
- ✅ Pryro ($50+) and Standard ($1) request types

### Contact Management
- ✅ Approved contacts list
- ✅ Blocked users management
- ✅ Search and add contacts
- ✅ Block/unblock functionality

### Settings & Profile
- ✅ Edit profile (name, email, phone, age, gender, country)
- ✅ Knocc price configuration
- ✅ Auto-approve settings
- ✅ Gmail invitation system

### UI/UX
- ✅ Modern, clean interface
- ✅ Responsive design
- ✅ Profile dropdown in header
- ✅ Sidebar navigation
- ✅ Modal-based workflows

## ⚡ Lightning Network Setup (Optional)

To enable real Bitcoin Lightning Network payments:

### Option 1: Using Polar (Recommended for Development)

1. **Download Polar**: https://lightningpolar.com/

2. **Create a Network**:
   - Open Polar
   - Create a new network with at least 1 LND node
   - Start the network

3. **Get LND Connection Details**:
   - Click on your LND node
   - Go to "Connect" tab
   - Copy the REST API URL (e.g., `http://localhost:8081`)
   - Copy the Admin Macaroon hex value

4. **Update `.env` file**:
```env
POLAR_API_URL="http://localhost:8081"
POLAR_MACAROON="your_admin_macaroon_hex_here"
```

5. **Restart Backend Server**

### Option 2: Production Lightning Setup

For production, you can use:
- **OpenNode**: https://www.opennode.com/
- **Strike API**: https://strike.me/
- **BTCPay Server**: https://btcpayserver.org/
- Your own LND/CLN node

Update the `walletController.js` to use your chosen provider's API.

## 🔧 Troubleshooting

### Database Issues
```bash
cd server
rm -rf prisma/dev.db
npx prisma migrate reset
```

### Port Already in Use
- Backend: Change `PORT` in `server/.env`
- Frontend: Change port in `vite.config.js`

### Module Not Found Errors
```bash
# Backend
cd server
npm install

# Frontend
cd ..
npm install
```

### Lightning Network Connection Failed
- Ensure Polar is running
- Verify `POLAR_API_URL` and `POLAR_MACAROON` in `.env`
- The app will work without Lightning (card payments only)

## 📁 Project Structure

```
pmail/
├── src/                      # Frontend React app
│   ├── components/          # React components
│   │   ├── LoginPage.jsx
│   │   ├── Sidebar.jsx
│   │   ├── Header.jsx
│   │   ├── EmailList.jsx
│   │   ├── EmailDetail.jsx
│   │   ├── ComposeModal.jsx
│   │   ├── KnoccRequestModal.jsx
│   │   ├── WalletModal.jsx     # Enhanced with Lightning
│   │   ├── SettingsModal.jsx
│   │   └── InviteFriendsModal.jsx
│   ├── services/
│   │   └── api.js           # API client
│   └── App.jsx              # Main app component
│
├── server/                   # Backend Node.js/Express
│   ├── src/
│   │   ├── controllers/     # Business logic
│   │   │   ├── authController.js
│   │   │   ├── emailController.js
│   │   │   ├── knoccController.js
│   │   │   ├── userController.js
│   │   │   ├── walletController.js  # Enhanced with Lightning
│   │   │   └── ...
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Auth middleware
│   │   └── index.js         # Server entry point
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── dev.db          # SQLite database
│   └── .env                 # Environment variables
│
└── README.md                # Project documentation
```

## 🎯 Next Steps

1. **Test the Application**:
   - Create a user account
   - Send some emails
   - Test Knocc requests
   - Add funds to wallet
   - Try Lightning payments (if configured)

2. **Customize**:
   - Update branding in `index.html`
   - Modify colors in Tailwind config
   - Add your own features

3. **Deploy**:
   - Frontend: Vercel, Netlify, or AWS
   - Backend: Railway, Render, or AWS
   - Database: PostgreSQL for production

## 💡 Tips

- **Card Payments**: Currently simulated - integrate Stripe/PayPal for real payments
- **Email Sending**: Add SMTP integration for real email delivery
- **Notifications**: Add WebSocket for real-time notifications
- **Mobile**: The UI is responsive and works on mobile devices
- **Security**: Change JWT_SECRET before deploying to production

## 📚 Documentation

- [Prisma Docs](https://www.prisma.io/docs/)
- [Express Docs](https://expressjs.com/)
- [React Docs](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lightning Network](https://lightning.network/)
- [Polar Docs](https://github.com/jamaljsr/polar)

## 🤝 Support

If you encounter any issues:
1. Check the console for error messages
2. Verify all dependencies are installed
3. Ensure database migrations are run
4. Check that both servers are running
5. Review the `.env` file configuration

---

**Enjoy using Pmail! 🚀**
