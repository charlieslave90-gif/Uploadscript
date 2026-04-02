import { put, list, del } from '@vercel/blob';

const ADMIN_PASSWORD = 'karah123';

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

async function getScript(identifier) {
    try {
        const scripts = await getAllScripts();
        return scripts.find(s => s.id === identifier) || null;
    } catch (error) {
        console.error('Error loading script:', error);
        return null;
    }
}

async function saveScript(script) {
    const blob = await put(`scripts/${script.id}.json`, JSON.stringify(script), { access: 'public' });
    return blob.url;
}

async function deleteScript(id) {
    try {
        const { blobs } = await list({ prefix: `scripts/${id}`, limit: 1 });
        for (const blob of blobs) await del(blob.url);
        return true;
    } catch (error) {
        console.error('Error deleting script:', error);
        return false;
    }
}

function hasSpamLinks(text) {
    if (!text) return false;
    const spamPatterns = [/discord\.gg\/[a-zA-Z0-9]+/i, /discord\.com\/invite\/[a-zA-Z0-9]+/i, /t\.me\/[a-zA-Z0-9]+/i, /telegram\.me\/[a-zA-Z0-9]+/i];
    return spamPatterns.some(pattern => pattern.test(text));
}

async function isDuplicate(title, currentId = null) {
    const allScripts = await getAllScripts();
    return allScripts.some(script => script.title.toLowerCase() === title.toLowerCase() && script.id !== currentId);
}

async function findDuplicateScripts() {
    const allScripts = await getAllScripts();
    const duplicates = [];
    const seenTitles = new Map();
    for (const script of allScripts) {
        const titleLower = script.title.toLowerCase();
        if (seenTitles.has(titleLower)) {
            const existing = seenTitles.get(titleLower);
            if (new Date(script.createdAt) > new Date(existing.createdAt)) {
                duplicates.push(existing.id);
                seenTitles.set(titleLower, script);
            } else {
                duplicates.push(script.id);
            }
        } else {
            seenTitles.set(titleLower, script);
        }
    }
    return duplicates;
}

async function autoDeleteDuplicates() {
    const duplicates = await findDuplicateScripts();
    for (const dupId of duplicates) {
        console.log(`🗑️ Auto-deleting duplicate: ${dupId}`);
        await deleteScript(dupId);
    }
    return duplicates.length;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    // GET
    if (req.method === 'GET') {
        try {
            const { id, sort } = req.query;
            if (!id) await autoDeleteDuplicates();
            if (id) {
                const script = await getScript(id);
                return script ? res.status(200).json(script) : res.status(404).json({ error: 'Script not found' });
            }
            let scripts = await getAllScripts();
            if (sort === 'recent') scripts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            if (sort === 'popular') scripts.sort((a, b) => (b.likes || 0) - (a.likes || 0));
            return res.status(200).json(scripts);
        } catch (error) {
            return res.status(500).json({ error: 'Server error' });
        }
    }
    
    // LIKE
    if (req.method === 'POST' && req.query.action === 'like') {
        try {
            const { id } = req.query;
            const script = await getScript(id);
            if (!script) return res.status(404).json({ error: 'Script not found' });
            const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            if (!script.likedBy) script.likedBy = [];
            if (script.likedBy.includes(userIp)) return res.status(400).json({ error: 'Already liked' });
            script.likedBy.push(userIp);
            script.likes = (script.likes || 0) + 1;
            await saveScript(script);
            return res.status(200).json({ success: true, likes: script.likes });
        } catch (error) {
            return res.status(500).json({ error: 'Server error' });
        }
    }
    
    // VIEW (track unique views)
    if (req.method === 'POST' && req.query.action === 'view') {
        try {
            const { id } = req.query;
            const script = await getScript(id);
            if (!script) return res.status(404).json({ error: 'Script not found' });
            script.views = (script.views || 0) + 1;
            await saveScript(script);
            return res.status(200).json({ success: true, views: script.views });
        } catch (error) {
            return res.status(500).json({ error: 'Server error' });
        }
    }
    
    // UPLOAD
    if (req.method === 'POST' && !req.query.action) {
        const adminPassword = req.headers['x-admin-password'];
        if (adminPassword !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
        
        try {
            const { type, title, author, description, code, link, thumbnail, youtubeId } = req.body;
            if (!title || !author || !description) return res.status(400).json({ error: 'Missing fields' });
            if (title.length < 3) return res.status(400).json({ error: 'Title too short' });
            if (hasSpamLinks(title) || hasSpamLinks(author) || hasSpamLinks(description)) return res.status(400).json({ error: 'No Discord/Telegram invites' });
            if (type === 'code' && (!code || code.length < 10)) return res.status(400).json({ error: 'Code too short' });
            if (type === 'link' && (!link || !link.startsWith('http'))) return res.status(400).json({ error: 'Invalid URL' });
            
            const duplicate = await isDuplicate(title);
            if (duplicate) return res.status(400).json({ error: 'Title already exists' });
            
            const newId = Date.now().toString();
            const newScript = {
                id: newId, type: type || 'code', title: title.substring(0, 100), author: author.substring(0, 50),
                description: description.substring(0, 500), createdAt: new Date().toISOString(),
                likes: 0, views: 0, verified: false, likedBy: []
            };
            if (thumbnail) newScript.thumbnail = thumbnail;
            if (youtubeId) newScript.youtubeId = youtubeId;
            if (type === 'code') newScript.code = code.substring(0, 50000);
            else newScript.link = link;
            
            await saveScript(newScript);
            return res.status(201).json(newScript);
        } catch (error) {
            return res.status(500).json({ error: 'Server error' });
        }
    }
    
    // UPDATE
    if (req.method === 'PUT') {
        const adminPassword = req.headers['x-admin-password'];
        if (adminPassword !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
        
        try {
            const { id, title, author, description, type, code, link, thumbnail, youtubeId } = req.body;
            if (!id) return res.status(400).json({ error: 'Script ID required' });
            const existingScript = await getScript(id);
            if (!existingScript) return res.status(404).json({ error: 'Script not found' });
            
            if (title && title !== existingScript.title) {
                const duplicate = await isDuplicate(title, id);
                if (duplicate) return res.status(400).json({ error: 'Title already exists' });
                existingScript.title = title.substring(0, 100);
            }
            if (author) existingScript.author = author.substring(0, 50);
            if (description) existingScript.description = description.substring(0, 500);
            if (type) existingScript.type = type;
            if (thumbnail) existingScript.thumbnail = thumbnail;
            if (youtubeId) existingScript.youtubeId = youtubeId;
            
            if (type === 'code' && code) { existingScript.code = code.substring(0, 50000); delete existingScript.link; }
            else if (type === 'link' && link) { existingScript.link = link; delete existingScript.code; }
            
            await saveScript(existingScript);
            return res.status(200).json({ success: true, script: existingScript });
        } catch (error) {
            return res.status(500).json({ error: 'Server error' });
        }
    }
    
    // DELETE
    if (req.method === 'DELETE') {
        const adminPassword = req.headers['x-admin-password'];
        if (adminPassword !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
        try {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'Script ID required' });
            const script = await getScript(id);
            if (!script) return res.status(404).json({ error: 'Script not found' });
            const deleted = await deleteScript(script.id);
            return deleted ? res.status(200).json({ success: true }) : res.status(500).json({ error: 'Failed to delete' });
        } catch (error) {
            return res.status(500).json({ error: 'Server error' });
        }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}
