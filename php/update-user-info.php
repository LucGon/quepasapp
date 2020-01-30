<?php

require_once __DIR__ . '/logged-in.php';
require_once __DIR__ . '/database.php';

$response = false;

/*
 * Puts the avatar in the correct place when an user updates the profile information
 */
function save_avatar($avatar) {
  if ($avatar['size'] > 2 * 1024 * 1024) {
    // more than 2MB
    return null;
  } else {
    // file is of acceptable size
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $type = finfo_file($finfo, $avatar['tmp_name']); // may be exif_imagetype() and IMAGETYPE_PNG, IMAGETYPE_JPEG?
    finfo_close($finfo);
    if (!in_array($type, ['image/png', 'image/jpeg', 'image/gif'])) {
      // file is not a permitted image
      return null;
    } else {
      // upload as image
      $path = '../avatars/' . $_SESSION['user']['id'] . '/';
      // create dir if it doesn't exist
      if (!is_dir($path)) {
        mkdir($path, 0777, true);
      }
      $sha1 = sha1_file($avatar['tmp_name']);
      $extension = pathinfo($avatar['name'], PATHINFO_EXTENSION);
      // this way we keep every avatar an user uploads to our server
      $path .= $sha1 . '.' . $extension;
      // move the file except if it already exists with the same name (no need to reupload)
      if (!is_file($path)) {
        $uploaded_attachment = move_uploaded_file($avatar['tmp_name'], $path);
        if (!$uploaded_attachment) {
          return null;
        }
      }
      // we return the path the file was saved to
      return $path;
    }
  }
}

if ($_SERVER['REQUEST_METHOD'] === "POST") {
  // we sanitize the uploaded info
  foreach ($_POST as $key => $value) {
    if ($value === "") {
      // if it's empty set as null so that the bindValue() sets null on the database
      $_POST[$key] = null;
    } else if ($key === 'email') {
      // if the email is updated ensure it's correctly formatted otherwise set null
      $_POST['email'] = filter_var($_POST['email'], FILTER_VALIDATE_EMAIL) ?: null;
    } else {
      // for everything else remove possible html tags
      $_POST[$key] = htmlspecialchars($value);
    }
  }
  if (isset($_FILES['avatar']) && $_FILES['avatar']['error'] === UPLOAD_ERR_OK) {
    // if a new avatar is uploaded
    $path = save_avatar($_FILES['avatar']);
    if ($path === null) {
      // something went wrong trying to update the user avatar
      echo json_encode(false);
      die();
    }
    // remove first dot from $path because images are at the same level of .js
    $_POST['avatar'] = substr($path, 1);
  } else {
    // else get the current avatar so the value is not updated on the database
    $_POST['avatar'] = $_SESSION['user']['avatar'];
  }
	$response = update_user_info($_SESSION['user']['id'], $_POST);
}

echo json_encode($response);