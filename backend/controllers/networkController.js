const networkRepository = require('../repositories/networkRepository');
const logRepository = require('../repositories/logRepository');

class NetworkController {
    async getNetworks(req, res) {
        try {
            const networks = await networkRepository.findAll();
            return res.status(200).json({ success: true, data: networks });
        } catch (error) {
            console.error('List networks error:', error);
            return res.status(500).json({ success: false, message: 'Failed to list networks.' });
        }
    }

    async createNetwork(req, res) {
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Forbidden. Super Admin privilege required.' });
        }

        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Network name is required.' });
        }

        try {
            const existing = await networkRepository.findByName(name.trim());
            if (existing) {
                return res.status(400).json({ success: false, message: 'Network name already exists.' });
            }

            await networkRepository.create(name.trim());
            
            await logRepository.logActivity({
                actorType: 'admin',
                actorId: req.user.id,
                username: req.user.username,
                action: 'Network Created',
                details: `Created network: ${name.trim()}`,
                ipAddress: req.ip || req.headers['x-forwarded-for']
            });

            return res.status(201).json({ success: true, message: 'Network created successfully.' });
        } catch (error) {
            console.error('Create network error:', error);
            return res.status(500).json({ success: false, message: 'Failed to create network.' });
        }
    }

    async deleteNetwork(req, res) {
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Forbidden. Super Admin privilege required.' });
        }

        const { id } = req.params;

        try {
            const network = await networkRepository.findById(id);
            if (!network) {
                return res.status(404).json({ success: false, message: 'Network not found.' });
            }

            await networkRepository.delete(id);

            await logRepository.logActivity({
                actorType: 'admin',
                actorId: req.user.id,
                username: req.user.username,
                action: 'Network Deleted',
                details: `Deleted network: ${network.name}`,
                ipAddress: req.ip || req.headers['x-forwarded-for']
            });

            return res.status(200).json({ success: true, message: 'Network deleted successfully.' });
        } catch (error) {
            console.error('Delete network error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to delete network. Check if dealers are assigned to this network.' 
            });
        }
    }
}

module.exports = new NetworkController();
