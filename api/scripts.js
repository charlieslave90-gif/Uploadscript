import { put, list, del } from '@vercel/blob';

const ADMIN_PASSWORD = 'karah123'; // CHANGE THIS!

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

async function getScript(idOrSlug) {
    try {
        // Try to find by ID first, then by slug
        const { blobs } = await list({ prefix: 'scripts/', limit: 1000 });
        
        for (const blob of blobs) {
            const response = await fetch(blob.url);
            const script = await response.json();
            
            if (script.id === idOrSlug || script.slug === idOrSlug) {
                return script;
            }
        }
        return null;
    } catch (error) {
        console.error('Error loading script:', error);
        return null;
    }
}

async function saveScript(script) {
    const blob = await put(
        `scripts/${script.id}.json`,
        JSON.stringify(script),
        { access: 'public' }
    );
    return blob.url;
}

async function deleteScript(id) {
    try {
        const { blobs } = await list({ prefix: `scripts/${id}`, limit: 1 });
        for (const blob of blobs) {
            await del(blob.url);
        }
        return true;
    } catch (error) {
        console.error('Error deleting script:', error);
        return false;
    }
}

function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

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

async function isDuplicate(title, slug) {
    const allScripts = await getAllScripts();
    return allScripts.some(script => 
        script.title.toLowerCase() === title.toLowerCase() ||
        script.slug === slug
    );
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // GET scripts (supports both ID and slug)
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
            return res.status(500).json({ error: 'Server error' });
        }
    }
    
    // Like script
    if (req.method === 'POST' && req.query.action === 'like') {
        try {
            const { id } = req.query;
            const script = await getScript(id);
            
            if (!script) {
                return res.status(404).json({ error: 'Script not found' });
            }
            
            const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            
            if (!script.likedBy) script.likedBy = [];
            
            if (script.likedBy.includes(userIp)) {
                return res.status(400).json({ error: 'You already liked this script' });
            }
            
            script.likedBy.push(userIp);
            script.likes = (script.likes || 0) + 1;
            await saveScript(script);
            
            return res.status(200).json({ success: true, likes: script.likes });
        } catch (error) {
            return res.status(500).json({ error: 'Server error' });
        }
    }
    
    // DELETE script
    if (req.method === 'DELETE') {
        const adminPassword = req.headers['x-admin-password'];
        
        if (adminPassword !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const { id } = req.query;
        
        if (!id) {
            return res.status(400).json({ error: 'Script ID required' });
        }
        
        const deleted = await deleteScript(id);
        
        if (deleted) {
            return res.status(200).json({ success: true });
        } else {
            return res.status(500).json({ error: 'Failed to delete' });
        }
    }
    
    // UPLOAD script (with custom slug)
    if (req.method === 'POST' && !req.query.action) {
        const adminPassword = req.headers['x-admin-password'];
        
        if (adminPassword !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        try {
            const { type, title, author, description, code, link, thumbnail, youtubeId, customSlug } = req.body;
            
            if (!title || !author || !description) {
                return res.status(400).json({ error: 'Missing required fields' });
            }
            
            if (title.length < 3) {
                return res.status(400).json({ error: 'Title too short' });
            }
            
            if (hasSpamLinks(title) || hasSpamLinks(author) || hasSpamLinks(description)) {
                return res.status(400).json({ error: 'No Discord/Telegram invites allowed' });
            }
            
            if (type === 'code' && (!code || code.length < 10)) {
                return res.status(400).json({ error: 'Code too short' });
            }
            
            if (type === 'link' && (!link || !link.startsWith('http'))) {
                return res.status(400).json({ error: 'Invalid link' });
            }
            
            // Generate or use custom slug
            let slug = customSlug ? customSlug.toLowerCase().replace(/[^a-z0-9-]/g, '') : generateSlug(title);
            
            // Ensure slug is unique
            let finalSlug = slug;
            let counter = 1;
            while (await isDuplicate(title, finalSlug)) {
                finalSlug = `${slug}-${counter}`;
                counter++;
            }
            
            const newId = Date.now().toString();
            const newScript = {
                id: newId,
                slug: finalSlug,
                type: type || 'code',
                title: title.substring(0, 100),
                author: author.substring(0, 50),
                description: description.substring(0, 500),
                createdAt: new Date().toISOString(),
                likes: 0,
                verified: false,
                likedBy: []
            };
            
            if (thumbnail) newScript.thumbnail = thumbnail;
            if (youtubeId) newScript.youtubeId = youtubeId;
            
            if (type === 'code') {
                newScript.code = code.substring(0, 50000);
            } else {
                newScript.link = link;
            }
            
            await saveScript(newScript);
            
            return res.status(201).json(newScript);
        } catch (error) {
            return res.status(500).json({ error: 'Server error' });
        }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}
