// Handles /api/scripts
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
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'GET') {
        // Return all scripts
        res.status(200).json(scripts);
    } 
    else if (req.method === 'POST') {
        // Create new script
        const { title, description, author, code } = req.body;
        
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
}
