DROP DATABASE quepasapp;

CREATE DATABASE quepasapp;

USE quepasapp;

CREATE TABLE users (
  id INT AUTO_INCREMENT,
  user VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(100) UNIQUE,
  creation_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  password CHAR(60) NOT NULL,
  name VARCHAR(100),
  about VARCHAR(100),
  color CHAR(7) NOT NULL,
  avatar VARCHAR(100) DEFAULT NULL,
  role ENUM('normal', 'admin') DEFAULT 'normal', -- or boolean?
  active BOOLEAN DEFAULT FALSE,
  last_update DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY users_pk (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE users_activation (
  id INT AUTO_INCREMENT, -- will be the same as user.id because of the trigger
  token CHAR(36) NOT NULL,
  user INT NOT NULL,
  used BOOLEAN DEFAULT FALSE, -- set TRUE with a trigger when updating users.active?
  PRIMARY KEY users_activation_pk (id),
  FOREIGN KEY users_activation_user_fk (user) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE password_recovery (
  id INT AUTO_INCREMENT,
  token CHAR(36) NOT NULL,
  expire DATETIME NOT NULL,
  user INT NOT NULL,
  used BOOLEAN DEFAULT FALSE, -- may be unnecessary, let the user change the password many times in 10min?
  PRIMARY KEY password_recovery_pk (id),
  FOREIGN KEY password_recovery_user_fk (user) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE conversations (
  id INT AUTO_INCREMENT,
  creator INT NOT NULL,
  creation_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  name VARCHAR(100) DEFAULT NULL,
  active BOOLEAN DEFAULT TRUE,
  private BOOLEAN DEFAULT FALSE,
  PRIMARY KEY conversations_pk (id),
  FOREIGN KEY conversations_creator_fk (creator) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE participants (
  conversation INT NOT NULL,
  user INT NOT NULL,
  -- since_date, -- important for filter to what can be read
  PRIMARY KEY participants_pk (conversation, user),
  FOREIGN KEY participants_conversation_fk (conversation) REFERENCES conversations(id),
  FOREIGN KEY participants_user_fk (user) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE friends (
  user INT NOT NULL,
  friend INT NOT NULL,
  PRIMARY KEY friends_pk (user, friend),
  FOREIGN KEY friends_user_fk (user) REFERENCES users(id),
  FOREIGN KEY friends_friend_fk (friend) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE friend_requests (
  sender INT NOT NULL,
  sender_name VARCHAR(100) NOT NULL,
  receiver INT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  PRIMARY KEY friend_requests__pk (sender, receiver),
  FOREIGN KEY friend_requests_sender_fk (sender) REFERENCES users(id),
  FOREIGN KEY friend_requests_sender_name_fk (sender_name) REFERENCES users(user),
  FOREIGN KEY friend_requests_receiver_fk (receiver) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE messages (
  id INT AUTO_INCREMENT,
  date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, -- TODO TIMESTAMP
  -- type ENUM ('text', 'image', 'attachment'),
  author INT NOT NULL,
  conversation INT NOT NULL,
  content VARCHAR(1000) NOT NULL,
  PRIMARY KEY messages_pk (id),
  FOREIGN KEY messages_author_fk (author) REFERENCES users(id),
  FOREIGN KEY messages_conversation_fk (conversation) REFERENCES conversations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE read_messages (
  message INT NOT NULL,
  user INT NOT NULL,
  read_date DATETIME DEFAULT NULL, -- unnecessary DEFAULT NULL? Use TIMESTAMP?
  PRIMARY KEY read_messages_pk (message, user),
  FOREIGN KEY read_messages_message_fk (message) REFERENCES messages(id),
  FOREIGN KEY read_messages_user_fk (user) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- not used for now
-- CREATE TABLE attachments (
--   id INT AUTO_INCREMENT,
--   path VARCHAR(100) NOT NULL,
--   date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   conversation INT NOT NULL,
--   PRIMARY KEY attachments_pk (id),
--   FOREIGN KEY attachments_conversation_fk (conversation) REFERENCES conversations(id)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DELIMITER |

-- Add any new message to the read_messages as unread for every
-- user in the conversation, except the creator (marked as read in this case)
CREATE TRIGGER unread_messages
  AFTER INSERT ON messages
  FOR EACH ROW
  BEGIN
    INSERT INTO read_messages (message, user, read_date) VALUES (new.id, new.author, CURRENT_TIMESTAMP);
    INSERT INTO read_messages (message, user)
      SELECT new.id as message, user
        FROM participants
        WHERE conversation = new.conversation AND user != new.author;
  END |

-- Ensure the creator is automatically a participant of the conversation
CREATE TRIGGER creator_participant
  AFTER INSERT ON conversations
  FOR EACH ROW
  BEGIN
    INSERT INTO participants (conversation, user) VALUES (new.id, new.creator);
  END |

-- Generate random (dark) color for each user when creating an user
CREATE TRIGGER user_random_color
  BEFORE INSERT ON users
  FOR EACH ROW
  BEGIN
    SET new.color = CONCAT('#', LPAD(HEX(FLOOR(RAND() * 200)), 2, '0'), LPAD(HEX(FLOOR(RAND() * 200)), 2, '0'), LPAD(HEX(FLOOR(RAND() * 200)), 2, '0')); 
  END |

-- Generate automatically the activatin token for a new account
CREATE TRIGGER user_activation_token
  AFTER INSERT ON users
  FOR EACH ROW
  BEGIN
    INSERT INTO users_activation (token, user) VALUES (UUID(), new.id);
  END |

-- Auto generate the token and the expire date before inserting an user on
-- password_recovery table
CREATE TRIGGER password_token_expire
  BEFORE INSERT ON password_recovery
  FOR EACH ROW
  BEGIN
    SET new.token = UUID();
    SET new.expire = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 10 MINUTE); -- may be 1 HOUR?
  END |

-- CREATE TRIGGER add_both_friends
--   AFTER INSERT ON friends
--   FOR EACH ROW
--   BEGIN
--     -- 
--   END |

DELIMITER ;

-- Example data inserted into the database

-- Five users, one of them administrator
INSERT INTO users (user, password, active, role) VALUES
  ('admin', '$2y$10$FSDqo4o2D7mGp4q8WS86Ou1E2qc4nsORtnfnIkrmc.Tlog90QOV5K', TRUE, 'admin');
INSERT INTO users (user, password, active) VALUES
  ('isolated-user', '$2y$10$FSDqo4o2D7mGp4q8WS86Ou1E2qc4nsORtnfnIkrmc.Tlog90QOV5K', TRUE);
INSERT INTO users (user, password, name, about, avatar, active) VALUES
  ('user-friend-1', '$2y$10$FSDqo4o2D7mGp4q8WS86Ou1E2qc4nsORtnfnIkrmc.Tlog90QOV5K', 'Butch Cassidy', 'Hi! Thanks for coming to my profile! I\'m using Quepasapp to talk to people.', './avatars/3/6027b6042ac9e70ac7675ab6ecd12d51a3c1c878.jpeg', TRUE);
INSERT INTO users (user, password, name, about, active) VALUES
  ('user-friend-2', '$2y$10$FSDqo4o2D7mGp4q8WS86Ou1E2qc4nsORtnfnIkrmc.Tlog90QOV5K', 'Richard Parker', 'I\'m a sailor', TRUE);
INSERT INTO users (user, password, active) VALUES
  ('user-group', '$2y$10$FSDqo4o2D7mGp4q8WS86Ou1E2qc4nsORtnfnIkrmc.Tlog90QOV5K', TRUE);

-- Group between users user-friend-1, user-friend-2, and user-group
INSERT INTO conversations (creator, name) VALUES
  (5, "Group Chat");
INSERT INTO participants (conversation, user) VALUES
  (1, 3);
INSERT INTO participants (conversation, user) VALUES
  (1, 4);
-- Messages of that group
INSERT INTO messages (author, conversation, content) VALUES
  (3, 1, 'Hello group'),
  (4, 1, 'Hello all'),
  (5, 1, 'Welcome to my group'),
  (3, 1, 'Thank you for inviting me');

-- Friends user-friends-(1|2) and their private conversation
INSERT INTO friends (user, friend) VALUES
  (3, 4);
INSERT INTO friends (user, friend) VALUES
  (4, 3);
INSERT INTO conversations (creator, private) VALUES
  (3, TRUE);
INSERT INTO participants (conversation, user) VALUES
  (2, 4);
-- Messages of that private conversation
INSERT INTO messages (author, conversation, content) VALUES
  (3, 2, 'Oh, this is a private conversation!'),
  (3, 2, '<div class=\"attachment\"><span><i>Image</i></span><a href=\"./attachments/8bf23fd465313216986d0d7c08faa89881e7f924/0f105-pdp7-oslo-2005.jpeg\" download><img width=\"480px\" height=\"360px\" src=\"./attachments/8bf23fd465313216986d0d7c08faa89881e7f924/0f105-pdp7-oslo-2005.jpeg\" alt=\"img-0f105-pdp7-oslo-2005.jpeg\"></a></div>This is a huge image of my desktop'),
  (4, 2, '<div class=\"attachment\"><span><i>Attachment</i></span><a href=\"./attachments/da39a3ee5e6b4b0d3255bfef95601890afd80709/plain.txt\" download><button type=\"button\">plain.txt</button></a></div>And here\'s an attachment'),
  (4, 2, 'Oh, I can see your avatar!'),
  (3, 2, 'You don\'t have one, so I only see your color');