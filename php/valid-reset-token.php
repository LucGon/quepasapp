<?php

$correct_token = false;

if ($_SERVER['REQUEST_METHOD'] === "POST" && isset($_POST['token'])) {
  // what about putting here the requires to avoid extra work?
  require_once __DIR__ . '/database.php';

  $token = $_POST['token'];
  $correct_token = is_valid_reset_token($token);
}

echo json_encode($correct_token);