export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    // ========== NEW VALID KEYS (UPDATED) ==========
    const VALID_KEYS = [
        "gay_XgVsJAD70297UNjn",
        "Site_nPCkS6asaeU0Q5qG",
        "Api_JENdv4Mincr2R6Co",
        "Goldy_GgFDwIh27Rn1Z9zE",
        "Roblox_4ncBt7JvMcn3Ttvc"
    ];
    
    if (req.method === 'GET') {
        const { key } = req.query;
        if (!key) return res.status(400).json({ success: false, verified: false, error: 'Missing key' });
        const isValid = VALID_KEYS.includes(key);
        if (isValid) return res.status(200).json({ success: true, verified: true });
        else return res.status(401).json({ success: false, verified: false });
    }
    
    if (req.method === 'POST') {
        const { key } = req.body;
        const isValid = VALID_KEYS.includes(key);
        return res.status(isValid ? 200 : 401).json({ success: isValid, verified: isValid });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}
