// May be separate it into multiple files in the future
// for now only separated with comments


// so that the app loads once everything is in place on the html
window.addEventListener('load', quepasapp);

// constant that points where PHP files are stored for AJAX
const phpDirectory = "php/";
// main object that will hold all the data relevant to the user
const data = {};
// this takes care of the tokens that might be passed to the url (to activate an account or reset password)
const request = new URL(document.location).searchParams;

/*
 * Main function that loads to start the app
 * if the user is logged in, shows the conversations
 * if not, checks if a token has been passed or just shows the login page
 */
function quepasapp() {
  const main = document.getElementById("main");
  main.innerHTML = "";
  // may be run tests in the future here
  xhttp("GET", "logged-in.php", { initial: true }, (response) => {
    if (!response) {
      // if not logged in
      if (request.has("forgot")) {
        checkResetPassword(request.get("forgot"));
      } else {
        printLogin();
        if (request.has("activate")) {
          activateAccount(request.get("activate"));
          // clear the request
          request.delete("activate");
        }
      }
    } else {
      // if logged in
      printSkeleton();
      // bring all the data now
      fetchAll();
      // start the interval to bring data every second
      data.interval = setInterval(fetchAll, 1000);
    }
  });
}

// general

/*
 * Auxiliar function that converts a JS object to a GET or POST request
 * with everything encoded correctly, we use it everytime we send a request
 */
function httpQuery(args) {
  const arglist = [];
  for (const key in args) {
    arglist.push(key + "=" + encodeURIComponent(args[key]));
  }
  return arglist.join("&");
}

/*
 * Function to avoid unnecessary repetition when doing AJAX
 * the args are the method (POST or GET), the name of the PHP file,
 * an object that holds all the arguments to be send (inside it calls
 * httpQuery() to encode everything), and last, a function of what to do
 * with the already parsed JS object of the response
 *
 * This functions is handy because we avoid having to declare many things by hand
 */
function xhttp(method, url, args, func) {
  const xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      const obj = JSON.parse(this.responseText);
      // we call the function here with the already parsed response
      func(obj);
    }
  }
  const query = httpQuery(args);
  if (method === "GET") {
    xhttp.open("GET", phpDirectory + url + "?" + query, true);
    xhttp.send();
  } else if (method === "POST") {
    xhttp.open("POST", phpDirectory + url, true);
    xhttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhttp.send(query);
  }
  return false;
}

// login

/*
 * This function prints the loginpage where one can login, register,
 * or ask for a reset password token
 */
function printLogin() {
  const main = document.getElementById("main");
  main.innerHTML =
    `<div class="loginpage">
      <div class="logo">
        <div class="loader"></div>
        QuepasApp
      </div>
      <div class="login">
        <h2>Login</h2>
        <form id="login-form" onsubmit="login(); return false;">
          <table>
            <tr>
              <td><label for="user">Username</label></td>
              <td><input type="text" name="user" required></td>
            </tr>
            <tr>
              <td><label for="password">Password</label></td>
              <td><input type="password" name="password" required></td>
            </tr>
          </table>
          <input type="submit" name="submit" value="Login">
        </form>
      </div>

      <form id="forgot-password" onsubmit="recoverPassword(); return false;">
        <p>
          <a href="#" onclick="showPasswordRecovery()">Forgot your password?</a>
          <span class="hidden">
            <label for="recover-email">Email</label>
            <input type="email" name="recover-email" required>
            <input type="submit" value="Recover password">
          </span>
        </p>
      </form>

      <div class="register">
        <h2>Register</h2>
        <form id="register-form" onsubmit="register(); return false;">
          <table>
            <tr>
              <td><label for="user">Username</label></td>
              <td><input type="text" name="user" required></td>
            </tr>
            <tr>
              <td><label for="password">Password</label></td>
              <td><input type="password" name="password" required></td>
            </tr>
            <tr>
              <td><label for="email">Email</label></td>
              <td><input type="email" name="email" required></td>
            </tr>
          </table>
          <input type="submit" name="submit" value="Create account">
        </form>
      </div>
    </div>`;
}

/*
 * It's called when the user clicks on the login button, sends the
 * username and password to the server to try to log in. If it's successful
 * it logs the user in and shows the conversations and main panel
 */
function login() {
  const main = document.getElementById("main");
  const user = document.getElementsByName("user").item(0).value.trim();
  const password = document.getElementsByName("password").item(0).value;
  xhttp("POST", "login.php", { user: user, password: password }, (response) => {
    if (!response) {
        // server gave a negative answer
        // could be bad username, bad password, or that the account is not active yet
        // or any combinations of those
        // we do not give any indication to the user to not leak information
        alert("User and password do not match for any active user");
      } else {
        // if the response is successful
        // TODO may here we could just call quepasapp() in the future

        // clear the requests (may be activate or reset tokens are stored there)
        request.forEach((param) => request.delete(param));

        // same as in quepasapp(), we print everything and start fetching data
        printSkeleton();
        fetchAll();
        data.interval = setInterval(fetchAll, 1000);
      }
  });
}

/*
 * It's called when the user clicks on the register button, sends the
 * username, password, and mail to the server to try to register.
 * shows the result to the user by adding the messages below the register form
 */
function register() {
  const registerForm = document.getElementById("register-form");
  const user = registerForm.querySelector("[name=user]").value.trim();
  const password = registerForm.querySelector("[name=password]").value;
  // for now, no limits to passwords
  const email = registerForm.querySelector("[name=email]").value;
  // next line is not enough but ideally should be
  const validEmail = registerForm.querySelector("[name=email]").validity.valid;
  // handmade alternative
  // <input type="text" pattern="[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*" required>
  if (user === "" || password === "" || !validEmail) {
    alert("The register form is not correctly filled.");
    return false;
  }
  const loginpage = document.getElementById("main").querySelector("div.loginpage");
  loginpage.innerHTML += "<p>Trying to register at QuepasApp</p>";
  xhttp("POST", "register.php", { user: user, password: password, email: email }, (response) => {
    if (!response) {
      loginpage.innerHTML += '<p class="error">There was a problem and we couldn\'t register you</p>';
    } else {
      loginpage.innerHTML += '<p class="correct">An email was sent, check your email ' + email + '</p>';
    }
  });
}

/*
 * When the url has an activate token sends the token to the server
 * to try activate the account
 */
