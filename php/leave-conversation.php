<?php

require_once __DIR__ . '/logged-in.php';
require_once __DIR__ . '/database.php';

$response = false;

//Receives a conversation from post and allows the current user to leave it.
if ($_SERVER['REQUEST_METHOD'] === "POST") {
	$response = leave_conversation($_SESSION['user']['id'], $_POST['conversation']);
}

echo json_encode($response);