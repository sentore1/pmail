@echo off
REM Pmail Invitation System Setup Script for Windows

echo 🚀 Setting up Pmail Invitation System...
echo.

REM Check if we're in the server directory
if not exist "package.json" (
  echo ❌ Error: Please run this script from the server directory
  exit /b 1
)

REM Install googleapis package
echo 📦 Installing googleapis package...
call npm install googleapis

REM Run Prisma migrations
echo 🗄️  Running database migrations...
call npx prisma migrate dev --name add_invitations

REM Generate Prisma client
echo ⚙️  Generating Prisma client...
call npx prisma generate

echo.
echo ✅ Setup complete!
echo.
echo 📝 Next steps:
echo 1. Set up Google OAuth credentials at: https://console.cloud.google.com/
echo 2. Update your .env file with:
echo    - GOOGLE_CLIENT_ID
echo    - GOOGLE_CLIENT_SECRET
echo    - GOOGLE_REDIRECT_URI
echo.
echo 3. Start the server: npm run dev
echo.
echo 📖 See GMAIL_INVITATION_SETUP.md for detailed instructions

pause