function activateAccount(token) {
  xhttp("GET", "activate.php", { token: token }, (response) => {
    if (!response) {
      // the token is invalid or already used
      alert("That token did not activate any account");
    } else {
      // in this case the token was valid and the linked account has been activated
      const loginpage = document.getElementById("main").querySelector("div.loginpage");
      loginpage.innerHTML += '<p class="correct">Your account has been activated</p>';
    }
  });
}

/*
 * When the user logs out, or the user is deactivated from the server,
 * this function is called, the user is logged out, all the data cleared,
 * and the user is redirected to the login page
 */
function logout() {
  xhttp("GET", "log-out.php", {}, (response) => {
    // stop asking for more data every second
    clearInterval(data.interval);
    // restore the window title
    document.title = "QuepasApp";
    // clear all the data
    for (const member in data) delete data[member];
    // start again from the beginning
    quepasapp();
  });
}

/*
 * Toggles the visibility of the recover password input text
 */
function showPasswordRecovery() {
  const form = document.getElementById("forgot-password");
  form.querySelector("span").classList.toggle("hidden");
}

/*
 * Asks the server to send a reset password mail to the inserted email
 * we do not give any info to the user wether it's successful or not,
 * since anyone could try to introduce an email there that doesn't belong to him
 */
function recoverPassword() {
  const email = document.getElementsByName("recover-email").item(0);
  xhttp("POST", "forgot.php", { email: email.value }, (response) => {
    // do nothing if it works or if it fails
  });
  const loginpage = document.getElementById("main").querySelector("div.loginpage");
  loginpage.innerHTML += '<p class="warn">If the email is in our database, an email will be sent shortly to recover your account</p>';
  return false;
}

/*
 * If the url has a reset password token, checks wether the token is valid or not
 * if it is, the reset password page is shown, otherwise a message is shown saying it's not valid
 */
function checkResetPassword(token) {
  xhttp("POST", "valid-reset-token.php", { token: token }, (response) => {
    // clear the request
    request.delete("forgot");
    if (!response) {
      // if the token is not valid
      alert("That token is invalid. If you need to reset your password, please insert your mail again for recovery");
      // start again
      quepasapp();
    } else {
      // if the token is valid
      printResetPassword(token);
    }
  });
}

/*
 * Shows the reset password page
 */
function printResetPassword(token) {
  const main = document.getElementById("main");
  main.innerHTML = `<div class="resetpage">
    <div class="reset">
      <h2>Reset password</h2>
      <form id="reset">
        <label for="reset-password">New password</label>
        <input type="password" name="reset-password" required>
        <br>
        <input type="submit" value="Reset password">
      </form>
    </div>
  </div>`;
  // when the user submits the form we call the function resetPassword()
   document.getElementById("reset").addEventListener('submit', function(e) {
     e.preventDefault();
     resetPassword(token);
   })
}

/*
 * Function is called when an user tries to update a password
 * sends a request to the server to update the user password
 * shows a message depending on wether it's successful or not
 * and redirects to the login page anyways
 */
function resetPassword(token) {
  const password = document.getElementsByName("reset-password").item(0).value;
  if (password === "") {
    alert("The new password is empty");
    return;
  }
  xhttp("POST", "reset.php", { token: token, password: password }, (response) => {
    if (!response) {
      alert("The password couldn't be updated");
    } else {
      alert("The new password was correctly set");
    }
    quepasapp();
  });
}

// get data

/*
 * Asks the server to send the data. Sends a parameter "message" which can be
 * undefined or the date of the last message received, to get only newer messages.
 * If the server answers false
 * logs out, if there's an error, shows the error on the console,
 * and if everything goes allright, calls the organize() function
 * with the received data, and then update.
 *
 * Has an optional parameter (action) that's a function to be executed after the
 * response has come back from the server
 */
function fetchAll(action) {
  xhttp("GET", "data.php", { message: data.lastMessage }, (response) => {
    if (response === false) {
      logout();
    } else if (response.error) {
      console.log(response.message);
      // alert(response.message);
    } else {
      organize(response.content);
      update();
      if (action) {
        action();
      }
      // updateAccordingly();
    }
  });
}

/*
 * Organizes the received data from the server into something useful for the client
 * under the data object (more info about its structure in the documentation)
 */
function organize(incoming) {
  // TODO may be more arrays to be able to use .map .filter rather than objects?
  // updates user info
  data.user = incoming.user;
  const last = incoming.messages.slice(-1).pop();
  if (last) {
    // updates last message date for the next fetch to the server
    data.lastMessage = last.date;
  }
  if (data.users === undefined) {
    data.users = {};
  }
  // stores the user info under data.users
  for (const info of incoming.users) {
    data.users[info.id] = info;
  }
  if (data.conversations === undefined) {
    data.conversations = {};
  }
  // adds extra info about friends to that data.users
  for (const info of incoming.friends) {
    data.users[info.id] = Object.assign(data.users[info.id], info);
    data.users[info.id].friend = true;
  }
  if (data.requests === undefined || data.requests.length !== incoming.requests.length) {
    data.requests = {};
  }
  // stores new friend requests under data.requests
  for (const info of incoming.requests) {
    data.requests[info.sender] = info;
  }
  // for every conversation we store its info
  for (const info of incoming.conversations) {
    data.conversations[info.id] = Object.assign(data.conversations[info.id] || {}, info);
    // create .messages only once
    if (data.conversations[info.id].messages === undefined) {
      data.conversations[info.id].messages = {};
    }
    // override participants every time in case there's an addition or removal
    data.conversations[info.id].participants = [];
  }
  // save every message under its corresponding conversation
  for (const info of incoming.messages) {
    data.conversations[info.conversation].messages[info.id] = info;
  }
  // add participants to the participant ids array from the corresponding conversation
  for (const participant of incoming.participants) {
    data.conversations[participant.conversation].participants.push(participant.user);
  }
}

/*
 * Once all the data is correctly stored under the data object structure, we update what's needed
 * for the user.
 *
 * Important bits are:
 *
 * - The conversation list is repainted
 * - If we are on the friends page we update the possible new friend requests and friend list
 * - If we are creating a conversation we update the friends that can be added clicking
 * - If we are in a conversation and the conversation has new messages we show them
 *   - If before showing them the user was at the bottom and looking at the page, we mark the conversation as read
 */
