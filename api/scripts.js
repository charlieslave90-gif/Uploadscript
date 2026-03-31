import { put, list, del } from '@vercel/blob';

const ADMIN_PASSWORD = 'karah123'; // CHANGE THIS TO YOUR PASSWORD!

// Helper functions
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
        // Try to find by ID
        let script = scripts.find(s => s.id === identifier);
        return script || null;
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

async function isDuplicate(title) {
    const allScripts = await getAllScripts();
    return allScripts.some(script => 
        script.title.toLowerCase() === title.toLowerCase()
    );
}

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // ==================== GET SCRIPTS ====================
    if (req.method === 'GET') {
        try {
            const { id, sort } = req.query;
            
            // Get single script by ID
            if (id) {
                const script = await getScript(id);
                if (script) {
                    return res.status(200).json(script);
                }
                return res.status(404).json({ error: 'Script not found' });
            }
            
            // Get all scripts
            let scripts = await getAllScripts();
            
            // Apply sorting
            if (sort === 'recent') {
                scripts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            } else if (sort === 'popular') {
                scripts.sort((a, b) => (b.likes || 0) - (a.likes || 0));
            }
            
            return res.status(200).json(scripts);
        } catch (error) {
            console.error('GET Error:', error);
            return res.status(500).json({ error: 'Server error' });
        }
    }
    
    // ==================== LIKE SCRIPT ====================
    if (req.method === 'POST' && req.query.action === 'like') {
        try {
            const { id } = req.query;
            const script = await getScript(id);
            
            if (!script) {
                return res.status(404).json({ error: 'Script not found' });
            }
            
            // Get user IP for tracking
            const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            
            if (!script.likedBy) script.likedBy = [];
            
            // Check if user already liked
            if (script.likedBy.includes(userIp)) {
                return res.status(400).json({ error: 'You already liked this script' });
            }
            
            // Add like
            script.likedBy.push(userIp);
            script.likes = (script.likes || 0) + 1;
            await saveScript(script);
            
            return res.status(200).json({ success: true, likes: script.likes });
        } catch (error) {
            console.error('Like Error:', error);
            return res.status(500).json({ error: 'Server error' });
        }
    }
    
    // ==================== UPLOAD SCRIPT ====================
    if (req.method === 'POST' && !req.query.action) {
        const adminPassword = req.headers['x-admin-password'];
        
        // Check admin password
        if (adminPassword !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Unauthorized. Invalid admin password.' });
        }
        
        try {
            const { type, title, author, description, code, link, thumbnail, youtubeId } = req.body;
            
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
            
            // Check for duplicate title
            const duplicate = await isDuplicate(title);
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
            
            // Add optional fields
            if (thumbnail) {
                newScript.thumbnail = thumbnail;
            }
            if (youtubeId) {
                newScript.youtubeId = youtubeId;
            }
            
            // Add code or link
            if (type === 'code') {
                newScript.code = code.substring(0, 50000);
            } else {
                newScript.link = link;
            }
            
            // Save to blob storage
            await saveScript(newScript);
            
            console.log(`✅ Script uploaded: ${title} by ${author}`);
            
            return res.status(201).json(newScript);
            
        } catch (error) {
            console.error('Upload Error:', error);
            return res.status(500).json({ error: 'Server error: ' + error.message });
        }
    }
    
    // ==================== UPDATE SCRIPT ====================
    if (req.method === 'PUT') {
        const adminPassword = req.headers['x-admin-password'];
        
        // Check admin password
        if (adminPassword !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Unauthorized. Invalid admin password.' });
        }
        
        try {
            const { id, title, author, description, type, code, link, thumbnail, youtubeId } = req.body;
            
            if (!id) {
                return res.status(400).json({ error: 'Script ID required' });
            }
            
            // Get existing script
            const existingScript = await getScript(id);
            if (!existingScript) {
                return res.status(404).json({ error: 'Script not found' });
            }
            
            // Update fields
            if (title) existingScript.title = title.substring(0, 100);
            if (author) existingScript.author = author.substring(0, 50);
            if (description) existingScript.description = description.substring(0, 500);
            if (type) existingScript.type = type;
            if (thumbnail) existingScript.thumbnail = thumbnail;
            if (youtubeId) existingScript.youtubeId = youtubeId;
            
            // Update code or link based on type
            if (type === 'code' && code) {
                existingScript.code = code.substring(0, 50000);
                delete existingScript.link;
            } else if (type === 'link' && link) {
                existingScript.link = link;
                delete existingScript.code;
            }
            
            // Save updated script
            await saveScript(existingScript);
            
            console.log(`✅ Script updated: ${existingScript.title}`);
            
            return res.status(200).json({ success: true, script: existingScript });
            
        } catch (error) {
            console.error('Update Error:', error);
            return res.status(500).json({ error: 'Server error: ' + error.message });
        }
    }
    
    // ==================== DELETE SCRIPT ====================
    if (req.method === 'DELETE') {
        const adminPassword = req.headers['x-admin-password'];
        
        // Check admin password
        if (adminPassword !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Unauthorized. Invalid admin password.' });
        }
        
        try {
            const { id } = req.query;
            
            if (!id) {
                return res.status(400).json({ error: 'Script ID required' });
            }
            
            // Check if script exists
            const script = await getScript(id);
            if (!script) {
                return res.status(404).json({ error: 'Script not found' });
            }
            
            // Delete from blob storage
            const deleted = await deleteScript(script.id);
            
            if (deleted) {
                console.log(`🗑️ Script deleted: ${script.title}`);
                return res.status(200).json({ success: true, message: 'Script deleted successfully' });
            } else {
                return res.status(500).json({ error: 'Failed to delete script' });
            }
            
        } catch (error) {
            console.error('Delete Error:', error);
            return res.status(500).json({ error: 'Server error: ' + error.message });
        }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}
