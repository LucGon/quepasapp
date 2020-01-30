<?php

require_once __DIR__ . '/email.php';

// path to the .json that holds the database configuration
define('CONFIGURATION_JSON', __DIR__ . '/../configuration.json');

/*
 * Auxiliar function to parse the json file
 */
function connection_info_from_configuration($config) {
  $properties = json_decode(file_get_contents($config));
  if (!empty($properties)) {
    $connection = sprintf("mysql:dbname=%s;charset=utf8;host=%s", $properties->name, $properties->ip);
    return [$connection, $properties->user, $properties->password];
  } else {
    return [];
  }
}

/*
 * Auxiliar function create a new PDO from the json file
 */
function pdo_from_configuration($config) {
  $properties = connection_info_from_configuration($config);
  try {
    return new PDO($properties[0], $properties[1], $properties[2]);
  } catch (PDOException $e) {
    echo 'Database error: ' . $e->getMessage();
  }
}

/*
 * Tries to log a user in, returns false if not possible, or relevant info if the user can be logged in
 */
function login($username, $password) {
  $user = grab_user($username);
  if ($user === false || !password_verify($password, $user['password'])) {
    // wrong password
    return false;
  }
  // correct password
  return ['id' => $user['id'], 'user' => $user['user'], 'active' => $user['active'], 'role' => $user['role']];
}

/*
 * Function that tries to insert a new user in the table `users`
 * and then sends an email with the activation link so that the user
 * can activate his account when confirming the email
 */
function insert_user_send_email($username, $password, $email) {
  // this does send-email, should do one thing only, easier when we have a global PDO
  $db = pdo_from_configuration(CONFIGURATION_JSON);
  $db->beginTransaction();
  if ($email) {
    $insert = $db->prepare('INSERT INTO users (user, password, email) VALUES (:user, :password, :email)');
    $insert->bindValue(':email', $email);
  } else {
    // this is something that may be useful if we allow (again) registering without mandatory email
    $insert = $db->prepare('INSERT INTO users (user, password) VALUES (:user, :password)');
  }
  $insert->bindValue(':user', $username);
  $insert->bindValue(':password', password_hash($password, PASSWORD_DEFAULT));
  $user_inserted_correctly = $insert->execute();
  if (!$user_inserted_correctly) {
    // if the user was not inserted correctly
    $db->rollBack();
    return false;
  }
  $user_id = $db->lastInsertId();
  $get_token = $db->prepare('SELECT token FROM users_activation WHERE user = :id');
  $get_token->bindValue(':id', $user_id);
  $get_token->execute();
  if ($get_token->rowCount() !== 1) {
    // if the activation token was not recovered correctly
    $db->rollBack();
    return false;
  }
  $token = $get_token->fetch(PDO::FETCH_ASSOC)['token'];
  $message = activate_account_mail($token);
  $email_sent_correctly = send_email($email, 'QuepasApp account activation', $message);
  if (!$email_sent_correctly) {
    // if the email was not send successfuly
    $db->rollBack();
    return false;
  }
  // if everything works we commit
  return $db->commit();
}

/*
 * Function that tries to activate an account with a given token
 */
function activate_account($token) {
  $db = pdo_from_configuration(CONFIGURATION_JSON);
  $db->beginTransaction();
  $token_valid = $db->prepare('SELECT id, user FROM users_activation WHERE used = FALSE AND token = :token');
  $token_valid->bindValue(':token', $token);
  $token_valid->execute();
  $id_and_user = $token_valid->fetch(PDO::FETCH_ASSOC);
  if (!$id_and_user) {
    // if the token is invalid or used
    $db->rollBack();
    return false;
  }
  $token_id = intval($id_and_user['id']);
  $user_id = intval($id_and_user['user']);
  $user_not_active = $db->prepare('SELECT id FROM users WHERE id = :id AND active = FALSE');
  $user_not_active->bindValue(':id', $user_id);
  $user_not_active->execute();
  if ($user_not_active->rowCount() !== 1) {
    // if the user is already active
    $db->rollBack();
    return false;
  }
  $activate_user = $db->prepare('UPDATE users SET active = TRUE WHERE id = :id');
  $activate_user->bindValue(':id', $user_id);
  if (!$activate_user->execute()) {
    // if we coudln't activate the user
    $db->rollBack();
    return false;
  }
  $disable_token = $db->prepare('UPDATE users_activation SET used = TRUE WHERE id = :id');
  $disable_token->bindValue(':id', $token_id);
  if (!$disable_token->execute()) {
    // if we couldn't mark the token as used
    $db->rollBack();
    return false;
  }
  // if everything works, we commit
  return $db->commit();
}

