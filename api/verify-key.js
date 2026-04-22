// api/verify-key.js - Fixed with correct key

export default async function handler(req, res) {
    // Enable CORS for Roblox executors
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // ============ THE CORRECT KEY ============
    const VALID_KEYS = [
        "approve-carbon-manual-728$#9",
        "approve-carbon-manual-728$#9",  // Added twice just to be sure
        "approve-carbon-manual-728$#9"   // Make sure it matches EXACTLY
    ];
    
    // GET request (for Lua executors)
    if (req.method === 'GET') {
        const { key } = req.query;
        
        console.log(`[VERIFY] Checking key: "${key}"`);
        console.log(`[VERIFY] Expected: "approve-carbon-manual-728$#9"`);
        
        if (!key) {
            return res.status(400).json({ 
                success: false, 
                verified: false,
                error: 'Missing key parameter'
            });
        }
        
        // Exact match check
        const isValid = key === "approve-carbon-manual-728$#9";
        
        if (isValid) {
            console.log(`[VERIFY] ✅ Key valid!`);
            return res.status(200).json({
                success: true,
                verified: true,
                message: 'Key verified successfully!'
            });
        } else {
            console.log(`[VERIFY] ❌ Key invalid!`);
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
        
        const isValid = key === "approve-carbon-manual-728$#9";
        
        if (isValid) {
            return res.status(200).json({ success: true, verified: true });
        } else {
            return res.status(401).json({ success: false, verified: false });
        }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}
