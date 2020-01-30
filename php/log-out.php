<?php

require_once __DIR__ . '/logged-in.php';

// logs out by destroying the current session

$_SESSION = [];
session_destroy();
setcookie(session_name(), false, time() - 1000);

echo json_encode(true);