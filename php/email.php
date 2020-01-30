<?php

// path to the email.json that holds the email configuration
define('EMAIL_JSON', __DIR__ . '/../email.json');

use PHPMailer\PHPMailer\PHPMailer;

require __DIR__ . '/../vendor/autoload.php';

/*
 * Returns a PHPMailer object from an email.json file
 */
function mail_from_configuration($config) {
  $properties = json_decode(file_get_contents($config));
  $mail = new PHPMailer();
  $mail->IsSMTP();
  $mail->SMTPDebug = 0;
  $mail->SMTPAuth = true;
  $mail->SMTPSecure = 'tls';
  $mail->Host = $properties->host;
  $mail->Port = $properties->port;
  $mail->Username = $properties->username;
  $mail->Password = $properties->password;
  $mail->SetFrom($properties->frommail, $properties->fromalias);
  $mail->AddAddress($properties->archivemail, $properties->archivemail);
  return $mail;
}

/*
 * Sends an email to an address with a subject and content
 */
function send_email($user_mail, $subject, $content) {
  $mail = mail_from_configuration(EMAIL_JSON);
  $mail->Subject = $subject;
  $mail->MsgHTML($content);
  $mail->AddAddress($user_mail, $user_mail);
  if(!$mail->Send()) {
    return $mail->ErrorInfo;
  } else {
    return true;
  }
}

/*
 * Generates the generic activate account mail with a certain token
 */
function activate_account_mail($token) {
  $url = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
  $url .= '://'.$_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI'];
  $content = 'Hi, click on this link to activate your QuepasApp\'s account: ' . substr(dirname($url), 0, -4) . '?activate=' . $token;
  return $content;
}

/*
 * Generates the generic reset password mail with a certain token
 */
function forgot_password_mail($token) {
  $url = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
  $url .= '://'.$_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI'];
  $url = substr($url, 0, -4);
  $content = 'Hi, click on this link to reset your QuepasApp\'s password: ' . substr(dirname($url), 0, -4) . '?forgot=' . $token;
  return $content;
}