function update() {
  // we print the name on the left
  document.body.querySelector(".configurations span").innerHTML = "Welcome, " + data.user.user;
  if (data.user.role === "admin") {
    // if the user is admin, we print the Admin zone button
     const adminDiv = document.body.querySelector(".admin-zone");
     if (adminDiv.innerHTML == "") {
      adminDiv.innerHTML += '<input name="admin-zone" type="button" value="Admin zone" onclick="adminZone();">';
    }
  }
  // we repaint the conversation list
  printConversations();
  const right = document.getElementById("right");
  const friends = right.querySelector("section #friends-list");
  const requests = right.querySelector("section #friend-requests");
  const conversationFriends = right.querySelector("section #addable-friends");
  const messages = right.querySelector("section.messages");
  if (friends) {
  // if on friends page
    const currentFriends = Object.values(data.users).filter(u => u.friend);
    const currentRequests = Object.values(data.requests);
    if ((requests.children.length != currentRequests.length) 
      || (friends.children.length != currentFriends.length)) {
      appendFriendsList(friends);
      appendFriendRequests(requests);
    }
  } else if (conversationFriends) {
    // if creating a conversation
    const currentFriends = Object.values(data.users).filter(u => u.friend);
    if (conversationFriends.children.length != currentFriends.length) { 
      appendFriendsList(conversationFriends, true);
    }
  } else if (messages) {
    // if currently on a conversation

    const conversation = data.conversations[right.num]
    const participantsDiv = document.querySelector(".current-conversation-participants");
    const participants = conversationParticipants(conversation);
    // if participants has changed update its value
    if (participantsDiv.innerHTML !== participants) {
      participantsDiv.innerHTML = participants;
    }

    const atTheBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight < 1;
    const convermessages = Object.values(data.conversations[right.num].messages);
    if (messages.children.length != convermessages.length) {
      // if there're new messages on the conversation
      messages.innerHTML = "";
      for (const msg of convermessages) {
        messages.appendChild(msgDiv(msg));
      }
      if (atTheBottom && !document.hidden) {
        // if the user was at the bottom and the page was open (e.g., it was not a tab in the background)
        // we keep the user scrolled to the bottom
        messages.scrollTop = messages.scrollHeight;
        // and mark the conversation as read
        markConversationAsRead(right.num);
      }
    }
  }
}

/*
 * Paint the conversation list sorted by last message date (or creation date if no messages).
 * And update the window title accordingly
 * For each conversation:
 * Print the correct image or color
 * If there are unread messages in the conversation a red bubble is shown.
 * If there are messages in the conversation the last message date and
 * beginning of the message is shown
 */
function printConversations() {
  const conversdiv = document.getElementById("conversations");
  conversdiv.innerHTML = "";
  // total number of unread messages to update window title
  let totalUnread = 0;
  // array we are going to store the conversations to sort them before putting them in the DOM
  const arrayDivs = [];
  // for each conversation stored under data.conversations
  for (const conversation of Object.values(data.conversations)) {
    // TODO if div exists: substitute values with querySelector
    // otherwise create div first and then still do everything with query selector
    // after or before updating, sort by date
    const div = document.createElement('div');
    div.classList.add("conversation");
    div.id = "conversation-" + conversation.id;
    div.num = conversation.id;
    const img = conversationImg(conversation, "conversation-img");
    // print the image
    div.appendChild(img);
    const info = document.createElement('div');
    info.classList.add("conversation-info");
    const messages = Object.values(conversation.messages);
    const lastMessage = messages.slice(-1).pop();
    if (lastMessage) {
      // if there's at least one message, we print the last message date
      info.innerHTML += `<div class="conversation-last-time" title="${lastMessage.date}">${formatDatetime(lastMessage.date)}`;
    }
    // save here the last relevant date for sorting before printing
    div.last = lastMessage && lastMessage.date || conversation.creation_date;
    const unread = messages.filter(m => m.read === null && m.author !== data.user.id).length;
    totalUnread += unread;
    if (unread) {
      // if there are unread messages we add the info
      info.innerHTML += '<div class="unread">' + unread + '</div>';
    }
    // the name of the conversation
    info.innerHTML += `<div class="conversation-name">${conversationName(conversation)}</div>`;
    if (lastMessage) {
      // if there's last message we print it (the css takes care of showing just the beginning)
      info.innerHTML += `<div class="conversation-last-message">${lastMessage.content}</div>`;
    }
    div.appendChild(info);
    // add a function to open the conversation when the user clicks on it
    div.addEventListener('click', function(){
      printConversation(this);
    });

    // add the div to the array for sorting
    arrayDivs.push(div);
  }
  // update window title according to the total number of unread messages
  if (totalUnread) {
    document.title = "QuepasApp (" + totalUnread + ")";
  } else if (!document.hidden) {
    document.title = "QuepasApp";
  }
  // order the divs by date from most recent to least
  arrayDivs.sort((a, b) => 
    b.last.localeCompare(a.last));
  // and then add them to the DOM
  arrayDivs.forEach((e) => conversdiv.appendChild(e));
}

/*
 * Sends a request to the server to mark a conversation as read (that is
 * mark all unread messages as read).
 * If the answer is correct (messages have been marked as read on the server)
 * we mark them as read under data.conversation[id].messages
 *
 * This is needed because we do not bring info from the server from "older" messages
 */
function markConversationAsRead(conversationId) {
  xhttp("POST", "read-messages.php", { conversation: conversationId }, (response) => {
    // if there's no error marking messages as read in the database, mark as read locally
    // since we no longer bring back all the info from messages that are already here
    if (!response.error) {
      for (const message in data.conversations[conversationId].messages) {
        data.conversations[conversationId].messages[message].read = true;
      }
    }
  });
}

/*
 * Returns the appropiate name for a given conversation
 * if it has a name, then returns the name
 * if you are the sole participant, then it gives "Me"
 * if there are other participants it shows the list of other participants
 *   usernames separated by commas
 */
function conversationName(conversation) {
  if (conversation.name) {
    return conversation.name;
  }
  if (conversation.participants.length === 1) {
    return "Me";
  }
  const otherParticipants =
    conversation.participants
      .filter(id => id !== data.user.id) // remove youreslf
      .map(id => data.users[id].user); // convert ids to usernames
  return otherParticipants.join(", "); // return usernames separated by comas
}

/*
 * Returns the appropiate image for a conversation
 * if the conversation has more than two participants shows a "group logo"
 * if it has only two shows the _other participant_ image
 * if it's only you, then shows _your_ image
 *
 * now if you or the other user have an avatar (AND is your friend) then it shows an avatar
 * otherwise it shows the color (which is public and not limited to friends)
 */
