<?php

require_once __DIR__ . '/logged-in.php';
require_once __DIR__ . '/database.php';

$response = false;

//Receives a friend from post and removes him/her from 
//the current users friends list.
if ($_SERVER['REQUEST_METHOD'] === "POST") {
  $friend = $_POST['friend'];
  $response = remove_friend($_SESSION['user']['id'], $friend);
}
echo json_encode($response);