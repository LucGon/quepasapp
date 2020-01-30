<?php

require_once __DIR__ . '/logged-in.php';
require_once __DIR__ . '/database.php';

$response = false;

//Receives a user from post and inserts a new request into friend_requests.
//The sender of the request is the current user.
if ($_SERVER['REQUEST_METHOD'] === "POST") {
  $receiver = $_POST['receiver'];
  $response = request_friend($_SESSION['user']['id'], $_SESSION['user']['user'], $receiver);
}
echo json_encode($response);