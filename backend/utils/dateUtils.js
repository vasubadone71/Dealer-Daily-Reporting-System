const getTodayIstDate = () => {
    const now = new Date();
    // Get UTC offset
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    // Shift by +5.5 hours for IST
    const istDate = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + istOffsetMs);
    return istDate.toISOString().split('T')[0];
};

module.exports = {
    getTodayIstDate
};
