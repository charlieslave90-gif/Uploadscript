import { put, list, del } from '@vercel/blob';

const ADMIN_PASSWORD = 'karah123'; // ← CHANGE THIS TO A STRONG PASSWORD!

// Helper: Get all scripts from Blob storage
async function getAllScripts() {
    try {
        const { blobs } = await list({ 
            prefix: 'scripts/', 
            limit: 1000 
        });

        const scripts = [];

        for (const blob of blobs) {
            try {
                const response = await fetch(blob.url);
                if (!response.ok) continue;
                
                const text = await response.text();
                const script = JSON.parse(text);
                scripts.push(script);
            } catch (e) {
                console.error('Failed to parse blob:', blob.url, e);
            }
        }

        return scripts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
        console.error('Error in getAllScripts:', error);
        return [];
    }
}

async function getScript(id) {
    try {
        const scripts = await getAllScripts();
        return scripts.find(s => s.id === id) || null;
    } catch (error) {
        console.error('Error in getScript:', error);
        return null;
    }
}

async function saveScript(script) {
    await put(
        `scripts/${script.id}.json`,
        JSON.stringify(script, null, 2),
        { access: 'public' }
    );
}

async function deleteScript(id) {
    try {
        const { blobs } = await list({ prefix: `scripts/${id}` });
        for (const blob of blobs) {
            await del(blob.url);
        }
        return true;
    } catch (error) {
        console.error('Delete error:', error);
        return false;
    }
}

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // ==================== GET SCRIPTS ====================
    if (req.method === 'GET') {
        try {
            const { id } = req.query;

            if (id) {
                const script = await getScript(id);
                if (script) {
                    return res.status(200).json(script);
                }
                return res.status(404).json({ error: 'Script not found' });
            }

            const scripts = await getAllScripts();
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
            let script = await getScript(id);
            
            if (!script) {
                return res.status(404).json({ error: 'Script not found' });
            }

            const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
            
            if (!script.likedBy) script.likedBy = [];
            if (script.likedBy.includes(userIp)) {
                return res.status(400).json({ error: 'You already liked this script' });
            }

            script.likedBy.push(userIp);
            script.likes = (script.likes || 0) + 1;
            
            await saveScript(script);
            
            return res.status(200).json({ success: true, likes: script.likes });
        } catch (error) {
            console.error('Like Error:', error);
            return res.status(500).json({ error: 'Server error' });
        }
    }

    // Admin password check for write operations
    const adminPassword = req.headers['x-admin-password'];
    if (adminPassword !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized. Invalid admin password.' });
    }

    // ==================== UPLOAD SCRIPT (POST) ====================
    if (req.method === 'POST' && !req.query.action) {
        try {
            const { type, title, author, description, code, link, thumbnail, youtubeId, unlockTask, lootlabUrl } = req.body;

            if (!title || !author || !description) {
                return res.status(400).json({ error: 'Missing title, author, or description' });
            }

            const newId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
            
            const newScript = {
                id: newId,
                type: type || 'code',
                title: title.substring(0, 100),
                author: author.substring(0, 50),
                description: description.substring(0, 500),
                createdAt: new Date().toISOString(),
                likes: 0,
                likedBy: [],
                verified: false,
                unlockTask: unlockTask || 'ad',
                lootlabUrl: lootlabUrl || null
            };

            if (thumbnail) newScript.thumbnail = thumbnail;
            if (youtubeId) newScript.youtubeId = youtubeId;

            if (type === 'code' && code) {
                newScript.code = code.substring(0, 50000);
            } else if (type === 'link' && link) {
                newScript.link = link;
            }

            await saveScript(newScript);
            console.log(`✅ Script uploaded: ${title}`);

            return res.status(201).json(newScript);
        } catch (error) {
            console.error('Upload Error:', error);
            return res.status(500).json({ error: 'Server error: ' + error.message });
        }
    }

    // ==================== UPDATE SCRIPT (PUT) ====================
    if (req.method === 'PUT') {
        try {
            const { id, ...updates } = req.body;
            if (!id) return res.status(400).json({ error: 'Script ID required' });

            let script = await getScript(id);
            if (!script) return res.status(404).json({ error: 'Script not found' });

            Object.assign(script, updates);
            await saveScript(script);

            return res.status(200).json({ success: true, script });
        } catch (error) {
            console.error('Update Error:', error);
            return res.status(500).json({ error: 'Server error: ' + error.message });
        }
    }

    // ==================== DELETE SCRIPT ====================
    if (req.method === 'DELETE') {
        try {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'Script ID required' });

            const script = await getScript(id);
            if (!script) return res.status(404).json({ error: 'Script not found' });

            const deleted = await deleteScript(id);
            if (deleted) {
                return res.status(200).json({ success: true, message: 'Script deleted' });
            }
            return res.status(500).json({ error: 'Failed to delete' });
        } catch (error) {
            console.error('Delete Error:', error);
            return res.status(500).json({ error: 'Server error: ' + error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
