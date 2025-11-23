#!/bin/bash

# Google Cloud SDK Setup Script
# This script helps set up gcloud for Application Default Credentials

echo "Setting up Google Cloud SDK..."

# Add gcloud to PATH for this session
export PATH="/opt/homebrew/share/google-cloud-sdk/bin:$PATH"

# Set Python for gcloud
export CLOUDSDK_PYTHON=/opt/homebrew/bin/python3

# Check if gcloud is accessible
if ! command -v gcloud &> /dev/null; then
    echo "Error: gcloud command not found. Make sure Google Cloud SDK is installed."
    echo "Install with: brew install google-cloud-sdk"
    exit 1
fi

echo "✓ gcloud found: $(gcloud --version | head -1)"

# Check if already authenticated
if gcloud auth application-default print-access-token &> /dev/null; then
    echo "✓ Application Default Credentials already configured"
    echo "Current account: $(gcloud auth application-default print-access-token --format='value(account)' 2>/dev/null || echo 'N/A')"
else
    echo "Setting up Application Default Credentials..."
    echo "This will open a browser window for authentication."
    gcloud auth application-default login
fi

echo ""
echo "Setup complete! You can now run your server."
echo ""
echo "To make gcloud available in all terminal sessions, add these lines to your ~/.zshrc:"
echo "  export PATH=\"/opt/homebrew/share/google-cloud-sdk/bin:\$PATH\""
echo "  export CLOUDSDK_PYTHON=/opt/homebrew/bin/python3"