function conversationImg(conversation, className) {
  const img = document.createElement('div');
  img.className = className;
  if (conversation.participants.length > 2) {
    img.innerHTML = `<svg viewBox="0 0 16 16" version="1.1" width="24" height="24"><path fill="#fff" fill-rule="evenodd" d="M16 12.999c0 .439-.45 1-1 1H7.995c-.539 0-.994-.447-.995-.999H1c-.54 0-1-.561-1-1 0-2.634 3-4 3-4s.229-.409 0-1c-.841-.621-1.058-.59-1-3 .058-2.419 1.367-3 2.5-3s2.442.58 2.5 3c.058 2.41-.159 2.379-1 3-.229.59 0 1 0 1s1.549.711 2.42 2.088C9.196 9.369 10 8.999 10 8.999s.229-.409 0-1c-.841-.62-1.058-.59-1-3 .058-2.419 1.367-3 2.5-3s2.437.581 2.495 3c.059 2.41-.158 2.38-1 3-.229.59 0 1 0 1s3.005 1.366 3.005 4z"></path></svg>`;
  } else if (conversation.participants.length === 1) {
    if (data.user.avatar) {
      img.style.backgroundImage = `url(${data.user.avatar})`;
    } else {
      img.style.backgroundColor = data.user.color;
    }
  } else if (conversation.participants.length === 2) {
    const otherUser = data.users[conversation.participants.find(p => p !== data.user.id)];
    if (otherUser.avatar) {
      img.style.backgroundImage = `url(${otherUser.avatar})`;
    } else {
      img.style.backgroundColor = otherUser.color;
    }
  }
  return img;
}

/*
 * Returns the participant string from a conversations.
 * If the conversation is _private_ then no need to show the participants,
 *   but rather an appropiate info to show that the conversation is indeed private
 * If the conversation is _not private_ returns the list of participants separated by commas
 */
function conversationParticipants(conversation) {
  if (conversation.private == true) {
    return `<svg height="16" width="12" viewBox="0 0 12 16" version="1.1"><path fill-rule="evenodd" fill="#a3aab1" d="M4 13H3v-1h1v1zm8-6v7c0 .55-.45 1-1 1H1c-.55 0-1-.45-1-1V7c0-.55.45-1 1-1h1V4c0-2.2 1.8-4 4-4s4 1.8 4 4v2h1c.55 0 1 .45 1 1zM3.8 6h4.41V4c0-1.22-.98-2.2-2.2-2.2-1.22 0-2.2.98-2.2 2.2v2H3.8zM11 7H2v7h9V7zM4 8H3v1h1V8zm0 2H3v1h1v-1z"></path></svg>
    <em>Private conversation</em>`;
  }
  return conversation.participants.map(id => data.users[id].user).join(", ");
}

// chat

/*
 * Prints the skeleton of the main page for a logged user
 * with the left side and the right side
 */
function printSkeleton() {
  const main = document.getElementById("main");
  main.innerHTML = "";
  const left = printLeftSide();
  left.id = "left";
  const right = document.createElement('section');
  right.id = "right";
  main.appendChild(left);
  main.appendChild(right);
}

/*
 * Prints the left side which includes the left header
 * where all the buttons of different sectinos are
 * and the div that will contain all the conversations
 */
function printLeftSide() {
  const left = document.createElement('section');
  const header = printLeftHeader();
  const conversations = document.createElement('section');
  conversations.id = "conversations";
  conversations.classList.add("conversations");
  left.appendChild(header);
  left.appendChild(conversations);
  return left;
}

/*
 * Prints the left header with the logo and all its useful buttons to the user
 * like
 *
 * - A placeholder for the username (the <span>)
 * - Logout
 * - Profile
 * - Create conversation
 * - Friends list
 * - A placeholder for the Admin zone (will be shown only if the user is admin)
 */
function printLeftHeader() {
  const header = document.createElement('header');
  header.innerHTML =
    `<div class="logo">
      <div class="loader"></div>
      QuepasApp
    </div>
    <div class="configurations">
      <span></span> <input type="button" value="Logout" onclick="logout();">
    </div>
    <div class="profile">
      <input type="button" value="My Profile" onclick="openProfile(data.user);">
    </div>
    <div class="add-conversation">
      <input type="button" value="Start Conversation" onclick="startConversation();">
    </div>
    <div class="friends-list">
      <input type="button" value="Friends List" onclick="openFriendsList();">
    </div>`;
  header.innerHTML +=
    `<div class="admin-zone"></div>`;
  return header;
}

/*
 * Prints the admin zone. It shows a list of users on green if they are active
 * and gray if they are inactive. And the user can click on the name to (de)activate them
 */
function adminZone() {
  const right = document.getElementById("right");
  right.innerHTML = '<header><h2>Admin zone</h2></header>';
  const section = document.createElement('section');
  section.innerHTML =
    `<p>You can activate or deactivate accounts by clicking someone's username</p>
    <h3>Account status</h3>
    <div id="bannable-users"></div>`;
  right.appendChild(section);
  const bannable = document.getElementById("bannable-users");
  bannable.innerHTML = "";
  Object.values(data.users) // take all the users
    .filter(user => user.id !== data.user.id && user.role !== "admin") // filter yourself and other admins
    .forEach((user) => { // for each of the rest
      const span = document.createElement('span');
      span.innerHTML = user.user;
      span.id = "user-" + user.id;
      span.userId = user.id;
      // print them with the appropiate class depending on their status
      span.className = user.active == true ? "active" : "inactive";
      // the border of each span is the color of the user, to give a hint to the admin
      span.style.borderColor = user.color;
      // add a listener when the admin clicks on the user
      span.addEventListener('click', toggleUserActive);
      bannable.appendChild(span);
    });
}

/*
 * Sends a request to the server to (de)activate the user depending on the current status,
 * if the answer is correct change the user button to the appropiate style
 */
function toggleUserActive() {
  const id = this.userId;
  // what are we going to do to the user, depending on the class of the clicked button
  const action = data.users[id].active == true ? "deactivate" : "activate";
  const currentClass = this.className;
  // temporarily change the class (sometimes it's not visible because of the speed)
  this.classList.add("changing");
  // we use here fetch() a modern way of doing AJAX from JS
  fetch(phpDirectory + "de-activate-user.php", {
    method: "POST",
    body: httpQuery({ user: id, action: action }),
    headers: { 'Content-type': 'application/x-www-form-urlencoded', 'charset': 'utf-8' },
  })
    .then((response) => response.json())
    .then((response) => {
      if (response.error) {
        // if soomething went wrong
        console.log(response.message);
        // put the button in its original style
        this.className = currentClass;
      } else if (response.content === true) {
        // if the user has been activated put the button "active"
        this.className = "active";
      } else if (response.content === false) {
        // if the user has been deactivated put the button "inactive"
        this.className = "inactive";
      }
    });
}

