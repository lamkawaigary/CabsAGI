#!/bin/bash
# Run with: firebase login:ci <token> && firebase firestore:delete trips --recursive

echo "Logging in to Firebase..."
firebase login:ci --no-localhost

echo "Clearing trips..."
firebase firestore:delete trips --recursive

echo "Done!"