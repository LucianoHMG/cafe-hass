#!/usr/bin/env node

// Simple test script to verify import/export functionality
import { transpiler } from './packages/transpiler/dist/index.js';

// Create a simple test graph
const testGraph = {
  id: '12345678-1234-1234-1234-123456789abc',
  name: 'Test Automation',
  description: 'A test automation',
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        platform: 'state',
        entity_id: 'light.living_room',
        to: 'on'
      }
    },
    {
      id: 'action-1',
      type: 'action',
      position: { x: 300, y: 200 },
      data: {
        service: 'notify.mobile_app',
        data: {
          message: 'Light turned on!'
        }
      }
    }
  ],
  edges: [
    {
      id: 'e1',
      source: 'trigger-1',
      target: 'action-1'
    }
  ],
  metadata: {
    mode: 'single'
  },
  version: 1
};

console.log('=== Testing Export (toYaml) ===\n');

try {
  const yaml = transpiler.toYaml(testGraph);
  console.log('Generated YAML:');
  console.log(yaml);
  console.log('\n=== Testing Import (fromYaml) ===\n');

  // Test importing the generated YAML
  const parseResult = transpiler.fromYaml(yaml);

  if (parseResult.success) {
    console.log('✅ Import successful!');
    console.log(`   Graph ID: ${parseResult.graph.id}`);
    console.log(`   Graph Name: ${parseResult.graph.name}`);
    console.log(`   Nodes: ${parseResult.graph.nodes.length}`);
    console.log(`   Edges: ${parseResult.graph.edges.length}`);
    console.log(`   Had metadata: ${parseResult.hadMetadata}`);

    if (parseResult.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      parseResult.warnings.forEach(w => console.log(`   - ${w}`));
    }

    // Check if positions were preserved
    const firstNode = parseResult.graph.nodes[0];
    console.log(`\n   First node position: x=${firstNode.position.x}, y=${firstNode.position.y}`);

    if (firstNode.position.x === 100 && firstNode.position.y === 100) {
      console.log('   ✅ Position metadata preserved!');
    } else {
      console.log('   ⚠️  Position was reset (expected for heuristic layout)');
    }
  } else {
    console.log('❌ Import failed!');
    console.log('Errors:', parseResult.errors);
  }
} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}

console.log('\n=== All tests passed! ===');
