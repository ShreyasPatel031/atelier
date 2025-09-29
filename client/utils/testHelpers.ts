/**
 * Test Helper Functions
 * Utility functions for E2E and unit tests
 */

const architecturePrompts = [
  'Create a microservices architecture with API Gateway, User Service, Product Service, and Database',
  'Design a scalable web application with frontend, backend, and database components',
  'Build a containerized application with Kubernetes orchestration',
  'Design a serverless architecture using AWS Lambda functions',
  'Create a distributed system with message queues and caching layers',
  'Design a cloud-native application with load balancers and auto-scaling',
  'Build a data pipeline architecture with ETL processes',
  'Create a secure multi-tier application with authentication and authorization',
  'Design a monitoring and observability platform',
  'Build an event-driven architecture with pub/sub messaging'
];

export function getRandomArchitecturePrompt(): string {
  const randomIndex = Math.floor(Math.random() * architecturePrompts.length);
  return architecturePrompts[randomIndex];
}

export function waitForArchitectureGeneration(page: any, timeout: number = 15000): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const nodeCount = await page.locator('.react-flow__node').count();
      if (nodeCount > 0) {
        resolve();
        return;
      }
      await page.waitForTimeout(500);
    }
    
    reject(new Error('Architecture generation timeout'));
  });
}

export function generateTestArchitectureData() {
  return {
    name: 'Test Architecture',
    rawGraph: {
      id: 'root',
      children: [
        {
          id: 'api-gateway',
          data: { label: 'API Gateway', icon: 'aws_api_gateway' },
          position: { x: 100, y: 100 }
        },
        {
          id: 'user-service',
          data: { label: 'User Service', icon: 'aws_lambda' },
          position: { x: 300, y: 100 }
        },
        {
          id: 'database',
          data: { label: 'Database', icon: 'ads_rds' },
          position: { x: 300, y: 300 }
        }
      ],
      edges: [
        {
          id: 'e1',
          source: 'api-gateway',
          target: 'user-service'
        },
        {
          id: 'e2',
          source: 'user-service',
          target: 'database'
        }
      ]
    }
  };
}
