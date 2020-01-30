<?php

require_once __DIR__ . '/logged-in.php';
require_once __DIR__ . '/database.php';

$response = false;

//Receives friend from post and requests the server to add a friend
//into the friends table.
if ($_SERVER['REQUEST_METHOD'] === "POST") {
  $friend = $_POST['friend'];
  $response = add_friend($_SESSION['user']['id'], $friend);
}
echo json_encode($response);