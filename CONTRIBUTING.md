# Contributing to Email & Social Media Scraper

Thank you for your interest in contributing to this project! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Git

### Development Setup
1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/email-social-scraper.git`
3. Install dependencies: `npm install && cd backend && npm install`
4. Create a new branch: `git checkout -b feature/your-feature-name`

## Code Style

### Frontend (React/Next.js)
- Use TypeScript for type safety
- Follow React best practices and hooks
- Use Tailwind CSS for styling
- Component files should be in PascalCase
- Use functional components with hooks

### Backend (Node.js)
- Use ES6+ features
- Follow async/await pattern
- Use proper error handling
- Add JSDoc comments for functions
- Use winston for logging

## Pull Request Process

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make Your Changes**
   - Write clean, readable code
   - Add tests if applicable
   - Update documentation if needed

3. **Test Your Changes**
   ```bash
   # Frontend
   npm run lint
   npm run build
   
   # Backend
   cd backend
   node -c server.js
   ```

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "Add: amazing feature description"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/amazing-feature
   ```

## Commit Message Convention

Use the following format for commit messages:
- `Add:` for new features
- `Fix:` for bug fixes
- `Update:` for improvements
- `Remove:` for deletions
- `Docs:` for documentation changes

Examples:
- `Add: real-time progress tracking`
- `Fix: URL validation for https URLs`
- `Update: Cloudflare detection patterns`

## Testing

### Frontend Testing
- Test components in isolation
- Test user interactions
- Test error handling

### Backend Testing
- Test API endpoints
- Test error scenarios
- Test data validation

## Reporting Issues

When reporting issues, please include:
1. **Description**: Clear description of the issue
2. **Steps to Reproduce**: Detailed steps to reproduce the issue
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Environment**: OS, Node.js version, browser version
6. **Logs**: Relevant error logs or console output

## Feature Requests

When requesting features, please include:
1. **Use Case**: Why is this feature needed?
2. **Description**: Detailed description of the feature
3. **Mockups**: Visual mockups if applicable
4. **Implementation Ideas**: Any ideas on how to implement

## Code Review Process

1. All PRs require at least one review
2. Address review comments promptly
3. Keep PRs focused and small
4. Update documentation as needed
5. Ensure all tests pass

## Development Guidelines

### File Structure
```
components/
├── ComponentName.tsx
├── ComponentName.test.tsx
└── index.ts

backend/
├── routes/
├── middleware/
├── utils/
└── tests/
```

### Error Handling
- Use try-catch blocks for async operations
- Provide meaningful error messages
- Log errors appropriately
- Handle edge cases

### Performance
- Optimize for large datasets
- Use pagination when appropriate
- Implement proper caching
- Monitor memory usage

## Questions?

If you have questions about contributing:
1. Check existing issues and discussions
2. Create a new issue with the "question" label
3. Join our community discussions

Thank you for contributing! 🚀
