// api/verify-key.js - Supports multiple keys

export default async function handler(req, res) {
    // Enable CORS for Roblox executors
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // ============ ADD YOUR KEYS HERE ============
    const VALID_KEYS = [
        "approve-carbon-manual-728$#9",     // Key 1
        "premium-key-2024-roblox#7",        // Key 2
        "ultra-script-unlock-99x",          // Key 3
        "vip-access-gold-tier$5",           // Key 4
        "beta-tester-key-2025",             // Key 5
        // Add as many as you want below:
        // "your-custom-key-here",
        // "another-key-123",
    ];
    
    // GET request (for Lua executors)
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
    
    // POST request
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
