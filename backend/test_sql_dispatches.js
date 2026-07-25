const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dispatchRepository = require('./repositories/dispatchRepository');
const stockService = require('./services/stockService');

async function run() {
    try {
        console.log("Simulating deleteDispatch(1)");

        // Let's run it step by step manually first
        const db = require('./database/db');
        const id = 1;
        const dispatch = await db.get('SELECT dealer_id, date FROM dispatches WHERE id = ?', [id]);
        if (!dispatch) {
            console.log("Dispatch not found");
            return;
        }
        console.log("Dispatch:", dispatch);

        await db.query('DELETE FROM dispatches WHERE id = ?', [id]);
        console.log("Deleted dispatch from DB");

        console.log("Recalculating stock...");
        await stockService.recalculate(dispatch.dealer_id, dispatch.date);
        console.log("Success");
    } catch (e) {
        console.error("Error occurred:", e);
    }
}

run();