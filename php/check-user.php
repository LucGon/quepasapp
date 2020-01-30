<?php

require_once __DIR__ . '/logged-in.php';
require_once __DIR__ . '/database.php';

$response = false;

//Checks that a user (received from post) exists.
if ($_SERVER['REQUEST_METHOD'] === "POST") {
	$response = check_user($_POST['user']);
}

echo json_encode($response);