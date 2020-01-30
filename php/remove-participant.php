<?php

require_once __DIR__ . '/logged-in.php';
require_once __DIR__ . '/database.php';

$response = false;

//Receives a participant and conversation from post and removes him/her
//from it. Only executes if the current user has authorization to do this.
//Also checks that the participant isn't the current user.
if ($_SERVER['REQUEST_METHOD'] === "POST") {
	if ($_POST['participant']!=$_SESSION['user']['user']) {
		$response = remove_participant($_SESSION['user']['id'], $_POST['participant'], $_POST['conversation']);
	}
}

echo json_encode($response);