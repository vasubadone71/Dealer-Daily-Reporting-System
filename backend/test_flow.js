const db = require('./database/db');
const stockService = require('./services/stockService');

async function testFlow() {
    console.log('--- STARTING BACKEND TESTS ---');

    const dealerId = 1; 
    const today = new Date().toISOString().split('T')[0];

    try {
        console.log(`Getting today's stock overview for dealer ${dealerId}...`);
        const overview = await stockService.getTodayStockOverview(dealerId);
        console.log('Stock Overview:', JSON.stringify(overview, null, 2));

        console.log('\nRecalculating stock...');
        await stockService.recalculate(dealerId, '2026-07-20');
        console.log('Recalculation finished!');

        console.log('\n--- TESTS COMPLETED SUCCESSFULLY ---');
    } catch (e) {
        console.error('Test failed:', e);
    }
}

setTimeout(() => {
    testFlow();
}, 500);
