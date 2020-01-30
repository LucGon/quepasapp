<?php

require_once __DIR__ . '/logged-in.php';
require_once __DIR__ . '/database.php';

$response = [];

if ($_SERVER['REQUEST_METHOD'] === "POST" && isset($_POST['conversation'])) {
  foreach ($_SESSION['conversations'] as $conversation) {
    // find the conversations the user requested to be mark as read
    // in the $_SESSION, to ensure correct conversation
    if ($_POST['conversation'] === $conversation['id']) {
      $marked_as_read = mark_as_read($_SESSION['user']['id'], $conversation['id']);
      if ($marked_as_read) {
        $response['content'] = 'Conversation messages marked as read';
      } else {
        $response['error'] = true;
        $response['message'] = "Couldn't mark as read the messages of conversation " . $_POST['conversation'];
      }
      break;
    }
  }
}

echo json_encode($response);