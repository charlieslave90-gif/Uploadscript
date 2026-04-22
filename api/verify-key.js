// api/verify-key.js - All keys working

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // ============ ALL 5 KEYS ============
    const VALID_KEYS = [
        "approve-carbon-manual-728$#9",
        "premium-key-2024-roblox#7",
        "ultra-script-unlock-99x",
        "vip-access-gold-tier$5",
        "beta-tester-key-2025"
    ];
    
    if (req.method === 'GET') {
        const { key } = req.query;
        
        if (!key) {
            return res.status(400).json({ 
                success: false, 
                verified: false,
                error: 'Missing key parameter'
            });
        }
        
        // Check if key exists in the list
        const isValid = VALID_KEYS.includes(key);
        
        if (isValid) {
            return res.status(200).json({
                success: true,
                verified: true,
                message: 'Key verified successfully!'
            });
        } else {
            return res.status(401).json({
                success: false,
                verified: false,
                error: 'Invalid key',
                message: 'The key you provided is invalid'
            });
        }
    }
    
    if (req.method === 'POST') {
        const { key } = req.body;
        
        if (!key) {
            return res.status(400).json({ success: false, error: 'Missing key' });
        }
        
        const isValid = VALID_KEYS.includes(key);
        
        if (isValid) {
            return res.status(200).json({ success: true, verified: true });
        } else {
            return res.status(401).json({ success: false, verified: false });
        }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}
