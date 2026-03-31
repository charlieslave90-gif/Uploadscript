// This is the ONLY file in the api folder
// File path: /api/scripts.js

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // In-memory database
    let scripts = [
        {
            id: '1',
            title: 'Example Script',
            author: 'DemoUser',
            description: 'This is an example script',
            code: 'print("Hello World")',
            createdAt: new Date().toISOString(),
            likes: 0
        }
    ];
    
    // GET request
    if (req.method === 'GET') {
        const { id } = req.query;
        
        if (id) {
            const script = scripts.find(s => s.id === id);
            if (script) {
                return res.status(200).json(script);
            }
            return res.status(404).json({ error: 'Script not found' });
        }
        
        return res.status(200).json(scripts);
    }
    
    // POST request
    if (req.method === 'POST') {
        const { action, id } = req.query;
        
        // Like a script
        if (action === 'like') {
            const script = scripts.find(s => s.id === id);
            if (script) {
                script.likes++;
                return res.status(200).json({ success: true, likes: script.likes });
            }
            return res.status(404).json({ error: 'Script not found' });
        }
        
        // Upload new script
        const { title, author, description, code } = req.body;
        
        if (!title || !author || !code) {
            return res.status(400).json({ error: 'Missing title, author, or code' });
        }
        
        const newScript = {
            id: Date.now().toString(),
            title,
            author,
            description: description || '',
            code,
            createdAt: new Date().toISOString(),
            likes: 0
        };
        
        scripts.push(newScript);
        return res.status(201).json(newScript);
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}
