export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    const VALID_KEYS = [
        "",
        "gaynigga",
        "approve-carbon-manual-728$#9",
        "key-2747bajfs",
        "Free_3YKLALOJVQLTAIHNE",
        "Free_3UGIXSZZTNNPPHZIB",
        "Free_3YUEURTIPQRMODNZP",
        "Free_3SAMMYHXXDZOIMONI",
        "Free_3TABJXRRKDZRIWJCX",
        "Free_3DROAVJVJFUKDEHSE",
        "Free_3UYMHNIURNNHTOCEN",
        "Free_3SQZYILHNSFBIRJGS",
        "Free_3IXHLZOWGXBIUNBXP"
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
