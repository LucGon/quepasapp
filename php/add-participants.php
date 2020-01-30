<?php

require_once __DIR__ . '/logged-in.php';
require_once __DIR__ . '/database.php';

$response = false;

//Receives participant and conversation from post and requests 
//the server to add them into the participants table.
//Also receives the user from session to confirm they are allowed
//to do this.
if ($_SERVER['REQUEST_METHOD'] === "POST") {
	$response = add_participants($_SESSION['user']['id'], $_POST, $_POST['conversation']);
}

echo json_encode($response);