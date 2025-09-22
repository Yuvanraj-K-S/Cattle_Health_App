#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Starting deployment of Cattle Health App...${NC}"

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}❌ Docker Compose is not installed. Please install Docker Compose.${NC}"
    exit 1
fi

# Set environment variables
export NODE_ENV=production

# Build and start containers
echo -e "${YELLOW}🛠️  Building and starting containers...${NC}"
docker-compose down --remove-orphans
docker-compose up -d --build

# Wait for services to start
echo -e "${YELLOW}⏳ Waiting for services to start...${NC}
sleep 10

# Check if services are running
if [ "$(docker-compose ps | grep -c 'Up')" -lt 2 ]; then
    echo -e "${YELLOW}❌ Some services failed to start. Check the logs with 'docker-compose logs'.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Deployment successful!${NC}"
echo -e "\n${GREEN}📱 Application is running at:${NC}"
echo -e "- Frontend: http://localhost:3001"
echo -e "- Backend API: http://localhost:3001/api/v1"
echo -e "- MongoDB Express: http://localhost:8081"
echo -e "\n${YELLOW}To stop the application, run:${NC} docker-compose down"
echo -e "${YELLOW}To view logs, run:${NC} docker-compose logs -f"
