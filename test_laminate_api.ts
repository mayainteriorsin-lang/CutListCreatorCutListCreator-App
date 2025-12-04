
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';
const TEST_CODE = 'TEST_AUTO_FIX_' + Date.now();

async function testLaminateAPI() {
    console.log('🧪 Starting Laminate Code API Test...');

    // 1. Create
    console.log(`\n1. Creating laminate code: ${TEST_CODE}`);
    const createRes = await fetch(`${BASE_URL}/api/laminate-code-godown`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            code: TEST_CODE,
            name: 'Test Laminate',
            supplier: 'AI Fixer',
            thickness: '1mm',
            woodGrainsEnabled: 'true'
        })
    });

    if (!createRes.ok) {
        const text = await createRes.text();
        throw new Error(`Failed to create: ${createRes.status} ${text}`);
    }
    const created = await createRes.json();
    console.log('✅ Created:', created);

    // 2. Read All
    console.log('\n2. Fetching all codes...');
    const listRes = await fetch(`${BASE_URL}/api/laminate-code-godown`);
    const list = await listRes.json();
    const found = list.find((i: any) => i.code === TEST_CODE);
    if (!found) throw new Error('Created code not found in list!');
    console.log('✅ Found created code in list');

    // 3. Update
    console.log('\n3. Updating code...');
    const updateRes = await fetch(`${BASE_URL}/api/laminate-code-godown/${TEST_CODE}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Updated Test Laminate'
        })
    });
    if (!updateRes.ok) throw new Error('Failed to update');
    const updated = await updateRes.json();
    console.log('✅ Updated:', updated);

    // 4. Delete
    console.log('\n4. Deleting code...');
    const deleteRes = await fetch(`${BASE_URL}/api/laminate-code-godown/${TEST_CODE}`, {
        method: 'DELETE'
    });
    if (!deleteRes.ok) throw new Error('Failed to delete');
    console.log('✅ Deleted successfully');

    console.log('\n🎉 ALL API TESTS PASSED!');
}

testLaminateAPI().catch(err => {
    console.error('❌ Test Failed:', err);
    process.exit(1);
});
