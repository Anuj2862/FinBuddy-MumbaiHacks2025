#!/bin/bash

echo "============================================"
echo "  FinBuddy AI — Starting All Services"
echo "============================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed!"
    echo "Please install from: https://nodejs.org"
    exit 1
fi
echo "[OK] Node.js $(node --version) found"

# Install dependencies if missing
echo ""
echo "[1/3] Checking Backend dependencies..."
if [ ! -d "server/node_modules" ]; then
    echo "Installing server dependencies..."
    cd server && npm install && cd ..
else
    echo "Server dependencies OK"
fi

echo ""
echo "[2/3] Checking React dependencies..."
if [ ! -d "client/node_modules" ]; then
    echo "Installing client dependencies..."
    cd client && npm install && cd ..
else
    echo "React dependencies OK"
fi

echo ""
echo "[3/3] Checking Angular dependencies..."
if [ ! -d "angular-app/node_modules" ]; then
    echo "Installing Angular dependencies..."
    cd angular-app && npm install && cd ..
else
    echo "Angular dependencies OK"
fi

echo ""
echo "============================================"
echo "  Starting all services..."
echo "============================================"
echo ""
echo "Backend  -> http://localhost:5000"
echo "React    -> http://localhost:3000"
echo "Angular  -> http://localhost:4200"
echo ""

# Start all in background
cd server && npm run dev &
SERVER_PID=$!

sleep 2

cd ../client && npm run dev &
CLIENT_PID=$!

cd ../angular-app && npx ng serve --port 4200 &
ANGULAR_PID=$!

echo "All services started!"
echo "PIDs: Backend=$SERVER_PID | React=$CLIENT_PID | Angular=$ANGULAR_PID"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait and handle Ctrl+C
trap "kill $SERVER_PID $CLIENT_PID $ANGULAR_PID 2>/dev/null; echo 'All services stopped.'; exit 0" INT
wait