/*
 * Prints a conversation.
 * If the same conversation is already open in the right side, this just
 * updates the header and the messages, keeping the footer (where the
 * user writes the message) intact. If the page opened in the right is anything else
 * this prints the whole conversation.
 *
 * Shows a bit different style if the conversation is private or if the user is the creator
 * of the conversation (which grants the user some powers) by showing more or less buttons
 *
 * After putting everything on the page, mark the conversation as read.
 */
function printConversation(conver) {
  const right = document.getElementById("right");
  const sameConversationOpen = right.num === conver.num && right.querySelector("section.messages");
  if (!sameConversationOpen) {
    // if it's not the same conversation we do not need to be careful to not override the footer,
    // cllean it all
    right.innerHTML = "";
  }
  const header = right.querySelector("header") || document.createElement('header');
  header.innerHTML = "";
  // the header holds all the info about the conversation and the buttons to administrate it
  const conversation = data.conversations[conver.num];
  const participants = conversationParticipants(conversation);
  const name = conversationName(conversation);
  const img = conversationImg(conversation, "current-conversation-img");
  header.appendChild(img);
  header.innerHTML +=
    `<div class="current-conversation-info">
      <div class="current-conversation-name">${name}</div>
      <div class="current-conversation-participants">${participants}</div>
    </div>`;
  // if the user is the creator of the conversation AND the conversation is not private
  if (conversation.creator == data.user.id && conversation.private!=1) {
    // we show the options to add or remove participants or leave teh conversation
    header.innerHTML += `
    <div class="buttons">
      <input type="button" class="add" value="Add Participant" onclick="addSingleParticipant();">
      <input type="button" class="remove" value="Remove Participant" onclick="removeParticipant();">
      <input type="button" class="exit" value="Leave Conversation" onclick="leaveConversation();">
    </div>`;
  } else {
    // if the conversation is private there's no possibility of adding or removing users
    // and if you are not the creator you don't have any power either, just the possibility to leave
    header.innerHTML += `
    <div class="buttons">
      <input type="button" class="exit" value="Leave Conversation" onclick="leaveConversation();">
    </div>`;
  }
  if (!sameConversationOpen) {
    right.appendChild(header);
  }
  // here we repaint the message section
  const section = document.createElement('section') || right.querySelector("section");
  section.innerHTML = "";
  section.classList.add("messages");
  // ensure only one listener is added to mark the conversation as read once the user reach the bottom of it
  section.onscroll = function() {
    const atTheBottom = this.scrollHeight - this.scrollTop - this.clientHeight < 1;
    if (atTheBottom) {
      // mark as read conversation here
      markConversationAsRead(right.num);
    }
  };
  for (const msg of Object.values(data.conversations[conver.num].messages)) {
    section.appendChild(msgDiv(msg));
  }
  if (!sameConversationOpen) {
    right.appendChild(section);
  }
  if (!sameConversationOpen) {
    // if it's a different conversation we repaint the footer too
    // this has the input text, the button to attach images or files, and the send button
    const footer = document.createElement('footer');
    footer.innerHTML += 
      `<form autocomplete="off" id="send-message">
        <input class="pill" type="text" name="inputmessage" placeholder="Write here your message…">
        <label for="attachment">
          <svg id="clip" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
            <path fill="#FFF" fill-opacity="1" d="M1.816 15.556v.002c0 1.502.584 2.912 1.646 3.972s2.472 1.647 3.974 1.647a5.58 5.58 0 0 0 3.972-1.645l9.547-9.548c.769-.768 1.147-1.767 1.058-2.817-.079-.968-.548-1.927-1.319-2.698-1.594-1.592-4.068-1.711-5.517-.262l-7.916 7.915c-.881.881-.792 2.25.214 3.261.959.958 2.423 1.053 3.263.215l5.511-5.512c.28-.28.267-.722.053-.936l-.244-.244c-.191-.191-.567-.349-.957.04l-5.506 5.506c-.18.18-.635.127-.976-.214-.098-.097-.576-.613-.213-.973l7.915-7.917c.818-.817 2.267-.699 3.23.262.5.501.802 1.1.849 1.685.051.573-.156 1.111-.589 1.543l-9.547 9.549a3.97 3.97 0 0 1-2.829 1.171 3.975 3.975 0 0 1-2.83-1.173 3.973 3.973 0 0 1-1.172-2.828c0-1.071.415-2.076 1.172-2.83l7.209-7.211c.157-.157.264-.579.028-.814L11.5 4.36a.572.572 0 0 0-.834.018l-7.205 7.207a5.577 5.577 0 0 0-1.645 3.971z"></path>
          </svg>
        </label>
        <input type="file" name="attachment" id="attachment">
        <button type="submit">
          <svg id="plane" xmlns="http://www.w3.org/2000/svg" viewBox="0 -1 28 23" width="24" height="21">
            <path fill="#FFF" d="M5.101 21.757L27.8 12.028 5.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"></path>
          </svg>
        </button>
      </form>`;
    right.appendChild(footer);
    document.getElementById("attachment").addEventListener('change', somethingAttached);
    document.getElementById("send-message").addEventListener('submit', sendMessage);
  }
  section.scrollTop = section.scrollHeight;
  // we ensure the right side has a propriety marked that shows that the current conversation is _this_ one
  right.num = conver.num;
  // and mark the conversation as read since we just opened it
  markConversationAsRead(conver.num);
}

/*
 * Leaves the selected conversation.
 * Opens a dialog box confirming the decision.
 *
 * Sends a request to the server to remove the users entry 
 * in participants for that conversation.
 * After leaving the conversation it is deleted from the menu and 
 * the user is returned to the main menu.
 */
function leaveConversation() {
  var confirm = window.confirm("Are you sure you want to leave this conversation?");
  if (confirm) {
    xhttp("POST", "leave-conversation.php", {conversation: right.num}, (response) => {
    if (!response) {
      alert("There's a problem leaving this conversation.");
    } else {
      alert("You have left this conversation.");
      //Removes the entry from data.
      delete data.conversations[right.num];
      document.getElementById("right").innerHTML = "";
    }
  });
  } 
}

/*
 * Adds a participant to an already existing conversation
 * Opens a dialog box requesting the user to be added.
 *
 * Sends a request to the server to add an entry 
 * in participants for that conversation with the selected user.
 * 
 * If the insertion is successful the conversation is reprinted.
 */
