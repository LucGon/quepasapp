<?php

// no check here if logged-in

$activated = false;

if (isset($_GET['token'])) {
  require_once __DIR__ . '/database.php';
  $token = $_GET['token'];
  // will return what the function returns after trying to activate the account
  $activated = activate_account($token);
}

echo json_encode($activated);
