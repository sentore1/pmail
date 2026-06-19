#!/bin/bash

# Pmail Invitation System Setup Script

echo "🚀 Setting up Pmail Invitation System..."
echo ""

# Check if we're in the server directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Please run this script from the server directory"
  exit 1
fi

# Install googleapis package
echo "📦 Installing googleapis package..."
npm install googleapis

# Run Prisma migrations
echo "🗄️  Running database migrations..."
npx prisma migrate dev --name add_invitations

# Generate Prisma client
echo "⚙️  Generating Prisma client..."
npx prisma generate

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Set up Google OAuth credentials at: https://console.cloud.google.com/"
echo "2. Update your .env file with:"
echo "   - GOOGLE_CLIENT_ID"
echo "   - GOOGLE_CLIENT_SECRET"
echo "   - GOOGLE_REDIRECT_URI"
echo ""
echo "3. Start the server: npm run dev"
echo ""
echo "📖 See GMAIL_INVITATION_SETUP.md for detailed instructions"
