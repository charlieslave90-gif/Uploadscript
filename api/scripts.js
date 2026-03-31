const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(process.cwd(), 'scripts-data.json');

function loadScripts() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading scripts:', error);
    }
    
    return [
        {
            id: '1',
            type: 'code',
            title: 'Welcome Script',
            author: 'ScriptHub',
            description: 'Welcome to ScriptHub! This is an example script.',
            code: 'print("Welcome to ScriptHub!")',
            createdAt: new Date().toISOString(),
            likes: 5,
            verified: true,
            likedBy: [] // Track who liked
        }
    ];
}

function saveScripts(scripts) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(scripts, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving scripts:', error);
        return false;
    }
}

const uploadHistory = new Map();

function isDuplicate(scripts, title, author, code = null, link = null) {
    return scripts.some(script => 
        script.title.toLowerCase() === title.toLowerCase() ||
        (code && script.code === code) ||
        (link && script.link === link) ||
        (script.author.toLowerCase() === author.toLowerCase() && 
         script.title.toLowerCase() === title.toLowerCase())
    );
}

function hasSpamLinks(text) {
    const spamPatterns = [
        /discord\.gg\/[a-zA-Z0-9]+/i,
        /discord\.com\/invite\/[a-zA-Z0-9]+/i,
        /t\.me\/[a-zA-Z0-9]+/i,
        /telegram\.me\/[a-zA-Z0-9]+/i
    ];
    return spamPatterns.some(pattern => pattern.test(text));
}

let scripts = loadScripts();

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // GET - Fetch scripts
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
        if (sort === 'recent') {
            sortedScripts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else if (sort === 'popular') {
            sortedScripts.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        }
        
        return res.status(200).json(sortedScripts);
    }
    
    // POST - Upload or like
    if (req.method === 'POST') {
        const { action, id } = req.query;
        
        // Like a script - PREVENT INFINITE LIKES
        if (action === 'like') {
            const script = scripts.find(s => s.id === id);
            if (!script) {
                return res.status(404).json({ error: 'Script not found' });
            }
            
            // Get user identifier (IP + User Agent)
            const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            const userAgent = req.headers['user-agent'] || '';
            const userId = `${userIp}-${userAgent.substring(0, 50)}`;
            
            // Check if user already liked this script
            if (!script.likedBy) {
                script.likedBy = [];
            }
            
            if (script.likedBy.includes(userId)) {
                return res.status(400).json({ error: 'You already liked this script' });
            }
            
            // Add like
            script.likedBy.push(userId);
            script.likes = (script.likes || 0) + 1;
            saveScripts(scripts);
            
            return res.status(200).json({ success: true, likes: script.likes });
        }
        
        // Upload new script
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        
        // Rate limiting: 5 uploads per hour
        const now = Date.now();
        const userUploads = uploadHistory.get(clientIp) || [];
        const recentUploads = userUploads.filter(time => now - time < 3600000);
        
        if (recentUploads.length >= 5) {
            return res.status(429).json({ error: 'Rate limit: Max 5 uploads per hour' });
        }
        
        const { type, title, author, description, code, link } = req.body;
        
        // Validation
        if (!title || !author || !description) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        if (title.length < 3) {
            return res.status(400).json({ error: 'Title must be at least 3 characters' });
        }
        
        if (hasSpamLinks(title) || hasSpamLinks(author) || hasSpamLinks(description)) {
            return res.status(400).json({ error: 'No Discord/Telegram invites allowed' });
        }
        
        if (type === 'code' && (!code || code.length < 10)) {
            return res.status(400).json({ error: 'Script code must be at least 10 characters' });
        }
        
        if (type === 'link' && (!link || !link.startsWith('http'))) {
            return res.status(400).json({ error: 'Please provide a valid URL' });
        }
        
        if (isDuplicate(scripts, title, author, code, link)) {
            return res.status(400).json({ error: 'A similar script already exists' });
        }
        
        // Create new script
        const newScript = {
            id: Date.now().toString(),
            type: type || 'code',
            title: title.substring(0, 100),
            author: author.substring(0, 50),
            description: description.substring(0, 500),
            createdAt: new Date().toISOString(),
            likes: 0,
            verified: false,
            likedBy: [] // Track who liked
        };
        
        if (type === 'code') {
            newScript.code = code.substring(0, 50000);
        } else {
            newScript.link = link;
        }
        
        scripts.unshift(newScript);
        saveScripts(scripts);
        
        recentUploads.push(now);
        uploadHistory.set(clientIp, recentUploads);
        
        return res.status(201).json(newScript);
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}
