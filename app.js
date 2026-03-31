// API Base URL (change to your Vercel URL)
const API_URL = window.location.origin;

// Load scripts on homepage
if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
    loadScripts();
    
    document.getElementById('searchInput')?.addEventListener('input', filterScripts);
    document.getElementById('sortSelect')?.addEventListener('change', loadScripts);
}

// Handle script upload
if (window.location.pathname.includes('upload.html')) {
    const form = document.getElementById('uploadForm');
    const codeTextarea = document.getElementById('code');
    
    // Real-time validation
    codeTextarea?.addEventListener('input', async () => {
        const code = codeTextarea.value;
        if (code.length > 50) {
            await validateScript(code);
        }
    });
    
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const scriptData = {
            title: document.getElementById('title').value,
            description: document.getElementById('description').value,
            author: document.getElementById('author').value,
            code: document.getElementById('code').value
        };
        
        try {
            const response = await fetch(`${API_URL}/api/scripts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(scriptData)
            });
            
            if (response.ok) {
                const script = await response.json();
                alert('Script uploaded successfully!');
                window.location.href = `/script.html?id=${script.id}`;
            } else {
                const error = await response.json();
                alert('Error: ' + error.error);
            }
        } catch (error) {
            alert('Upload failed: ' + error.message);
        }
    });
}

// Load single script
if (window.location.pathname.includes('script.html')) {
    const urlParams = new URLSearchParams(window.location.search);
    const scriptId = urlParams.get('id');
    
    if (scriptId) {
        loadScript(scriptId);
    }
}

async function loadScripts() {
    const sort = document.getElementById('sortSelect')?.value || 'latest';
    
    try {
        const response = await fetch(`${API_URL}/api/scripts?sort=${sort}`);
        const scripts = await response.json();
        
        displayScripts(scripts);
    } catch (error) {
        console.error('Error loading scripts:', error);
        document.getElementById('scriptsGrid').innerHTML = 
            '<div class="loading">Error loading scripts. Please try again.</div>';
    }
}

function displayScripts(scripts) {
    const grid = document.getElementById('scriptsGrid');
    
    if (!scripts || scripts.length === 0) {
        grid.innerHTML = '<div class="loading">No scripts found.</div>';
        return;
    }
    
    grid.innerHTML = scripts.map(script => `
        <div class="script-card" data-title="${script.title.toLowerCase()}">
            <h3>${escapeHtml(script.title)}</h3>
            <div class="meta">
                By ${escapeHtml(script.author)} • ${new Date(script.createdAt).toLocaleDateString()}
                ${script.verified ? '<span class="verified"> ✓ Verified</span>' : ''}
            </div>
            <div class="description">${escapeHtml(script.description.substring(0, 150))}...</div>
            <div class="footer">
                <button onclick="likeScript('${script.id}')" class="like-btn">❤️ ${script.likes || 0}</button>
                <a href="/script.html?id=${script.id}" class="btn-primary" style="padding: 5px 15px;">View</a>
            </div>
        </div>
    `).join('');
}

function filterScripts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const cards = document.querySelectorAll('.script-card');
    
    cards.forEach(card => {
        const title = card.dataset.title;
        if (title.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

async function loadScript(id) {
    try {
        const response = await fetch(`${API_URL}/api/script?id=${id}`);
        const script = await response.json();
        
        document.title = `${script.title} - ScriptHub`;
        
        document.getElementById('scriptContent').innerHTML = `
            <div class="script-detail">
                <h1>${escapeHtml(script.title)}</h1>
                <div class="meta">
                    By ${escapeHtml(script.author)} • ${new Date(script.createdAt).toLocaleDateString()}
                    ${script.verified ? '<span class="verified"> ✓ Verified</span>' : ''}
                </div>
                <p><strong>Description:</strong> ${escapeHtml(script.description)}</p>
                <h3>Script Code:</h3>
                <pre><code id="scriptCode">${escapeHtml(script.code)}</code></pre>
                <button onclick="copyCode()" class="copy-btn">📋 Copy Code</button>
                <button onclick="likeScript('${script.id}')" class="like-btn" style="margin-left: 1rem;">❤️ ${script.likes || 0} Likes</button>
            </div>
        `;
    } catch (error) {
        document.getElementById('scriptContent').innerHTML = 
            '<div class="loading">Script not found</div>';
    }
}

async function validateScript(code) {
    try {
        const response = await fetch(`${API_URL}/api/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        
        const result = await response.json();
        const validationDiv = document.getElementById('validationResult');
        
        if (result.valid) {
            validationDiv.className = 'validation-result success';
            validationDiv.textContent = '✓ Script syntax looks valid!';
        } else {
            validationDiv.className = 'validation-result error';
            validationDiv.textContent = '⚠️ ' + result.error;
        }
    } catch (error) {
        console.error('Validation error:', error);
    }
}

async function likeScript(id) {
    try {
        const response = await fetch(`${API_URL}/api/scripts/${id}/like`, {
            method: 'POST'
        });
        
        if (response.ok) {
            location.reload();
        }
    } catch (error) {
        console.error('Error liking script:', error);
    }
}

function copyCode() {
    const code = document.getElementById('scriptCode').innerText;
    navigator.clipboard.writeText(code);
    alert('Code copied to clipboard!');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
