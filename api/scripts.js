// Track uploads for rate limiting
const uploadHistory = new Map(); // IP -> timestamp

// Helper function to remove links and Discord invites
function removeLinks(text) {
    // Remove Discord invite links
    let cleaned = text.replace(/discord\.gg\/[a-zA-Z0-9]+/gi, '[REMOVED]');
    cleaned = cleaned.replace(/discord\.com\/invite\/[a-zA-Z0-9]+/gi, '[REMOVED]');
    
    // Remove common URLs
    cleaned = cleaned.replace(/https?:\/\/[^\s]+/gi, '[REMOVED]');
    cleaned = cleaned.replace(/www\.[^\s]+/gi, '[REMOVED]');
    
    // Remove .com, .net, .org domains
    cleaned = cleaned.replace(/[a-zA-Z0-9\-]+\.(com|net|org|xyz|club|gg)\b/gi, '[REMOVED]');
    
    return cleaned;
}

// Helper function to check if script is duplicate
function isDuplicate(scripts, title, code, author) {
    return scripts.some(script => 
        script.title.toLowerCase() === title.toLowerCase() ||
        script.code === code ||
        (script.author.toLowerCase() === author.toLowerCase() && 
         script.title.toLowerCase() === title.toLowerCase())
    );
}

let scripts = [
    {
        id: '1',
        title: 'Welcome Script',
        author: 'ScriptHub',
        description: 'This is an example script to get you started',
        code: 'print("Welcome to ScriptHub!")',
        createdAt: new Date().toISOString(),
        likes: 5,
        verified: true
    }
];

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // GET requests
    if (req.method === 'GET') {
        const { id, sort } = req.query;
        
        if (id) {
            const script = scripts.find(s => s.id === id);
            if (script) {
                return res.status(200).json(script);
            }
            return res.status(404).json({ error: 'Script not found' });
        }
        
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
        
        // Validate script (check for links)
        if (action === 'validate') {
            const { code, description, title } = req.body;
            const errors = [];
            
            // Check for links
            const linkPattern = /(discord\.gg|discord\.com\/invite|https?:\/\/|www\.|\.com|\.net|\.org)/gi;
            if (linkPattern.test(code)) {
                errors.push('No links or Discord invites allowed in code');
            }
            if (description && linkPattern.test(description)) {
                errors.push('No links or Discord invites allowed in description');
            }
            if (title && linkPattern.test(title)) {
                errors.push('No links or Discord invites allowed in title');
            }
            
            // Check syntax
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
        
        // Upload new script
        const { title, author, description, code } = req.body;
        
        // Get client IP for rate limiting
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        
        // Rate limiting: max 3 uploads per hour
        const now = Date.now();
        const userUploads = uploadHistory.get(clientIp) || [];
        const recentUploads = userUploads.filter(time => now - time < 3600000); // 1 hour
        
        if (recentUploads.length >= 3) {
            return res.status(429).json({ 
                error: 'Rate limit exceeded. Maximum 3 uploads per hour.' 
            });
        }
        
        // Check required fields
        if (!title || !author || !code) {
            return res.status(400).json({ error: 'Missing title, author, or code' });
        }
        
        // Check for links in input
        const linkPattern = /(discord\.gg|discord\.com\/invite|https?:\/\/|www\.|\.com|\.net|\.org)/gi;
        if (linkPattern.test(title)) {
            return res.status(400).json({ error: 'No links or Discord invites allowed in title' });
        }
        if (linkPattern.test(author)) {
            return res.status(400).json({ error: 'No links or Discord invites allowed in author name' });
        }
        if (linkPattern.test(code)) {
            return res.status(400).json({ error: 'No links or Discord invites allowed in script code' });
        }
        
        // Check for duplicate scripts
        if (isDuplicate(scripts, title, code, author)) {
            return res.status(400).json({ 
                error: 'A script with this title or code already exists! Please use a different title.' 
            });
        }
        
        // Clean description from links
        let cleanDescription = description || '';
        if (cleanDescription) {
            cleanDescription = removeLinks(cleanDescription);
        }
        
        // Create new script
        const newScript = {
            id: Date.now().toString(),
            title: title.substring(0, 100), // Limit length
            author: author.substring(0, 50),
            description: cleanDescription.substring(0, 500),
            code: code.substring(0, 50000), // Limit code length
            createdAt: new Date().toISOString(),
            likes: 0,
            verified: false
        };
        
        scripts.unshift(newScript); // Add to beginning (newest first)
        
        // Update rate limit history
        recentUploads.push(now);
        uploadHistory.set(clientIp, recentUploads);
        
        return res.status(201).json(newScript);
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}
