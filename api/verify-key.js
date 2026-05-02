export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    // ========== NEW VALID KEYS (REPLACED) ==========
    const VALID_KEYS = [
        "Free_XJQPWKDMVRTYNAZBLC",
        "KEY_NORMALKEYPERM",
        "OMGTHISKEYISRARE23",
        "FREE_1829c98f814c4",
        "jeilkarah673",
        "KEY_NORMALKEYPERMV2"
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
