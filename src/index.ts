#!/usr/bin/env node

import { MCPImageServer } from './server.js';

async function main() {
  const server = new MCPImageServer();
  
  process.on('SIGINT', () => {
    console.error('Received SIGINT, shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.error('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
  });

  try {
    await server.run();
  } catch (error) {
    console.error('Server error:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});