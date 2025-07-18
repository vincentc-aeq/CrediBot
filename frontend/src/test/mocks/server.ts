import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Setup MSW server for testing
export const server = setupServer(...handlers);

// Enable API mocking before tests
beforeAll(() => {
  server.listen();
});

// Reset handlers between tests
afterEach(() => {
  server.resetHandlers();
});

// Clean up after tests
afterAll(() => {
  server.close();
});

export default server;