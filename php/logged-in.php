<?php

session_start();

if (isset($_GET['initial']) && $_GET['initial'] === "true") {
  // this is only called once because the app seeks an answer to know
  // if there's a current session
  echo json_encode(isset($_SESSION['user']) && $_SESSION['user']['active'] == true);
} else {
  // else, as usual, only print something (and interrupt execution) if the user is
  // not logged in
  // if the user is logged in nothing is printed because every file calls this one to check the session
  if (!isset($_SESSION['user']) || $_SESSION['user']['active'] == false) {
    echo json_encode(false);
    exit;
  }
}