// api/verify-key.js - API endpoint for Roblox Lua script executors

export default async function handler(req, res) {
    // Enable CORS for Roblox executors
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // In-memory key storage (in production, use Vercel Postgres or Blob)
    // For now, using a simple array - you can add more keys here
    const VALID_KEYS = [
        "approve-carbon-manual-728$#9",
        "premium-key-2024-roblox#7",
        "ultra-script-unlock-99x"
    ];
    
    // ==================== GET VERIFICATION (Easiest for Lua) ====================
    if (req.method === 'GET') {
        const { key } = req.query;
        
        if (!key) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing key parameter',
                message: 'Usage: ?key=YOUR_KEY'
            });
        }
        
        // Check if key is valid
        const isValid = VALID_KEYS.includes(key);
        
        if (isValid) {
            return res.status(200).json({
                success: true,
                verified: true,
                message: 'Key verified successfully!',
                key: key,
                timestamp: Date.now()
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
    
    // ==================== POST VERIFICATION ====================
    if (req.method === 'POST') {
        const { key } = req.body;
        
        if (!key) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing key in request body'
            });
        }
        
        const isValid = VALID_KEYS.includes(key);
        
        if (isValid) {
            return res.status(200).json({
                success: true,
                verified: true,
                message: 'Key verified successfully!',
                key: key
            });
        } else {
            return res.status(401).json({
                success: false,
                verified: false,
                error: 'Invalid key'
            });
        }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}
