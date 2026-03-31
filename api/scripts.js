import { put, list, del } from '@vercel/blob';

// Helper to get all scripts
async function getAllScripts() {
    try {
        const { blobs } = await list({ prefix: 'scripts/', limit: 1000 });
        const scripts = [];
        
        for (const blob of blobs) {
            const response = await fetch(blob.url);
            const script = await response.json();
            scripts.push(script);
        }
        
        return scripts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
        console.error('Error loading scripts:', error);
        return [];
    }
}

// Helper to get single script
async function getScript(id) {
    try {
        const { blobs } = await list({ prefix: `scripts/${id}`, limit: 1 });
        if (blobs.length === 0) return null;
        
        const response = await fetch(blobs[0].url);
        return await response.json();
    } catch (error) {
        console.error('Error loading script:', error);
        return null;
    }
}

// Helper to save script
async function saveScript(script) {
    const blob = await put(
        `scripts/${script.id}.json`,
        JSON.stringify(script),
        { access: 'public' }
    );
    return blob.url;
}

// Rate limiting storage
const uploadHistory = new Map();

// Helper functions
function hasSpamLinks(text) {
    if (!text) return false;
    const spamPatterns = [
        /discord\.gg\/[a-zA-Z0-9]+/i,
        /discord\.com\/invite\/[a-zA-Z0-9]+/i,
        /t\.me\/[a-zA-Z0-9]+/i,
        /telegram\.me\/[a-zA-Z0-9]+/i
    ];
    return spamPatterns.some(pattern => pattern.test(text));
}

async function isDuplicate(title, author, code = null, link = null) {
    const allScripts = await getAllScripts();
    return allScripts.some(script => 
        script.title.toLowerCase() === title.toLowerCase() ||
        (code && script.code === code) ||
        (link && script.link === link) ||
        (script.author.toLowerCase() === author.toLowerCase() && 
         script.title.toLowerCase() === title.toLowerCase())
    );
}

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // GET - Fetch scripts
    if (req.method === 'GET') {
        try {
            const { id, sort } = req.query;
            
            if (id) {
                const script = await getScript(id);
                if (script) {
                    return res.status(200).json(script);
                }
                return res.status(404).json({ error: 'Script not found' });
            }
            
            let scripts = await getAllScripts();
            
            if (sort === 'recent') {
                scripts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            } else if (sort === 'popular') {
                scripts.sort((a, b) => (b.likes || 0) - (a.likes || 0));
            }
            
            return res.status(200).json(scripts);
        } catch (error) {
            console.error('GET Error:', error);
            return res.status(500).json({ error: 'Server error: ' + error.message });
        }
    }
    
    // POST - Upload or like
    if (req.method === 'POST') {
        try {
            const { action, id } = req.query;
            
            // Like a script
            if (action === 'like') {
                const script = await getScript(id);
                
                if (!script) {
                    return res.status(404).json({ error: 'Script not found' });
                }
                
                const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
                const userAgent = req.headers['user-agent'] || '';
                const userId = `${userIp}-${userAgent.substring(0, 50)}`;
                
                if (!script.likedBy) script.likedBy = [];
                
                if (script.likedBy.includes(userId)) {
                    return res.status(400).json({ error: 'You already liked this script' });
                }
                
                script.likedBy.push(userId);
                script.likes = (script.likes || 0) + 1;
                await saveScript(script);
                
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
                return res.status(400).json({ error: 'Missing title, author, or description' });
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
                return res.status(400).json({ error: 'Please provide a valid URL starting with http:// or https://' });
            }
            
            // Check duplicates
            const duplicate = await isDuplicate(title, author, code, link);
            if (duplicate) {
                return res.status(400).json({ error: 'A script with this title already exists' });
            }
            
            // Create new script
            const newId = Date.now().toString();
            const newScript = {
                id: newId,
                type: type || 'code',
                title: title.substring(0, 100),
                author: author.substring(0, 50),
                description: description.substring(0, 500),
                createdAt: new Date().toISOString(),
                likes: 0,
                verified: false,
                likedBy: []
            };
            
            if (type === 'code') {
                newScript.code = code.substring(0, 50000);
            } else {
                newScript.link = link;
            }
            
            // Save to Blob storage
            await saveScript(newScript);
            
            // Update rate limit
            recentUploads.push(now);
            uploadHistory.set(clientIp, recentUploads);
            
            console.log(`✅ Script saved: ${title} by ${author}`);
            
            return res.status(201).json(newScript);
            
        } catch (error) {
            console.error('POST Error:', error);
            return res.status(500).json({ error: 'Server error: ' + error.message });
        }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}
