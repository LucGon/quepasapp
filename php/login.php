<?php

require_once __DIR__ . '/database.php';

$response = false;

if ($_SERVER['REQUEST_METHOD'] === "POST") {
  // process the username the same way as in registering
  $username = trim(htmlspecialchars($_POST['user']));
  $password = $_POST['password'];
  $user = login($username, $password);
  if ($user) {
    // if login brings a valid result we start a session and save
    // the info of the user in the $_SESSION
    session_start();
    $_SESSION['user'] = $user;
    $response = $user;
  }
}

echo json_encode($response);