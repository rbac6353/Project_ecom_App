/**
 * E2E Test Setup File
 * 
 * This file runs before each e2e test suite
 */

// Mock environment variables for E2E tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-e2e-testing';

// Use existing database credentials (fallback to root if test user doesn't exist)
// You can override these by setting environment variables before running tests
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '3306';
process.env.DB_USERNAME = process.env.DB_USERNAME || 'root';
// Set DB_PASSWORD to empty string if not provided (for root user without password)
if (!process.env.DB_PASSWORD) {
  process.env.DB_PASSWORD = '';
}
// Try to use existing database or create one for testing
// You can override this by setting DB_DATABASE environment variable
process.env.DB_DATABASE = process.env.DB_DATABASE || 'ecom1'; // Use ecom1 database (from SQL dump)

// Increase timeout for E2E tests (they take longer)
jest.setTimeout(30000);
