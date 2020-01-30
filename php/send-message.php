<?php

// in case of sending by json
// $_POST = json_decode(file_get_contents('php://input'), true);

require_once __DIR__ . '/logged-in.php';
require_once __DIR__ . '/database.php';

// tow constants to limit the image size on the client by saving the correct
// pixels on the message content
define("MAX_IMAGE_WIDTH", 480);
define("MAX_IMAGE_HEIGHT", 400);

$response = [];

/*
 * Generates the html code for inserting an image into a message
 */
function htmlImg($name, $width, $height, $path) {
  // remove first dot from $path because images are at the same level of .js
  $path = substr($path, 1);
  // if the image is bigger, calculate the correct size
  if ($width > MAX_IMAGE_WIDTH || $height > MAX_IMAGE_HEIGHT) {
    $scale = max($width / MAX_IMAGE_WIDTH, $height / MAX_IMAGE_HEIGHT);
    $width /= $scale;
    $height /= $scale;
  }
  $dimensions = 'width="' . $width . 'px" height="' . $height . 'px"';
  $html = '<div class="attachment"><span><i>Image</i></span><a href="' . $path . '" download>' .
      '<img ' . $dimensions . ' src="' . $path . '" alt="img-' . $name . '"></a></div>';
  return $html;
}

/*
 * Generates the html code for inserting an attachment file into a message
 * (or more correctly, a button to download it)
 */
function htmlAttachment($name, $path) {
  // remove first dot from $path because images are at the same level of .js
  $path = substr($path, 1);
  // this next nesting of a > button is theoretically not allowed per
  // https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-a-element
  // but it seems to work
  $html = '<div class="attachment"><span><i>Attachment</i></span><a href="' . $path . '" download>' .
    '<button type="button">' . $_FILES['attachment']['name'] . '</button></a></div>';
  return $html;
}

if ($_SERVER['REQUEST_METHOD'] == "POST") {
  // we ensure the request_method is POST
  if (isset($_FILES['attachment']) && $_FILES['attachment']['error'] === UPLOAD_ERR_OK) { // $_POST['attachment'] !== "undefined"
    // here we know a file was uploaded correctly
    if ($_FILES['attachment']['size'] > 2 * 1024 * 1024) { // more than 2MB
      $response['error'] = true;
      $response['message'] = 'The file is too big, maximum allowed 2MB';
    } else {
      // file is of acceptable size
      $sha1 = sha1_file($_FILES['attachment']['tmp_name']);
      $path = '../attachments/' . $sha1 . '/';
      // create dir if it doesn't exist
      if (!is_dir($path)) {
        mkdir($path, 0777, true);
      }
      $path .= $_FILES['attachment']['name'];
      // move the file except if it already exists with the same (no need to reupload)
      // TODO may be just rename the files with the sha1 and save the name in the database
      if (!is_file($path)) {
        $uploaded_attachment = move_uploaded_file($_FILES['attachment']['tmp_name'], $path);
        if (!$uploaded_attachment) {
          // if the file doesn't exist and we couldn't move the file to the correct folder, just stop
          $response['error'] = true;
          $response['message'] = 'The could not be attached';
          echo json_encode($response);
          exit;
        }
      }
      // get the type of the file
      $type = mime_content_type($path); // may be exif_imagetype() and IMAGETYPE_PNG, IMAGETYPE_JPEG?
      if (in_array($type, ['image/png', 'image/jpeg', 'image/gif'])) {
        // upload as image
        $size = getimagesize($path);
        $filemessage = htmlImg($_FILES['attachment']['name'], $size[0], $size[1], $path);
      } else {
        // upload as attachment
        $filemessage = htmlAttachment($_FILES['attachment']['name'], $path);
      }
    }
  }
  // here we sanitize the user written message
  $usermessage = htmlspecialchars($_POST['message']); // strip_tags();
  if (isset($filemessage)) {
    // if there's a file
    if (empty($usermessage)) {
      // if there's no user message, then the whole message is the attachment html code
      $message = $filemessage;
    } else {
      // otherwise then the message is the concatenation of the attachment plus the user Input
      $message = $filemessage . $usermessage;
    }
  } else {
    // if there's no file then the message is just the user message
    $message = $usermessage;
  }
  if (empty($message)) {
    $response['error'] = true;
    $response['message'] = 'The message cannot be empty';
  } else {
    // limit message to 1000 characters
    $message = substr($message, 0, 1000);
    // send message
    foreach ($_SESSION['conversations'] as $conversation) { // in_array($_POST['conversation'], $_SESSION['conversations']);
      // with this we ensure the conversation the message is sent to is correct for the current user
      if ($conversation['id'] === $_POST['conversation']) {
        $response['content'] = send_message($_SESSION['user']['id'], $conversation['id'], $message);
        break;
      }
    }
  }
} else {
  $response['error'] = true;
  $response['message'] = 'Need to send arguments to this file through POST method';
}

echo json_encode($response);