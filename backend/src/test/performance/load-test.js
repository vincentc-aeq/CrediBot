module.exports = {
  target: 'http://localhost:3001',
  phases: [
    { duration: '30s', arrivalRate: 10 }, // Warm up
    { duration: '60s', arrivalRate: 50 }, // Normal load
    { duration: '30s', arrivalRate: 100 }, // Peak load
    { duration: '60s', arrivalRate: 200 }, // Stress test
  ],
  defaults: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
  scenarios: [
    {
      name: 'Authentication Flow',
      weight: 30,
      flow: [
        {
          post: {
            url: '/api/auth/register',
            json: {
              username: 'testuser{{ $randomInt(1, 100000) }}',
              email: 'test{{ $randomInt(1, 100000) }}@example.com',
              password: 'ValidPassword123!',
              firstName: 'Test',
              lastName: 'User',
            },
            capture: {
              json: '$.data.token',
              as: 'authToken',
            },
          },
        },
        {
          post: {
            url: '/api/auth/login',
            json: {
              email: 'test{{ $randomInt(1, 100000) }}@example.com',
              password: 'ValidPassword123!',
            },
            capture: {
              json: '$.data.token',
              as: 'authToken',
            },
          },
        },
        {
          get: {
            url: '/api/auth/profile',
            headers: {
              Authorization: 'Bearer {{ authToken }}',
            },
          },
        },
      ],
    },
    {
      name: 'Credit Cards API',
      weight: 25,
      flow: [
        {
          get: {
            url: '/api/cards',
          },
        },
        {
          get: {
            url: '/api/cards/{{ $randomInt(1, 10) }}',
          },
        },
      ],
    },
    {
      name: 'Recommendations API',
      weight: 20,
      flow: [
        {
          get: {
            url: '/api/recommendations/homepage',
            headers: {
              Authorization: 'Bearer {{ authToken }}',
            },
          },
        },
        {
          post: {
            url: '/api/recommendations/transaction-analysis',
            json: {
              amount: '{{ $randomInt(10, 1000) }}',
              category: 'dining',
              merchantName: 'Test Restaurant',
            },
            headers: {
              Authorization: 'Bearer {{ authToken }}',
            },
          },
        },
      ],
    },
    {
      name: 'Analytics API',
      weight: 15,
      flow: [
        {
          get: {
            url: '/api/analytics/spending-patterns',
            headers: {
              Authorization: 'Bearer {{ authToken }}',
            },
          },
        },
        {
          get: {
            url: '/api/analytics/card-performance',
            headers: {
              Authorization: 'Bearer {{ authToken }}',
            },
          },
        },
      ],
    },
    {
      name: 'Health Check',
      weight: 10,
      flow: [
        {
          get: {
            url: '/health',
          },
        },
      ],
    },
  ],
  plugins: {
    'expect': {},
    'metrics-by-endpoint': {
      useOnlyRequestNames: true,
    },
  },
};