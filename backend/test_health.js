const fetch = require('node-fetch');

async function checkApi() {
    console.log("Checking API health...");
    try {
        const res = await fetch('http://localhost:5000/api/health');
        if (res.ok) {
            const data = await res.json();
            console.log("Health OK:", data);
        } else {
            console.log("Health failed:", res.status);
        }
    } catch (e) {
        console.error("Health check failed:", e.message);
    }
}
checkApi();
