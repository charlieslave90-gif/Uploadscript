<?php
// Allow all origins and methods
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Enable error reporting for debugging (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Database configuration
$db_config = [
    'host' => 'mysql.enabify.net',
    'user' => 'enabifyn_DKH9wgAJ5n',
    'pass' => '9aWTJt3ZTIMG',
    'name' => 'enabifyn_DKH9wgAJ5n'
];

$response = ['success' => false, 'error' => 'Unknown error'];

try {
    // Create connection
    $conn = new mysqli($db_config['host'], $db_config['user'], $db_config['pass'], $db_config['name']);
    
    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }
    
    // Create table if not exists
    $conn->query("CREATE TABLE IF NOT EXISTS pastes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        paste_id VARCHAR(20) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        content LONGTEXT NOT NULL,
        views INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_paste_id (paste_id)
    )");
    
    $method = $_SERVER['REQUEST_METHOD'];
    $action = isset($_GET['action']) ? $_GET['action'] : '';
    
    // Handle different request methods
    if ($method === 'GET') {
        switch ($action) {
            case 'getAll':
                $result = $conn->query("SELECT paste_id, title, LEFT(content, 200) as content, views, created_at FROM pastes ORDER BY created_at DESC LIMIT 50");
                $pastes = [];
                while ($row = $result->fetch_assoc()) {
                    $pastes[] = $row;
                }
                $response = ['success' => true, 'pastes' => $pastes];
                break;
                
            case 'get':
                if (!isset($_GET['id'])) {
                    throw new Exception("Paste ID required");
                }
                $paste_id = $conn->real_escape_string($_GET['id']);
                $result = $conn->query("SELECT * FROM pastes WHERE paste_id = '$paste_id'");
                if ($result && $paste = $result->fetch_assoc()) {
                    $response = ['success' => true, 'paste' => $paste];
                } else {
                    $response = ['success' => false, 'error' => 'Paste not found'];
                }
                break;
                
            case 'view':
                if (!isset($_GET['id'])) {
                    throw new Exception("Paste ID required");
                }
                $paste_id = $conn->real_escape_string($_GET['id']);
                $conn->query("UPDATE pastes SET views = views + 1 WHERE paste_id = '$paste_id'");
                $response = ['success' => true];
                break;
                
            default:
                $response = ['success' => false, 'error' => 'Invalid action'];
        }
    } 
    elseif ($method === 'POST') {
        switch ($action) {
            case 'create':
                $input = file_get_contents('php://input');
                if (empty($input)) {
                    throw new Exception("No input data received");
                }
                
                $data = json_decode($input, true);
                if (!$data) {
                    throw new Exception("Invalid JSON data");
                }
                
                if (empty($data['title']) || empty($data['content'])) {
                    throw new Exception("Title and content are required");
                }
                
                $title = $conn->real_escape_string($data['title']);
                $content = $conn->real_escape_string($data['content']);
                $paste_id = generatePasteId();
                
                $stmt = $conn->prepare("INSERT INTO pastes (paste_id, title, content) VALUES (?, ?, ?)");
                $stmt->bind_param("sss", $paste_id, $title, $content);
                
                if ($stmt->execute()) {
                    $response = ['success' => true, 'paste_id' => $paste_id];
                } else {
                    throw new Exception("Failed to create paste");
                }
                $stmt->close();
                break;
                
            case 'view':
                if (!isset($_GET['id'])) {
                    throw new Exception("Paste ID required");
                }
                $paste_id = $conn->real_escape_string($_GET['id']);
                $conn->query("UPDATE pastes SET views = views + 1 WHERE paste_id = '$paste_id'");
                $response = ['success' => true];
                break;
                
            default:
                $response = ['success' => false, 'error' => 'Invalid action for POST'];
        }
    }
    else {
        $response = ['success' => false, 'error' => 'Method not allowed. Use GET or POST'];
    }
    
    $conn->close();
    
} catch (Exception $e) {
    $response = ['success' => false, 'error' => $e->getMessage()];
}

echo json_encode($response);
exit();

function generatePasteId($length = 8) {
    $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $id = '';
    for ($i = 0; $i < $length; $i++) {
        $id .= $characters[random_int(0, strlen($characters) - 1)];
    }
    return $id;
}
?>