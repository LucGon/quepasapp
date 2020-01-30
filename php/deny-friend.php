<?php

require_once __DIR__ . '/logged-in.php';
require_once __DIR__ . '/database.php';

$response = false;

//Receives request from post and denies/blocks their request.
if ($_SERVER['REQUEST_METHOD'] === "POST") {
  $sender = $_POST['sender'];
  $blocked = $_POST['block'];
  $response = deny_friend($sender, $blocked, $_SESSION['user']['id']);
}
echo json_encode($response);