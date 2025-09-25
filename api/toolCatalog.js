// Minimal tool catalog for stream.ts compatibility
// This file provides basic tool definitions for the deprecated stream functionality

export const allTools = [
  {
    name: 'batch_update',
    description: 'Execute graph operations',
    parameters: {
      type: 'object',
      properties: {
        operations: {
          type: 'array',
          description: 'Array of operations to execute',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                enum: ['add_node', 'delete_node', 'move_node', 'add_edge', 'delete_edge', 'group_nodes', 'remove_group']
              },
              nodename: { type: 'string' },
              parentId: { type: 'string' },
              nodeId: { type: 'string' },
              newParentId: { type: 'string' },
              edgeId: { type: 'string' },
              sourceId: { type: 'string' },
              targetId: { type: 'string' },
              nodeIds: { type: 'array', items: { type: 'string' } },
              groupId: { type: 'string' },
              groupIconName: { type: 'string' },
              data: { type: 'object' },
              label: { type: 'string' }
            },
            required: ['name']
          }
        }
      },
      required: ['operations']
    }
  }
];
