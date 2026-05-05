<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database configuration
$db_config = [
    'host' => 'mysql.enabify.net',
    'user' => 'enabifyn_DKH9wgAJ5n',
    'pass' => '9aWTJt3ZTIMG',
    'name' => 'enabifyn_DKH9wgAJ5n'
];

try {
    $conn = new mysqli($db_config['host'], $db_config['user'], $db_config['pass'], $db_config['name']);
    
    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }
    
    // Create tables if they don't exist
    $conn->query("CREATE TABLE IF NOT EXISTS pastes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        paste_id VARCHAR(20) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        content LONGTEXT NOT NULL,
        views INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_paste_id (paste_id)
    )");
    
    $action = $_GET['action'] ?? '';
    
    switch ($action) {
        case 'getAll':
            $result = $conn->query("SELECT paste_id, title, LEFT(content, 200) as content, views, created_at FROM pastes ORDER BY created_at DESC LIMIT 50");
            $pastes = [];
            while ($row = $result->fetch_assoc()) {
                $pastes[] = $row;
            }
            echo json_encode(['success' => true, 'pastes' => $pastes]);
            break;
            
        case 'get':
            $paste_id = $conn->real_escape_string($_GET['id']);
            $result = $conn->query("SELECT * FROM pastes WHERE paste_id = '$paste_id'");
            if ($paste = $result->fetch_assoc()) {
                echo json_encode(['success' => true, 'paste' => $paste]);
            } else {
                echo json_encode(['success' => false, 'error' => 'Paste not found']);
            }
            break;
            
        case 'create':
            $data = json_decode(file_get_contents('php://input'), true);
            $title = $conn->real_escape_string($data['title']);
            $content = $conn->real_escape_string($data['content']);
            $paste_id = generatePasteId();
            
            $stmt = $conn->prepare("INSERT INTO pastes (paste_id, title, content) VALUES (?, ?, ?)");
            $stmt->bind_param("sss", $paste_id, $title, $content);
            
            if ($stmt->execute()) {
                echo json_encode(['success' => true, 'paste_id' => $paste_id]);
            } else {
                echo json_encode(['success' => false, 'error' => 'Failed to create paste']);
            }
            $stmt->close();
            break;
            
        case 'view':
            $paste_id = $conn->real_escape_string($_GET['id']);
            $conn->query("UPDATE pastes SET views = views + 1 WHERE paste_id = '$paste_id'");
            echo json_encode(['success' => true]);
            break;
            
        default:
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
    }
    
    $conn->close();
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

function generatePasteId($length = 8) {
    $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $id = '';
    for ($i = 0; $i < $length; $i++) {
        $id .= $characters[random_int(0, strlen($characters) - 1)];
    }
    return $id;
}
?>