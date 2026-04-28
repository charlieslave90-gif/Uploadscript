// api/keys.js - Returns the list of valid keys for the key system

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // ============ ALL VALID KEYS (same as verify-key.js) ============
    const VALID_KEYS = [
        "Free_3YKLALOJVQLTAIHNE",
        "Free_3UGIXSZZTNNPPHZIB",
        "Free_3YUEURTIPQRMODNZP",
        "Free_3SAMMYHXXDZOIMONI",
        "Free_3TABJXRRKDZRIWJCX",
        "Free_3DROAVJVJFUKDEHSE",
        "Free_3UYMHNIURNNHTOCEN",
        "Free_3SQZYILHNSFBIRJGS",
        "free_findajobjobsahur"
    ];
    
    // Remove any empty strings and format for response
    const keys = VALID_KEYS.filter(k => k !== "").map(key => ({
        key: key,
        createdAt: new Date().toISOString()
    }));
    
    return res.status(200).json({
        success: true,
        keys: keys
    });
}
