// api/verify-key.js - This endpoint allows Roblox executors to verify keys

export default async function handler(req, res) {
    // Enable CORS for Roblox executors
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const SECRET_KEY = 'approve-carbon-manual-728$#9';
    
    if (req.method === 'GET') {
        const { key } = req.query;
        
        if (!key) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing key parameter',
                message: 'Please provide a key in the query string: ?key=YOUR_KEY'
            });
        }
        
        if (key === SECRET_KEY) {
            return res.status(200).json({
                success: true,
                verified: true,
                message: 'Key verified successfully!',
                key: SECRET_KEY,
                expires: Date.now() + 86400000 // 24 hours
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
            return res.status(400).json({ 
                success: false, 
                error: 'Missing key in request body'
            });
        }
        
        if (key === SECRET_KEY) {
            return res.status(200).json({
                success: true,
                verified: true,
                message: 'Key verified successfully!',
                key: SECRET_KEY,
                expires: Date.now() + 86400000
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
