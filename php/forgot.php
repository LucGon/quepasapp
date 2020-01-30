<?php

// here we do not give the user any indication of the correctness of the process
$response = false;

if ($_SERVER['REQUEST_METHOD'] === "POST" && isset($_POST['email'])) {
  // what about putting here the requires to avoid extra work?
  require_once __DIR__ . '/database.php';

  // process the email the same way as when registering
  $email = filter_var($_POST['email'], FILTER_VALIDATE_EMAIL);
  if ($email) {
    // try to send the email, but we do not give info about the result, to avoid privacy leaks
    forgot_password_send_email($email);
  }
}

echo json_encode($response);