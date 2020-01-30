<?php

require_once __DIR__ . '/database.php';

$inserted = false;

if ($_SERVER['REQUEST_METHOD'] === "POST") {
  // ensure no html is saved in the database
  $username = trim(htmlspecialchars($_POST['user']));
  $password = $_POST['password'];
  // ensure a valid email address
  $email = filter_var($_POST['email'], FILTER_VALIDATE_EMAIL);
  // now we check
  // if we really wanted to add some limits for the password, for example
  // a line here would do it, rather than checking in the next line
  // empty($password), we could create a function and check validPassword($password)
  // to please us with any requirements we might want to add
  if (!empty($username) && !empty($password) && $email) {
    $inserted = insert_user_send_email($username, $password, $email);
  }
}

echo json_encode($inserted);