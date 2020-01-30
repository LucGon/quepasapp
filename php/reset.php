<?php

$updated = false;

if ($_SERVER['REQUEST_METHOD'] === "POST" && isset($_POST['token']) && isset($_POST['password'])) {
  // what about putting here the requires to avoid extra work?
  require_once __DIR__ . '/database.php';

  $token = $_POST['token'];
  $password = $_POST['password'];
  // if the new password is not empty (as with register, we do not put any limitations)
  // if we wanted this would be the place
  if (!empty($password) && is_valid_reset_token($token)) {
    $updated = reset_password($token, $password);
  }
}
echo json_encode($updated);