/*
 * Gets all the info from an username, only if the user is active
 */
function grab_user($username) {
  $db = pdo_from_configuration(CONFIGURATION_JSON);
  $result = $db->prepare('SELECT * FROM users WHERE user = :user AND active = TRUE LIMIT 1');
  $result->bindValue(':user', $username);
  $result->execute();
  if ($result->rowCount() !== 1) { // may be if (!$result->execute())
    // if the user is not active or it doesn't exist
    return false;
  }
  return $result->fetch(PDO::FETCH_ASSOC);
}

/*
 * Function that sets up the database so that an user can reset the password
 * and sends an email with the reset link (which includes the token)
 */
function forgot_password_send_email($email) {
  $db = pdo_from_configuration(CONFIGURATION_JSON);
  $db->beginTransaction();
  $valid_email = $db->prepare('SELECT id FROM users WHERE email = :email AND active = TRUE LIMIT 1');
  $valid_email->bindValue(':email', $email);
  $valid_email->execute();
  if ($valid_email->rowCount() !== 1) {
    // if the email is not valid
    $db->rollBack(); // unnecessary at this point
    return false;
  }
  $user_id = $valid_email->fetch(PDO::FETCH_ASSOC)['id'];
  $forgotten = $db->prepare('INSERT INTO password_recovery (user) VALUES (:user)');
  $forgotten->bindValue(':user', $user_id);
  if (!$forgotten->execute()) {
    // if the token couldn't get generated in the database
    $db->rollBack();
    return false;
  }
  $recovery_token = $db->prepare('SELECT token FROM password_recovery WHERE id = :id');
  $recovery_token->bindValue(':id', $db->lastInsertId());
  if (!$recovery_token->execute()) {
    // if we coudln't get the generated token from the database
    $db->rollBack();
    return false;
  }
  $token = $recovery_token->fetch(PDO::FETCH_ASSOC)['token'];
  $message = forgot_password_mail($token);
  $email_sent_correctly = send_email($email, 'QuepasApp forgotten password recovery', $message);
  if (!$email_sent_correctly) {
    // if the email was not sent
    $db->rollBack();
    return false;
  }
  // if everything works, we commit
  $committed = $db->commit();
  return $committed;
}

/*
 * Checks if a reset password token is valid (exists, it's not used, and it hasn't expired)
 */
