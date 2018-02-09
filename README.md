# Refrain 🎶🙉

*Collaborative playlists in Slack*

Refrain is an open source, host-it-yourself clone of
[Jukebot](https://getjukebot.com). It allows you to share your Spotify account
with your office and your taste in music with one another, for better or for
worse.


## Slash commands

| Command                               | Must be "on"   | Description                                 |
| ------------------------------------- | -------------- | ------------------------------------------- |
| `/addplaylist [Spotify URI]`          | No             | Add given playlist                          |
| `/commandeer`                         | No             | Become active user                          |
| `/eradicate`                          | Yes            | Remove playing track from active playlist   |
| `/findme [track, artist, album]`      | Yes            | Search for music                            |
| `/listplaylists`                      | No             | Show your playlists                         |
| `/listusers`                          | No             | Show authenticated users                    |
| `/next`                               | Yes            | Skip track                                  |
| `/pauseme`                            | Yes            | Pause music                                 |
| `/playme`                             | Yes            | Resume music                                |
| <code>/refrain [on&#124;off]</code>   | No             | Toggle Refrain                              |
| <code>/shuffle [on&#124;off]</code>   | Yes            | Set shuffle state                           |
| `/spotifyauth`                        | No             | Get Spotify auth link                       |
| `/whichplaylist`                      | No             | Show active playlist                        |
| `/whichuser`                          | No             | Show active user                            |
| `/whomst`                             | Yes            | Show current track info                     |

The command names have been chosen to avoid conflicts with the Jukebot slash
commands so that you can trial them side-by-side.


## Prerequisites

You will need:
- a server to host Refrain on
- a MongoDB cluster
- a [Spotify developer account](https://beta.developer.spotify.com/dashboard/login)


## Setup

1. Clone this repository on your server and create a `.env` file in its
   directory. Add your server's address and your database address like so:
   ```bash
   HOST=http://your.server.domain
   MONGODB_URI=mongodb://your.db.domain
   ```
2. Head over to [your Slack apps](https://api.slack.com/apps) and click *Create
   New App*. Give it a name and attach it to your workspace.
3. In *OAuth & Permissions*, select the scopes *Add commands to my workspace*
   and *Send messages as Refrain*. Hit the big green install button at the top
   of the page, then copy your OAuth access token and add it to your `.env`
   like so: `SLACK_API_TOKEN=xoxp-...`.
4. In *Slash Commands*, add each of the commands in the table above. The
   request URL is `http://your.server.domain/command` for all of them.
5. In *Interactive Components*, click *Enable Interactive Components* and put
   `http://your.server.domain/interactive` in the *Request URL* field, then
   click the big green button.
6. On the Spotify developer site, click *Create an app* and go through the
   setup. Copy your client ID and client secret into your `.env` with the
   `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` keys, respectively.
7. On the Spotify developer site, click *Edit settings* and add
   `http://your.server.domain/callback`. Hit *Save* at the bottom.
8. Fire up Refrain on your server. You can use [pm2](http://pm2.keymetrics.io)
   (recommended) or just `node src/app.js`.


## Coming features

- Improved playlist handling: let users know when Spotify has veered off
  into another playlist, as this causes the most API errors
- Alias all slash commands to /refrain to reduce the tedium of setup
- Volume control
- Handle Spotify API timeouts


## Acknowledgements

- Thanks to the Jukebot team for inspiring this project
- Thanks to Ben Tyrer for the name suggestion
