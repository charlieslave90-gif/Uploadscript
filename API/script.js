// In-memory database
let scripts = [
    {
        id: '1',
        title: 'Welcome Script',
        description: 'This is an example script to get you started',
        author: 'ScriptHub',
        code: 'print("Welcome to ScriptHub!")',
        createdAt: new Date().toISOString(),
        likes: 5,
        verified: true
    }
];

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    // GET requests
    if (req.method === 'GET') {
        const { id, sort } = req.query;
        
        // Get single script
        if (id) {
            const script = scripts.find(s => s.id === id);
            return script ? res.status(200).json(script) : res.status(404).json({ error: 'Script not found' });
        }
        
        // Get all scripts with sorting
        let sortedScripts = [...scripts];
        if (sort === 'latest') {
            sortedScripts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else if (sort === 'popular') {
            sortedScripts.sort((a, b) => b.likes - a.likes);
        } else if (sort === 'verified') {
            sortedScripts = sortedScripts.filter(s => s.verified);
        }
        
        return res.status(200).json(sortedScripts);
    }
    
    // POST requests
    if (req.method === 'POST') {
        const { action } = req.query;
        
        // Handle likes
        if (action === 'like') {
            const { id } = req.query;
            const script = scripts.find(s => s.id === id);
            if (script) {
                script.likes++;
                return res.status(200).json({ success: true, likes: script.likes });
            }
            return res.status(404).json({ error: 'Script not found' });
        }
        
        // Handle validation
        if (action === 'validate') {
            const { code } = req.body;
            const errors = [];
            
            if (!code || code.trim() === '') {
                errors.push('Script code is empty');
            }
            
            const openParens = (code.match(/\(/g) || []).length;
            const closeParens = (code.match(/\)/g) || []).length;
            if (openParens !== closeParens) {
                errors.push(`Mismatched parentheses: ${openParens} open, ${closeParens} close`);
            }
            
            if (errors.length > 0) {
                return res.status(200).json({ valid: false, error: errors.join(', ') });
            }
            return res.status(200).json({ valid: true });
        }
        
        // Handle new script upload
        const { title, description, author, code } = req.body;
        
        if (!title || !code || !author) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const newScript = {
            id: Date.now().toString(),
            title,
            description: description || '',
            author,
            code,
            createdAt: new Date().toISOString(),
            likes: 0,
            verified: false
        };
        
        scripts.push(newScript);
        return res.status(201).json(newScript);
    }
    
    res.status(405).json({ error: 'Method not allowed' });
}
