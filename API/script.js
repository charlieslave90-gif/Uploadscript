// This is a mock database - replace with MongoDB/PostgreSQL
let scripts = [
    {
        id: '1',
        title: 'Example Script',
        description: 'This is an example script',
        author: 'DemoUser',
        code: 'print("Hello World")',
        createdAt: new Date().toISOString(),
        likes: 5,
        verified: true
    }
];

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method === 'GET') {
        const { sort } = req.query;
        let sortedScripts = [...scripts];
        
        if (sort === 'latest') {
            sortedScripts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else if (sort === 'popular') {
            sortedScripts.sort((a, b) => b.likes - a.likes);
        } else if (sort === 'verified') {
            sortedScripts = sortedScripts.filter(s => s.verified);
        }
        
        res.status(200).json(sortedScripts);
    } 
    else if (req.method === 'POST') {
        const { title, description, author, code } = req.body;
        
        // Basic validation
        if (!title || !code || !author) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
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
        res.status(201).json(newScript);
    }
    else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
