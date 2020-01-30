<?php

require_once __DIR__ . '/logged-in.php';
require_once __DIR__ . '/database.php';

$response = false;

//Receives the conversation name and whether or not it is private from post.
//Inserts a new conversation using this information.
//The creator is received from session.
if ($_SERVER['REQUEST_METHOD'] === "POST") {
  $creator = $_SESSION['user']['id'];
  $name = $_POST['name'];
  $private = $_POST['private'];
  $response = insert_new_conversation($creator, $name, $private);
}
echo json_encode($response);