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

export default function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    // GET requests
    if (req.method === 'GET') {
        const { id } = req.query;
        
        if (id) {
            const script = scripts.find(s => s.id === id);
            if (script) {
                return res.status(200).json(script);
            } else {
                return res.status(404).json({ error: 'Script not found' });
            }
        }
        
        return res.status(200).json(scripts);
    }
    
    // POST requests
    if (req.method === 'POST') {
        const { action, id } = req.query;
        
        // Handle likes
        if (action === 'like') {
            const script = scripts.find(s => s.id === id);
            if (script) {
                script.likes = (script.likes || 0) + 1;
                return res.status(200).json({ success: true });
            }
            return res.status(404).json({ error: 'Script not found' });
        }
        
        // Handle new script upload
        const { title, author, description, code } = req.body;
        
        if (!title || !author || !code) {
            return res.status(400).json({ error: 'Missing required fields' });
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
