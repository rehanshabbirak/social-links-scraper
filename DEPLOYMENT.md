# Deployment Guide

This guide covers different deployment options for the Email & Social Media Scraper application.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Git

## Local Development

### Quick Start
```bash
# Clone the repository
git clone https://github.com/yourusername/email-social-scraper.git
cd email-social-scraper

# Install dependencies
npm install
cd backend && npm install && cd ..

# Start development servers
npm run dev:all
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## Production Deployment

### Option 1: Vercel (Recommended for Frontend)

1. **Connect to Vercel**
   ```bash
   npm install -g vercel
   vercel login
   vercel
   ```

2. **Configure Environment Variables**
   - Add `NEXT_PUBLIC_API_URL` pointing to your backend
   - Add any other required environment variables

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Option 2: Netlify

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy to Netlify**
   - Connect your GitHub repository
   - Set build command: `npm run build`
   - Set publish directory: `.next`
   - Add environment variables

### Backend Deployment

#### Option 1: Railway

1. **Connect to Railway**
   ```bash
   npm install -g @railway/cli
   railway login
   railway init
   ```

2. **Configure Environment**
   ```bash
   railway variables set PORT=5000
   railway variables set NODE_ENV=production
   ```

3. **Deploy**
   ```bash
   railway up
   ```

#### Option 2: Heroku

1. **Install Heroku CLI**
   ```bash
   # Download from https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Create Heroku App**
   ```bash
   cd backend
   heroku create your-app-name
   ```

3. **Configure Environment**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set PORT=5000
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

#### Option 3: DigitalOcean App Platform

1. **Create App Spec**
   ```yaml
   # .do/app.yaml
   name: email-scraper-backend
   services:
   - name: api
     source_dir: backend
     github:
       repo: yourusername/email-social-scraper
       branch: main
     run_command: npm start
     environment_slug: node-js
     instance_count: 1
     instance_size_slug: basic-xxs
     envs:
     - key: NODE_ENV
       value: production
     - key: PORT
       value: "5000"
   ```

2. **Deploy via CLI**
   ```bash
   doctl apps create --spec .do/app.yaml
   ```

## Docker Deployment

### Create Dockerfile for Backend
```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

### Create Dockerfile for Frontend
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./

RUN npm ci --only=production

EXPOSE 3000

CMD ["npm", "start"]
```

### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:5000
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
    volumes:
      - ./backend/output:/app/output
      - ./backend/logs:/app/logs
```

### Deploy with Docker
```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Environment Variables

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

### Backend (.env)
```env
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-frontend-url.com
```

## Security Considerations

1. **CORS Configuration**
   - Update CORS origins for production
   - Use environment variables for URLs

2. **Rate Limiting**
   - Configure appropriate rate limits
   - Monitor usage patterns

3. **Environment Variables**
   - Never commit sensitive data
   - Use secure secret management

4. **HTTPS**
   - Always use HTTPS in production
   - Configure SSL certificates

## Monitoring

### Health Checks
- Backend: `GET /api/health`
- Frontend: Built-in Next.js health checks

### Logging
- Backend logs are stored in `backend/logs/`
- Configure log rotation for production
- Monitor error rates and performance

### Performance
- Monitor memory usage
- Set up alerts for high CPU usage
- Monitor scraping success rates

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check CORS configuration in backend
   - Verify frontend URL in environment variables

2. **Port Conflicts**
   - Ensure ports 3000 and 5000 are available
   - Update port configuration if needed

3. **Memory Issues**
   - Monitor Puppeteer memory usage
   - Implement proper browser cleanup

4. **Rate Limiting**
   - Adjust rate limits based on usage
   - Implement proper error handling

### Debug Mode
```bash
# Enable debug logging
NODE_ENV=development npm run dev:all

# Check logs
tail -f backend/logs/combined.log
```

## Scaling

### Horizontal Scaling
- Use load balancers for multiple backend instances
- Implement proper session management
- Use shared storage for output files

### Vertical Scaling
- Increase server resources
- Optimize Puppeteer settings
- Implement connection pooling

## Backup Strategy

1. **Code Backup**
   - Use Git for version control
   - Regular pushes to remote repository

2. **Data Backup**
   - Backup output files regularly
   - Implement automated backup scripts

3. **Configuration Backup**
   - Document all environment variables
   - Backup configuration files

## Support

For deployment issues:
1. Check the logs for error messages
2. Verify environment variables
3. Test locally first
4. Create an issue with deployment details