function addSingleParticipant() {
  const right = document.getElementById("right");
  var participant = prompt("Write the name of the new participant");
  if (participant==null) {
    return;
  }
  xhttp("POST", "add-participants.php", {participant: participant, conversation: right.num}, (response) => {
    if (!response) {
      alert("There's a problem adding this participant.");
    } else {
      alert("Participant added!");
      fetchAll(() => {
        printConversation(document.getElementById(`conversation-${right.num}`));
      });
    }
  });
}

/*
 * Removes a participant from a conversation
 * Opens a dialog box requesting the name of the user you wish to remove.
 *
 * Sends a request to the server to remove the entry 
 * in the participants table containing that user/conversation.
 *
 * After removing the participant the conversation is reprinted.
 */
function removeParticipant() {
  const right = document.getElementById("right");
  var participant = prompt("Write the name of the participant you wish to delete");
  if (participant==null) {
    return;
  }
  xhttp("POST", "remove-participant.php", {participant: participant, conversation: right.num}, (response) => {
    if (!response) {
      alert("There's a problem removing this participant.");
    } else {
      alert("Participant removed!");
      fetchAll(() => {
        printConversation(document.getElementById(`conversation-${right.num}`));
      });
    }
  });
}

/*
 * This only takes care of changing the style of the attach button to show
 * an indicator that something is attached (green)
 */
function somethingAttached(e) {
  e.preventDefault();
  const isThereFile = document.querySelector("[name=attachment]").files.length > 0;
  this.parentNode.querySelector("label").classList.toggle("file-loaded", isThereFile);
}

/*
 * This creates a div with the structure to print a message
 * if the message is own adds the "own" class otherwise the "external"
 * if the user has a name (which could have but we don't know in case it's not a friend),
 * then we show the name.
 *
 * Because of how data is stored on the server, this already takes care of printing
 * attached files or images in the messages, it's all in the message content.
 */
function msgDiv(msg) {
  const div = document.createElement('div');
  div.classList.add("message", msg.author == data.user.id ? "own" : "external");
  const author = document.createElement('span');
  author.innerHTML = data.users[msg.author].user;
  author.className = "author";
  author.style.color = data.users[msg.author].color;
  div.appendChild(author);
  if (data.users[msg.author].name) {
    div.innerHTML += `<span class="name">~${data.users[msg.author].name}</span>`;
  }
  div.innerHTML += `<div class="content">${msg.content}</div>
    <span class="date" title="${msg.date}">${formatDatetime(msg.date)}</span>`;
  return div;
}

/*
 * Shows the date or time of a timestamp (useful for date of messages)
 * if the message is from today the time is shown
 * if the message is from other day then only the date is shown
 */
function formatDatetime(datetime) {
  const [date, time] = datetime.split(" ");
  return new Date().toLocaleDateString() === new Date(date).toLocaleDateString() ? time.substring(0, 5) : date;
}

/*
 * Takes care of sending a message.
 * A few checks are done in the client to avoid sending wrong requests
 * (but ultimately everything is checked on the server)
 * If there is a file attached the file is sent to the server too,
 * otherwise just the message would be sent
 */
function sendMessage(event) {
  event.preventDefault();
  const conver = document.getElementById("right").num;
  const msg = document.getElementsByName("inputmessage").item(0);

  // using FormData to send files to a server
  const formData = new FormData();
  const file = this.querySelector("[name=attachment]");
  // client side check to avoid losing time in case file is bigger than 2MB
  if (file.files && file.files[0] && file.files[0].size > 2 * 1024 * 1024) { // 2MB
    alert("File size above limit (2MB)");
    return;
  }
  // client check that is not empty
  if (msg === "" && file.files.length === 0) {
    alert("Message cannot be empty");
    return;
  }

  // add the info to the request, including the possible undefined file
  formData.append('conversation', conver);
  formData.append('message', msg.value);
  formData.append('attachment', file.files[0]);

  // send to the server using the modern AJAX fetch()
  fetch(phpDirectory + "send-message.php", { method: "POST", body: formData })
    .then((response) => response.json())
    .then((response) => {
      if (response.error) {
        // show the error in the console, if there's an error
        console.log(response.message);
      } else {
        // otherwise trigger a fetchAll to update all the data
        // and tell the app to scroll to the bottom of messages to see the last 
        // message just after updating everything
        fetchAll(() => {
          const messages = document.body.querySelector("section.messages");
          messages.scrollTop = messages.scrollHeight;
        });
        // clear all the input fields
        msg.value = "";
        file.value = null;
        file.parentNode.querySelector("label").classList.remove("file-loaded");
      }
    });
}

/*
 * Opens a users profile.
 * The user is identified via a parameter.
 *
 * Updates the right side of the screen with all the information visible
 * from that user.
 * If the profile belongs to the user logged in, the user can change his/her
 * information and save his/her profile.
 * 
 * If the profile belongs to a friend, the user has the option of
 * removing them from their friends list.
 */
function openProfile(user) {
  const right = document.getElementById("right");
  right.num = null;
  right.innerHTML = `<header><h2>${user.user}<h2></header>`;
  const section = document.createElement('section');
  //The users avatar is displayed if they have one.
  if (user.avatar) {
    section.innerHTML += `<img height="128px" width="128px" src="${user.avatar}">`;
  }
  //The user can edit their own information.
  if (user.id == data.user.id) {
    const attributes = [
      ["email", "Email"],
      ["text", "Name"],
      ["text", "About"],
      ["file", "Avatar"],
      ["color", "Color"],
    ]
    let content = `<form onsubmit="saveProfileInfo(); return false;">`;
    for (const [type, attr] of attributes) {
      content += `<h3>${attr}</h3><input type="${type}" name="${attr.toLowerCase()}" value="${user[attr.toLowerCase()] || ""}">`
    }
    content += `<br><br><input type="submit" value="Save Changes"></form>`;
    section.innerHTML += content;
  } else {
    for (attribute of ["Email", "Name", "About"]) {
      const str = user[attribute.toLowerCase()];
      section.innerHTML += `<h3>${attribute}</h3><div>${user[attribute.toLowerCase()] || "<em>The user hasn't set this value</em>"}</div>`;
    }
    section.innerHTML += `<br>
    <input type="button" class="remove" value="Remove Friend" onclick="removeFriend();">`
  }
  right.appendChild(section);
}

/*
 * Removes the selected friend from friends list.
 *
 * Sends a request to the server to remove the entries
 * regarding friendship between these two users in the friends table.
 * 
 * Once the friend is removed, data is updated and the user is sent
 * to the main menu.
 */