function is_valid_reset_token($token) {
  $db = pdo_from_configuration(CONFIGURATION_JSON);
  $valid_token = $db->prepare('SELECT id FROM password_recovery
                                 WHERE token = :token
                                   AND CURRENT_TIMESTAMP < expire
                                   AND used = FALSE');
  $valid_token->bindValue(':token', $token);
  $valid_token->execute();
  if ($valid_token->rowCount() !== 1) {
    return false;
  }
  return true;
}

/*
 * Resets a password given a token
 */
function reset_password($token, $password) {
  $db = pdo_from_configuration(CONFIGURATION_JSON);
  $db->beginTransaction();
  $new_pass = $db->prepare('UPDATE users
                            SET password = :password
                            WHERE id = (SELECT user FROM password_recovery WHERE token = :token)
                            LIMIT 1'); // may be here the validation too?
  $new_pass->bindValue(':password', password_hash($password, PASSWORD_DEFAULT));
  $new_pass->bindValue(':token', $token);
  $new_pass->execute();
  if ($new_pass->rowCount() !== 1) {
    // if the new pass couldn't be set
    $db->rollBack();
    return false;
  }
  $used_token = $db->prepare('UPDATE password_recovery
                              SET used = TRUE
                              WHERE token = :token');
  $used_token->bindValue(':token', $token);
  $used_token->execute();
  if ($used_token->rowCount() !== 1) {
    // if the token couldn't be marked as used
    $db->rollBack();
    return false;
  }
  // otherwise we commit
  $committed = $db->commit();
  return $committed;
}

/*
 *Checks that a user exists and returns their ID.
 */
function check_user($username) {
  $db = pdo_from_configuration(CONFIGURATION_JSON);
  $result = $db->prepare('SELECT id, user FROM users WHERE user = :user AND active = TRUE LIMIT 1');
  $result->bindValue(':user', $username);
  $result->execute();
  if ($result->rowCount() !== 1) {
    return false;
  }
  $user = $result->fetch(PDO::FETCH_ASSOC);
  return $user['id'];
}

/*
 * Inserts a new request in the friend_requests table.
 * If the request already exists it returns false.
 * If a request exists in the opposite direction it returns 2.
 */
function request_friend($sender, $sender_name, $receiver) {
  $db = pdo_from_configuration(CONFIGURATION_JSON);
  $result = $db->prepare('SELECT DISTINCT * FROM friend_requests WHERE receiver = :sender AND sender = :receiver');
  $result->bindValue(':sender', $sender);
  $result->bindValue(':receiver', $receiver);
  $result->execute();
  if ($result->rowCount() === 0) {
    $insert = $db->prepare('INSERT INTO friend_requests (sender, sender_name, receiver) VALUES (:sender, :sender_name, :receiver)');
    $insert->bindValue(':sender', $sender);
    $insert->bindValue(':sender_name', $sender_name);
    $insert->bindValue(':receiver', $receiver);
    $request_added_correctly = $insert->execute();
    if (!$request_added_correctly) {
      return false;
    }
  } else {
    return 2;
  }
  return true;
}

/*
 * Adds two users as friends into the friends table and removes the 
 * pending request from friend_requests.
 */
function add_friend($user, $friend) {
  $db = pdo_from_configuration(CONFIGURATION_JSON);
  $update = $db->prepare('UPDATE friend_requests SET active = false WHERE sender = :sender AND receiver = :receiver');
  $update->bindValue(':sender', $friend);
  $update->bindValue(':receiver', $user);
  $request_added_correctly = $update->execute();
  if (!$request_added_correctly) {
    return false;
  }
  $insert = $db->prepare('INSERT INTO friends (user, friend) VALUES (:user, :friend)');
  $insert->bindValue(':user', $user);
  $insert->bindValue(':friend', $friend);
  $friend_added_correctly = $insert->execute();
  if (!$friend_added_correctly) {
    return false;
  }
  $insert = $db->prepare('INSERT INTO friends (user, friend) VALUES (:user, :friend)');
  $insert->bindValue(':user', $friend);
  $insert->bindValue(':friend', $user);
  $friend_added_correctly = $insert->execute();
  if (!$friend_added_correctly) {
    return false;
  }
  return true;
}

/*
 * Denies/blocks a friend request depending on the value of $blocked.
 * If the request is blocked its marked as inactive.
 * If the request is denied its deleted from the friend_requests table.
 */
function deny_friend($sender, $blocked, $receiver) {
  $db = pdo_from_configuration(CONFIGURATION_JSON);
  $update;
  if ($blocked) {
    $update = $db->prepare('UPDATE friend_requests SET active = false WHERE sender = :sender AND receiver = :receiver');
    $update->bindValue(':sender', $sender);
    $update->bindValue(':receiver', $receiver);
  } else {
    $update = $db->prepare('DELETE FROM friend_requests WHERE sender = :sender AND receiver = :receiver');
    $update->bindValue(':sender', $sender);
    $update->bindValue(':receiver', $receiver);
  }
  $request_added_correctly = $update->execute();
  if (!$request_added_correctly) {
    return false;
  }
  return true;
}

/*
 * Inserts a new conversation into the conversations table with its
 * corresponding values.
 */
function insert_new_conversation($creator, $name, $private) {
  $db = pdo_from_configuration(CONFIGURATION_JSON);
  $insert = $db->prepare('INSERT INTO conversations (creator, name, private) VALUES (:creator, :name, :private)');
  $insert->bindValue(':creator', $creator);
  $insert->bindValue(':name', $name);
  $insert->bindValue(':private', $private);
  $conversation_inserted_correctly = $insert->execute();
  if (!$conversation_inserted_correctly) {
    return false;
  }
  return $db->lastInsertId();
}

/*
 * Gets the participants of a conversation.
 */
function get_participants($conversation) {
  $db = pdo_from_configuration(CONFIGURATION_JSON);
  $result = $db->prepare('SELECT user FROM users WHERE id IN (SELECT DISTINCT user FROM participants WHERE conversation = :conversation)');
  $result->bindValue(':conversation', $conversation);
  $result->execute();
  return $result->fetchAll(PDO::FETCH_ASSOC);
}

/*
 * Adds participants to a conversation.
 * If the requester of this function isn't authorized to add
 * participants to that conversation or if the conversation is private, returns false.
 */
function add_participants($requester, $participants, $conversation) {
  $db = pdo_from_configuration(CONFIGURATION_JSON);
  $result = $db->prepare('SELECT creator, private FROM conversations WHERE id = :conversation');
  $result->bindValue(':conversation', $conversation);
  $result->execute();
  $result = $result->fetch(PDO::FETCH_ASSOC);
  if ($result['creator']!=$requester || ($result['private']==1 && count(get_participants($conversation)) !== 1)) {
    return false;
  }
  for ($i = 0; $i < count($participants) - 1; $i++) {
    $value = current($participants);
    $value = check_user($value);
    $insert = $db->prepare('INSERT INTO participants (conversation, user) VALUES (:conversation, :user)');
    $insert->bindValue(':conversation', $conversation);
    $insert->bindValue(':user', $value);
    $participants_added_correctly = $insert->execute();
    if (!$participants_added_correctly) {
      return false;
    }
    next($participants);
  }
  return true;
}

/*
 * Inserts a message into the database, given the id of the sender, the conversation it belongs,
 * and the content of the message (no more than 1000 characters)
 *
 * Here we do not check if the user belongs to the conversation (it's done in send-message.php)
 * but might be useful (and cleaner)
 */
function send_message($id, $conversation, $content) {
  $db = pdo_from_configuration(CONFIGURATION_JSON);
  $result = $db->prepare('INSERT INTO messages (author, conversation, content) VALUES (:id, :conversation, :content)');
  $result->bindValue(':id', intval($id));
  $result->bindValue(':conversation', intval($conversation));
  $result->bindValue(':content', $content);
  return $result->execute();
}

/*
 * Marks all messages from a conversation as read for a certain user in the database
 */
function mark_as_read($user_id, $conversation_id) {
  $db = pdo_from_configuration(CONFIGURATION_JSON);
  $result = $db->prepare('UPDATE read_messages
                          SET read_date = CURRENT_TIMESTAMP
                          WHERE user = :user
                            AND read_date IS NULL
                            AND message IN (SELECT id FROM messages
                                            WHERE conversation = :conversation)');
  $result->bindValue(':user', intval($user_id));
  $result->bindValue(':conversation', intval($conversation_id));
  return $result->execute();
}

/*
 * Deactivates an account (no security check here, it's done in de-activate-user.php)
 */
function admin_deactivate_account($user_id) {
  $db = pdo_from_configuration(CONFIGURATION_JSON);
  $result = $db->prepare("UPDATE users SET active = FALSE WHERE id = :id AND role != 'admin'");
  $result->bindValue(':id', intval($user_id));
  return $result->execute();
}

/*
 * Activates an account (no security check here, it's done in de-activate-user.php)
 */
function admin_activate_account($user_id) {
  $db = pdo_from_configuration(CONFIGURATION_JSON);
  $result = $db->prepare("UPDATE users SET active = TRUE WHERE id = :id AND role != 'admin'");
  $result->bindValue(':id', intval($user_id));
  return $result->execute();
}

/*
 * Updates a users information with the values received from $user_info.
 */
function update_user_info($user_id, $user_info) {
  $db = pdo_from_configuration(CONFIGURATION_JSON);
  $update = $db->prepare('UPDATE users SET email = :email, about = :about, avatar = :avatar, color = :color, name = :name WHERE id = :id');
  $update->bindValue(':email', $user_info['email']);
  $update->bindValue(':about', $user_info['about']);
  $update->bindValue(':avatar', $user_info['avatar']);
  $update->bindValue(':color', $user_info['color']);
  $update->bindValue(':name', $user_info['name']);
  $update->bindValue(':id', $user_id);
  $update->execute();
  return $update->execute();
}

/*
 * Allows a user to leave a conversation.
 * If the conversation was private it removes all participants from it.
 */
function leave_conversation($user_id, $conversation) {
  $db = pdo_from_configuration(CONFIGURATION_JSON);
  $result = $db->prepare('SELECT private FROM conversations WHERE id = :conversation');
  $result->bindValue(':conversation', $conversation);
  $result->execute();
  $result = $result->fetch(PDO::FETCH_ASSOC);
  if ($result['private']==1) {
    $participants = get_participants($conversation);
    for ($i = 0; $i < count($participants); $i++) {
      $value = current($participants);
      $value = check_user($value['user']);
      $delete = $db->prepare('DELETE FROM participants WHERE conversation = :conversation AND user = :user');
      $delete->bindValue(':conversation', $conversation);
      $delete->bindValue(':user', $value);
      $participant_deleted_correctly = $delete->execute();
      if (!$participant_deleted_correctly) {
        return false;
      }
      next($participants);
    }
  } else {
    $delete = $db->prepare('DELETE FROM participants WHERE conversation = :conversation AND user = :user');
    $delete->bindValue(':conversation', $conversation);
    $delete->bindValue(':user', $user_id);
    if (!$delete->execute()) {
      return false;
    }
  }
  return true;
}

/*
 * Removes a participant from a conversation.
 * Checks if the user exists.
 * Only executes if the $requester is authorized to perform this action.
 */
function remove_participant($requester, $user, $conversation) {
  $db = pdo_from_configuration(CONFIGURATION_JSON);
  $result = $db->prepare('SELECT creator, private FROM conversations WHERE id = :conversation');
  $result->bindValue(':conversation', $conversation);
  $result->execute();
  $result = $result->fetch(PDO::FETCH_ASSOC);
  if ($result['creator']!=$requester || $result['private']==1) {
    return false;
  }
  $user_id = check_user($user);
  if (!$user_id) {
    return false;
  }
  $delete = $db->prepare('DELETE FROM participants WHERE conversation = :conversation AND user = :user');
  $delete->bindValue(':conversation', $conversation);
  $delete->bindValue(':user', $user_id);
  return $delete->execute();
}

/*
 * Deletes all table entries regarding the friendship of two users.
 */
function remove_friend($user, $friend) {
  $db = pdo_from_configuration(CONFIGURATION_JSON);
  $friend_id = check_user($friend);
  if (!$friend_id) {
    return false;
  }
  $delete = $db->prepare('DELETE FROM friends WHERE user = :user AND friend = :friend');
  $delete->bindValue(':user', $user);
  $delete->bindValue(':friend', $friend_id);
  if (!$delete->execute()) {
    return false;
  }
  $delete = $db->prepare('DELETE FROM friends WHERE user = :friend AND friend = :user');
  $delete->bindValue(':user', $user);
  $delete->bindValue(':friend', $friend_id);
  if (!$delete->execute()) {
    return false;
  }
  $delete = $db->prepare('DELETE FROM friend_requests WHERE sender = :sender AND receiver = :receiver');
  $delete->bindValue(':sender', $user);
  $delete->bindValue(':receiver', $friend_id);
  if (!$delete->execute()) {
    return false;
  }
  $delete = $db->prepare('DELETE FROM friend_requests WHERE sender = :receiver AND receiver = :sender');
  $delete->bindValue(':sender', $user);
  $delete->bindValue(':receiver', $friend_id);
  if (!$delete->execute()) {
    return false;
  }
  return true;
}