<?php

require_once __DIR__ . '/logged-in.php';
require_once __DIR__ . '/database.php';

$response = [];

// little to comment, I think it's clear what every branch of the ifs do based on
// the responses we send

if ($_SERVER['REQUEST_METHOD'] === "POST" && isset($_POST['user']) && isset($_POST['action'])) {
  if ($_SESSION['user']['role'] === 'admin') {
    $done_correctly = false;
    if ($_POST['action'] === "deactivate") {
      $done_correctly = admin_deactivate_account($_POST['user']);
    } else if ($_POST['action'] === "activate") {
      $done_correctly = admin_activate_account($_POST['user']);
    }
    if ($done_correctly) {
      $current_account_status = $_POST['action'] === "activate" ? true : false;
      $response['content'] = $current_account_status;
    } else {
      $response['error'] = true;
      $response['message'] = "The account status couldn't be altered";
    }
  } else {
    $response['error'] = true;
    $response['message'] = "You are not an admin";
  }
} else {
  $response['error'] = true;
  $response['message'] = "You didn't send the petition correctly";
}

echo json_encode($response);