function removeFriend() {
  const right = document.getElementById("right");
  const friend = right.querySelector("header h2")
  xhttp("POST", "remove-friend.php", {friend: friend.innerHTML }, (response) => {
    if (!response) {
      alert("There's a problem removing this friend.");
    } else {
      alert("Friend removed.");
      fetchAll();
      document.getElementById("right").innerHTML = "";
    }
  });
}

/*
 * Saves the current profile information.
 *
 * Sends a request to the server to update the users
 * information in the users table.
 *
 * Only allows avatar insertion if the file size is below 2MB.
 * Once the information is updated, data is refreshed.
 */
function saveProfileInfo() {
  const right = document.getElementById("right");
  const info = right.querySelectorAll("[type]");

  const formData = new FormData();
  for (const attribute of info) {
    if (attribute.type === "file") {
      //Checks avatar file size.
      if (attribute.files && attribute.files[0] && attribute.files[0].size > 2 * 1024 * 1024) { // 2MB
        alert("File size above limit (2MB)");
        return;
      }
      formData.append(attribute.name, attribute.files[0]);
    } else {
      formData.append(attribute.name, attribute.value);
    }
  }

  fetch(phpDirectory + "update-user-info.php", { method: "POST", body: formData })
    .then((response) => response.json())
    .then((response) => {
      if (response) {
        alert("Information updated!");
        fetchAll();
      } else {
        alert("Failed to update information.");
      }
    });
}

/*
 * Opens the users friends list and friend requests.
 *
 * Allows the user to request a new friend via a textbox.
 * Allows the user to accept, deny or block requests. 
 *
 * From here you can also access your friends profiles.
 */
function openFriendsList() {
  const right = document.getElementById("right");
  right.num = null;
  right.innerHTML = "<header><h2>Friends List</h2></header>";
  const section = document.createElement('section');
  section.innerHTML = `<h3>Add Friend:</h3>
    <form onsubmit="requestFriend(); return false;"><input type="text" name="friend">
    <input type="submit" value="Request"></form>
    <h3>Friends List:</h3><div id="friends-list"></div>
    <h3>Friend Requests:</h3><div id="friend-requests"></div>`;
  right.appendChild(section);
  //Appends the friends list
  appendFriendsList(document.getElementById("friends-list"), false);
  //Appends friend requests
  appendFriendRequests(document.getElementById("friend-requests"));
}

/*
 * Appends the friend request div.
 * The target div is selected via a parameter.
 *
 * Shows all active requests with the options 
 * for each of them. (Add, Deny or Block).
 *
 * If a request is inactive it means that user has been blocked
 * and their request wont be shown.
 */
function appendFriendRequests(div) {
  div.innerHTML = "";
  for (const request of Object.values(data.requests)) {
    if (request.active==1) {
      friendRequestDiv = document.createElement("div");
      friendRequestDiv.id = "request-"+request.user;
      friendRequestDiv.innerHTML = request.user;
      friendRequestDiv.request = request.user;
      accept = createButton("accept");
      accept.addEventListener('click', function() {
        addFriend(request.user);
      });
      deny = createButton("deny");
      deny.addEventListener('click', function() {
        denyFriend(request.user);
      });
      block = createButton("block");
      //A parameter is added to the denyFriend() function so the user will be blocked.
      block.addEventListener('click', function() {
        denyFriend(request.user, 1);
      });
      friendRequestDiv.appendChild(accept);
      friendRequestDiv.appendChild(deny);
      friendRequestDiv.appendChild(block);
      div.appendChild(friendRequestDiv);
    }
  }
}

/*
 * Returns an element with the type "button".
 * The value for the button is selected via a parameter.
 */
function createButton(name) {
  button = document.createElement("input");
  button.type = 'button';
  button.value = name;
  return button;
}

/*
 * Appends the friends list div.
 * The target div is selected via a parameter.
 *
 * If this list was appended onto the "Friends List" menu, 
 * it shows all friends as a clickable button with their name.
 *
 * If this list was appended onto the "Start Conversation" menu,
 * friends can be clicked to be added 
 * to the conversation that will be created.
 *
 * The boolean "conv" is used to select where this friends list
 * is being appended.
 */
function appendFriendsList(div, conv=false) {
  div.innerHTML = "";
  for (const friend of Object.values(data.users).filter(u => u.friend)) {
    friendsDiv = document.createElement("div");
    friendsDiv.classList.add("friend");
    friendsDiv.id = "friend-"+friend.user;
    friendsDiv.innerHTML = friend.user;
    friendsDiv.friend = friend.user;
    if (conv) {
      friendsDiv.addEventListener('click', function(){
        checkParticipant(friend.user);
      });
    } else {
      friendsDiv.addEventListener('click', function(){
        openProfile(friend);
      });
    }
    div.appendChild(friendsDiv);
  }
}

/*
 * Requests a friend.
 * The friend to be requested is selected via a textbox
 * in the "Friends List" menu.
 *
 * There are numerous checks to prevent the user from
 * requesting him/herself, a user that is already
 * in their friends list, a user that has already
 * sent them a request or a user that doesn't exist.
 *
 * If all checks are passed, a request is sent to the server
 * to add this request to the database.
 *
 * Once the request is sent, the Friends List is updated.
 */
function requestFriend() {
  let friend = document.getElementsByName("friend").item(0).value.trim();
  let allowed = true;
  if (friend == data.user.user) {
    alert("Can't add yourself to your friends list.");
    allowed = false;
  }
  const right = document.getElementById("right");
  const section = right.querySelector('section');
  const elements = section.querySelectorAll('div');
  elements.forEach(function (elem) {
    if (elem.friend == friend) {
      alert("User already in your Friends List.");
      allowed = false;
    } else if (elem.request == friend) {
      alert("User has already sent you a friend request.");
      allowed = false;
    }
  });
  xhttp("POST", "check-user.php", { user: friend }, (response) => {
    if (response !== false && allowed) {
      friendID = response;
      xhttp("POST", "request-friend.php", { receiver: friendID }, (response) => {
        if (response==false) {
          //The server prevents the user from sending multiple requests
          //to the same user.
          alert("Request already sent.");
        } else if (response==true){
          alert(`Friend request sent to ${friend}!`);
          document.getElementsByName("friend").item(0).value = "";
          fetchAll();
        } else {
         /* If the request was sent and the database detected
          * a request from that user in the opposite direction,
          * these two users are added as friends.
          */
          addFriend(friend);
        }
      });
    } else if (allowed) {
      alert("Username does not exist.");
    }
  });
}

