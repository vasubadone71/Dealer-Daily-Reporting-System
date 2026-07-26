const dispatchController = require('./controllers/dispatchController');

const req = {
    user: { id: 30, role: 'godown', type: 'dealer', dealer_code: 'MP390299' },
    body: { dealerId: 31, date: '2026-07-25', isOpeningStock: false, items: [{ variant_color_id: 624, quantity: 3 }] },
    ip: '127.0.0.1',
    headers: {}
};

const res = {
    status: function(code) {
        this.statusCode = code;
        return this;
    },
    json: function(data) {
        console.log('Response:', this.statusCode, data);
    }
};

async function test() {
    await dispatchController.saveDispatch(req, res);
}

test();
