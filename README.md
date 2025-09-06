# Email & Social Media Scraper

A powerful web scraping tool that extracts email addresses and social media links from websites. Built with Next.js frontend and Node.js backend using Puppeteer for web scraping.

## Features

### 🚀 Core Functionality
- **Email Extraction**: Finds email addresses from websites using advanced regex patterns
- **Social Media Links**: Extracts links from Facebook, Twitter, LinkedIn, Instagram, YouTube, TikTok, and more
- **CSV Upload Support**: Upload CSV files with automatic website column detection
- **Smart Crawling**: Skips deep crawling if emails are found on homepage for efficiency
- **Real-time Progress**: Live progress tracking with detailed status updates
- **Error Handling**: Comprehensive error handling with break conditions

### 📊 Advanced Features
- **Bulk Processing**: Process up to 100 URLs at once
- **CSV Data Preservation**: Maintains original CSV data alongside scraping results
- **URL Normalization**: Automatically handles URLs with or without protocols
- **Cloudflare Detection**: Detects and reports blocked websites with VPN suggestions
- **Email Verification**: Built-in email verification system
- **Export Options**: Results exported in both JSON and CSV formats

### 🛡️ Security & Performance
- **Rate Limiting**: Built-in rate limiting to prevent server overload
- **Error Break Conditions**: Stops scraping on critical errors to save resources
- **Smart Resource Management**: Optimized browser settings for better performance
- **CORS Protection**: Proper CORS configuration for security

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/email-social-scraper.git
   cd email-social-scraper
   ```

2. **Install dependencies**
   ```bash
   # Install frontend dependencies
   npm install
   
   # Install backend dependencies
   cd backend
   npm install
   cd ..
   ```

3. **Environment Setup**
   ```bash
   # Copy environment file
   cp backend/env.example backend/.env
   
   # Edit backend/.env with your configuration
   ```

4. **Start the application**
   ```bash
   # Start both frontend and backend
   npm run dev
   
   # Or start them separately:
   # Frontend (port 3000)
   npm run dev
   
   # Backend (port 5000)
   cd backend && npm start
   ```

## Usage

### Basic Scraping
1. Open the application in your browser (http://localhost:3000)
2. Enter website URLs in the input field
3. Configure advanced options if needed
4. Click "Start Scraping"

### CSV Upload
1. Prepare a CSV file with website URLs
2. The system automatically detects columns named: website, url, domain, site, etc.
3. Upload the CSV file
4. Original CSV data is preserved in the output

### Advanced Options
- **Crawl Depth**: Choose how many levels deep to crawl (0-3)
- **Timeout**: Set timeout for each page (15-60 seconds)
- **Smart Crawling**: Skip deep crawling if emails found on homepage
- **Extract Phone Numbers**: Enable phone number extraction
- **Extract Addresses**: Enable address extraction
- **Follow Redirects**: Enable/disable redirect following

## API Endpoints

### Scraping
- `POST /api/scrape` - Start scraping process
- `GET /api/scraping-status` - Get real-time scraping status

### Email Verification
- `POST /api/verify` - Verify email addresses

### Health Check
- `GET /api/health` - Server health status

## Configuration

### Backend Configuration
Create `backend/.env` file:
```env
PORT=5000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### Frontend Configuration
The frontend automatically connects to the backend API. No additional configuration needed.

## Output Formats

### JSON Output
```json
{
  "timestamp": "2025-01-06T10:30:00.000Z",
  "totalUrls": 5,
  "results": [
    {
      "website": "https://example.com",
      "emails": ["contact@example.com", "info@example.com"],
      "socialLinks": {
        "facebook": "https://facebook.com/example",
        "twitter": "https://twitter.com/example"
      },
      "phoneNumbers": ["+1-555-123-4567"],
      "addresses": ["123 Main St, City, State"],
      "optimizationNote": "Skipped deep crawling - found 2 email(s) on homepage"
    }
  ]
}
```

### CSV Output
The CSV includes all original data plus extracted information:
- Original CSV columns (Company, Email, Phone, etc.)
- Website URL
- Extracted emails
- Social media links (Facebook, Twitter, LinkedIn, etc.)
- Phone numbers and addresses
- Optimization notes and errors

## Error Handling

### Break Conditions
The system automatically stops scraping when:
- 5 consecutive errors occur
- 10 total errors are reached
- Error rate exceeds 70%
- 3 critical system errors occur

### Cloudflare Detection
When websites are blocked by Cloudflare:
- Clear error message displayed
- VPN suggestion provided
- Specific blocking reason identified

## Development

### Project Structure
```
email-social-scraper/
├── app/                    # Next.js app directory
├── components/            # React components
│   ├── EmailVerification.tsx
│   ├── FileUpload.tsx
│   ├── Navbar.tsx
│   ├── ResultsTable.tsx
│   ├── ScrapingForm.tsx
│   ├── ScrapingProgress.tsx
│   └── UrlInput.tsx
├── backend/              # Node.js backend
│   ├── logs/            # Log files
│   ├── output/          # Scraping results
│   ├── server.js        # Main server file
│   └── package.json
├── public/              # Static assets
└── package.json         # Frontend dependencies
```

### Scripts
```bash
# Development
npm run dev              # Start both frontend and backend
npm run build           # Build for production
npm run start           # Start production build

# Backend only
cd backend
npm start              # Start backend server
npm run dev            # Start with nodemon
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions:
1. Check the [Issues](https://github.com/yourusername/email-social-scraper/issues) page
2. Create a new issue with detailed information
3. Include error logs and steps to reproduce

## Changelog

### v2.0.0
- Added real-time progress tracking
- Implemented smart crawling optimization
- Enhanced CSV upload with column detection
- Added comprehensive error handling
- Improved Cloudflare detection
- Added email verification system

### v1.0.0
- Initial release
- Basic email and social media extraction
- Simple CSV upload support