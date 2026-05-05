<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Error reporting for debugging (remove in production)
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't display errors, log them instead

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
    
    // Check connection
    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }
    
    // Create table if it doesn't exist
    $createTable = "CREATE TABLE IF NOT EXISTS pastes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        paste_id VARCHAR(20) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        content LONGTEXT NOT NULL,
        views INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_paste_id (paste_id)
    )";
    
    if (!$conn->query($createTable)) {
        throw new Exception("Failed to create table: " . $conn->error);
    }
    
    // Get action
    $action = isset($_GET['action']) ? $_GET['action'] : '';
    
    switch ($action) {
        case 'getAll':
            $result = $conn->query("SELECT paste_id, title, LEFT(content, 200) as content, views, created_at FROM pastes ORDER BY created_at DESC LIMIT 50");
            if ($result) {
                $pastes = [];
                while ($row = $result->fetch_assoc()) {
                    $pastes[] = $row;
                }
                $response = ['success' => true, 'pastes' => $pastes];
            } else {
                throw new Exception("Query failed: " . $conn->error);
            }
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
            
        case 'create':
            // Get JSON input
            $input = file_get_contents('php://input');
            if (empty($input)) {
                throw new Exception("No input data received");
            }
            
            $data = json_decode($input, true);
            if (!$data) {
                throw new Exception("Invalid JSON data: " . json_last_error_msg());
            }
            
            if (empty($data['title']) || empty($data['content'])) {
                throw new Exception("Title and content are required");
            }
            
            $title = $conn->real_escape_string($data['title']);
            $content = $conn->real_escape_string($data['content']);
            $paste_id = generatePasteId();
            
            $stmt = $conn->prepare("INSERT INTO pastes (paste_id, title, content) VALUES (?, ?, ?)");
            if (!$stmt) {
                throw new Exception("Prepare failed: " . $conn->error);
            }
            
            $stmt->bind_param("sss", $paste_id, $title, $content);
            
            if ($stmt->execute()) {
                $response = ['success' => true, 'paste_id' => $paste_id, 'message' => 'Paste created successfully'];
            } else {
                throw new Exception("Execute failed: " . $stmt->error);
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
            $response = ['success' => false, 'error' => 'Invalid action. Use: getAll, get, create, view'];
    }
    
    $conn->close();
    
} catch (Exception $e) {
    $response = ['success' => false, 'error' => $e->getMessage()];
}

// Return JSON response
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