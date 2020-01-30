<?php

require_once __DIR__ . '/logged-in.php';
require_once __DIR__ . '/database.php';

// handy function to reuse the same connection to the database for every query
function quickQuery($db, $query, $args) {
  $statement = $db->prepare($query);
  if ($statement->execute($args)) {
    return $statement->fetchAll(PDO::FETCH_ASSOC);
  }
  return false;
}

try {
  // connect with the function from database.php
  $db = pdo_from_configuration(CONFIGURATION_JSON);
} catch (PDOException $e) {
  echo json_encode([ 'error' => true, 'message' => 'Database error: ' . $e->getMessage()]);
  die();
}

$response = [];

/*
data.user.id
data.user.user
data.user.name
data.user.avatar
data.users[id].name;
data.users[id].friend;
data.conversations.list
data.conversations[id].members;
*/

// current user id which is handy
$user_id = $_SESSION['user']['id'];

// ensure correct format for the last message if it's undefined
// this will query all of the subsequent messages starting from that date
if (isset($_GET['message']) && $_GET['message'] !== "undefined") {
  $last_message = $_GET['message'];
} else {
  $last_message = '1970-01-01 00:00:00';
}

// get updated user info
$user = quickQuery($db,
  'SELECT id, user, email, name, about, color, avatar, active, role FROM users WHERE id = :id LIMIT 1',
  [':id' => $user_id])[0];

if ($_SESSION['user']['role'] === 'admin') {
  // if the user is admin, get all the data (except from the password) from all users
  $users = quickQuery($db,
    'SELECT id, user, email, name, about, color, avatar, active, role FROM users',
    []);
} else {
  // if it's not admin, just the id, user, and color (which are public for everyone)
  $users = quickQuery($db,
    'SELECT id, user, color FROM users WHERE active = TRUE',
    []);
}

// all the conversation ids where the current user is participant
$conversations = quickQuery($db,
  'SELECT * FROM conversations WHERE id IN (SELECT DISTINCT conversation FROM participants WHERE user = :id)',
  [ ':id' => $user_id ]);

// all the messages from those conversations that are posterior to the last_message date
// including info about wether they are read or not

// NOTE that this could send all the data from a conversation to a new user if it's added in the
// middle of a conversation, it's intended, if someone adds someone to a conversation the new
// participant could read the whole conversation
$messages = quickQuery($db,
  'SELECT id, date, author, conversation, content, read_date AS "read"
    FROM messages
    INNER JOIN read_messages ON messages.id = read_messages.message AND read_messages.user = :id
    WHERE date > :messagedate AND conversation IN (SELECT DISTINCT conversation from participants WHERE user = :id)',
  [':id' => $user_id, ':messagedate' => $last_message]);

// all the info of who belongs to the current user conversations
$participants = quickQuery($db,
  'SELECT * FROM participants WHERE conversation IN (SELECT DISTINCT conversation FROM participants WHERE user = :id)',
  [ ':id' => $user_id ]);

// get more info about the friends (useful if someone is not admin)
$friends = quickQuery($db,
  'SELECT id, user, email, name, about, color, avatar FROM users
    WHERE active = TRUE and id IN (SELECT DISTINCT friend AS id FROM friends WHERE user = :id)',
  [ ':id' => $user_id ]);

// get all the unanswered friend requests
$requests = quickQuery($db,
  'SELECT DISTINCT sender, sender_name AS user, receiver, active FROM friend_requests WHERE receiver = :id AND active = 1',
  [ ':id' => $user_id ]);

// create the response object with all this info
$response['user'] = $user;
// update the session user information
$_SESSION['user'] = $user;
$response['users'] = $users;
$response['conversations'] = $conversations;
// save the conversations in the session as it's handy for a few things
$_SESSION['conversations'] = $conversations;
$response['messages'] = $messages;
$response['participants'] = $participants;
$response['friends'] = $friends;
$response['requests'] = $requests;

// This next line is useful if using jQuery
// header('Content-type: application/json');
echo json_encode([ 'content' => $response ]);