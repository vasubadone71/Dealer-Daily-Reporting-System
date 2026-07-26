const dispatchRepository = require('./repositories/dispatchRepository');
const logRepository = require('./repositories/logRepository');
const db = require('./database/db');

async function test() {
    try {
        const dealerId = 31;
        const date = '2026-07-25';
        const items = [{ variant_color_id: 624, quantity: 3 }];
        const userId = 30;
        const isOpeningStock = false;
        const sourceId = 30;
        const initialStatus = 'Pending';
        const actorType = 'dealer';
        const username = 'MP390299';

        const result = await dispatchRepository.saveDispatch(dealerId, date, items, userId, isOpeningStock, sourceId, initialStatus);
        console.log('Dispatch saved:', result);

        await logRepository.logActivity({
            actorType: actorType,
            actorId: userId,
            username: username,
            action: 'Saved Dispatch',
            details: `Saved dispatch for dealer ${dealerId} on date: ${date} with ${items.length} items`,
            ipAddress: '127.0.0.1'
        });
        console.log('Log saved successfully.');
    } catch(err) {
        console.error('Error occurred:', err.message, err.stack);
    }
}

test();
