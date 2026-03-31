export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'POST') {
        const { code } = req.body;
        
        // Simple Lua syntax validation
        const errors = [];
        
        // Check for common Lua issues
        if (code.includes('end') && !code.includes('function') && !code.includes('if')) {
            errors.push('Found "end" without matching function/if');
        }
        
        if ((code.match(/\(/g) || []).length !== (code.match(/\)/g) || []).length) {
            errors.push('Mismatched parentheses');
        }
        
        if (errors.length > 0) {
            res.status(200).json({ valid: false, error: errors.join(', ') });
        } else {
            res.status(200).json({ valid: true });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