/*
 * Adds a friend to the users friends list.
 * The friend to be added is selected via a parameter.
 *
 * The function makes sure the friend is present in the database.
 * If the friend is added, data is updated.
 */
function addFriend(friend) {
  xhttp("POST", "check-user.php", { user: friend }, (response) => {
    if (response !== false) {
      friendID = response;
      xhttp("POST", "add-friend.php", {friend: friendID }, (response) => {
        if (!response) {
          alert("There's a problem adding this friend.");
        } else {
          createPrivateConversation(friend);
          alert("Friend added!");
          fetchAll();
        }
      });
    } else if (allowed) {
      alert("Username does not exist.");
    }
  });
}

/*
 * Denies a friend request.
 * The request to be denied is selected via a parameter.
 *
 * The function makes sure the user requesting is present in the database.
 * Depending on the boolean "blocked", the server
 * does two different things.
 * If the request is denied, the request is deleted.
 * If the request is blocked, the request is marked inactive.
 * 
 * When a request is marked inactive, the user will no longer
 * see this request and they won't receive more requests
 * from the same user.
 */
function denyFriend(friend, blocked=0) {
  xhttp("POST", "check-user.php", { user: friend }, (response) => {
    if (response !== false) {
      friend = response;
      xhttp("POST", "deny-friend.php", { block: blocked, sender: friend }, (response) => {
        if (!response) {
          alert("There's a problem denying this friend.");
        } else if (blocked==0){
          alert("Friend denied!");
          fetchAll();
        } else {
          alert("Request blocked!");
          fetchAll();
        }
      });
    } else if (allowed) {
      alert("Username does not exist.");
    }
  });
}

function createPrivateConversation(friend) {
  const creator = data.user.id;
  xhttp("POST", "create-conversation.php", { name: "", private: 1 }, (response) => {
    if (response === false) {
      alert("There's a problem creating this conversation.");
    } else {
      conversation = response;
      xhttp("POST", "add-participants.php", { participant: friend, conversation: conversation }, (response) => {
        if (!response) {
          alert("There's a problem adding atleast one of these participants.");
        }
      });
    }
  });
}

/*
 * Opens the "Start Conversation" menu.
 *
 * The user can select the name of the conversation and 
 * add participants via textboxes.
 * The users friends list is presented in this menu too.
 * The user can click on their friends to add them
 * to the conversation that will be created.
 * 
 * When a participant is added, the user receives a confirmation
 * on screen.
 *
 * Once all participants are selected the user can click "Create Conversation"
 * to make it.
 */
function startConversation() {
  const right = document.getElementById("right");
  right.num = null;
  right.innerHTML = "<header><h2>Start a new Conversation<h2></header>";
  const section = document.createElement('section');
  section.innerHTML = `<h3>Add Participants:</h3>
   <form onsubmit="checkParticipant(); return false;">
   <input type="text" name="participant">
   <input type="submit" value="Add"></form>
   <h3>Addable Friends:</h3><div id="addable-friends"></div>
   <h3>Conversation Name:</h3>
   <form onsubmit="createConversation(); return false;">
   <input type="text" name="conv">
   <input type="submit" name="submit" value="Create"></form>
   <br /><div id="added-friends"></div>`;
  right.appendChild(section);
  appendFriendsList(document.getElementById("addable-friends"), true);
}

/*
 * Checks that a participant can be added to a conversation.
 * The participant to be checked can be selected via a parameter.
 *
 * Confirms the user exits, isn't the logged-in user and isn't already
 * being added to the conversation.
 *
 * If all checks are passed, a div is appended confirming the selection.
 */
function checkParticipant(participant="") {
  if (participant=="") {
    //If the "participant" parameter is empty, the participant is
    //Selected via the textbox present in "Start Conversation".
    participant = document.getElementsByName("participant").item(0).value.trim();
  }
  const right = document.getElementById("right");
  let section = right.querySelector('section');
  const elements = section.querySelectorAll('div');
  let allowed = true;
  if (participant == data.user.user) {
    alert("Can't add yourself to the conversation.");
    allowed = false;
  }
  elements.forEach(function (elem) {
    if (elem.participant == participant) {
      alert("Can't add same user twice.");
      allowed = false;
    }
  });
  xhttp("POST", "check-user.php", { user: participant }, (response) => {
    if (response !== false && allowed) {
      section = section.querySelector('#added-friends');
      const partDiv = document.createElement('div');
      partDiv.innerHTML += participant + " will be added!";
      partDiv.participant = participant;
      partDiv.classList.add("correct");
      document.getElementsByName("participant").item(0).value = "";
      section.appendChild(partDiv);
    } else if (allowed) {
      alert("Username does not exist (or is not active yet).");
    }
  });
}

/*
 * Adds the selected participants to a conversation.
 * The participants are selecetd via the confirmation boxes
 * present in "Start Conversation".
 *
 * Once the participants are added there is an alert
 * confirming the creation of the conversation.
 */
function addParticipants(conversation) {
  const right = document.getElementById("right");
  const section = right.querySelector('section');
  //Selects all participants that are confirmed.
  const elements = section.querySelectorAll('.correct');
  let post = {};
  //Introduces them into the post.
  elements.forEach(function (elem, i) {
    let participant = `participant-${i}`;
    post[participant] = elem.participant;
  });
  //If no participants have been confirmed, the function simply
  //shows an alert telling the user they are only one
  //in the conversation.
  if (Object.keys(post).length !== 0) {
    post.conversation = conversation;
    xhttp("POST", "add-participants.php", post, (response) => {
      if (!response) {
        alert("There's a problem adding atleast one of these participants.");
      } else {
        document.getElementById("added-friends").innerHTML = "";
        alert("Conversation created!");
      }
    });
  } else {
    alert("You are the only user in this conversation.");
  }
}

/*
 * Creates a conversation.
 * The conversation name is selected via a textbox in "Start Conversation".
 *
 * Once the conversation is created the function calls addParticipants(),
 * data is updated and the right side of the screen is refreshed.
 */
function createConversation() {
  const conv = document.getElementsByName("conv").item(0).value.trim();
  xhttp("POST", "create-conversation.php", { name: conv, private: 0}, (response) => {
    if (isNaN(response)) {
      alert("There's a problem creating this conversation.");
    } else {
      conversationID = response;
      addParticipants(conversationID);
      document.getElementsByName("conv").item(0).value = "";
      fetchAll();
    }
  });
}
